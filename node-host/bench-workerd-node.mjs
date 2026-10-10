// Node-hosted EmDash sites run sandboxed plugins in a standalone workerd
// process (@emdash-cms/sandbox-workerd). Adding, removing or updating a plugin
// regenerates the capnp config and restarts workerd with ALL plugins.
//
// This mirrors packages/workerd/src/sandbox/capnp.ts: one worker per plugin,
// modules embedded from files, a socket per plugin. It measures the time from
// spawning workerd until every plugin answers its first request, for N plugins
// of a given payload, plus resident memory once all are loaded.
//
// Usage: node node-host/bench-workerd-node.mjs [results.jsonl]
import { spawn } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(root, process.env.RESULTS_DIR ?? "results", "node-host.jsonl"));
const workerdBin = process.env.WORKERD_BIN;
if (!workerdBin) throw new Error("Set WORKERD_BIN to the workerd binary");

const index = JSON.parse(readFileSync(join(root, "payloads/index.json"), "utf8"));
const PAYLOADS = (process.env.NODE_PAYLOADS ?? "real-audit-log,real-dinkus-commerce,real-combo-commerce-inventory,real-combo-x2,eager-128k,eager-256k,eager-512k,eager-1024k,eager-2048k,eager-4096k,lazy-1024k,data-1024k").split(",");
const COUNTS = (process.env.NODE_COUNTS ?? "1,5,10,20").split(",").map(Number);
const REPS = Number(process.env.NODE_REPS ?? 3);

// Stand-in for EmDash's wrapper: imports the plugin module (which runs its
// top level) and answers HTTP so we can see it is ready.
const WRAPPER = `import plugin from "sandbox-plugin.js";
export default { async fetch() { return new Response(String(Object.keys(plugin.routes ?? {}).length)); } };`;
// Stand-in for the "emdash" shim module the real config embeds.
const SHIM = `export const definePlugin = (x) => x; export default {};`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function rssKb(pid) {
	try {
		const status = readFileSync(`/proc/${pid}/status`, "utf8");
		return Number(/VmRSS:\s+(\d+)/.exec(status)?.[1] ?? 0);
	} catch {
		return 0;
	}
}

async function runOnce(payload, n, basePort) {
	const dir = mkdtempSync(join(tmpdir(), "emdash-node-bench-"));
	const code = readFileSync(join(root, "payloads", `${payload}.js`), "utf8");
	writeFileSync(join(dir, "shim.js"), SHIM);
	const services = [];
	const sockets = [];
	const workers = [];
	for (let i = 0; i < n; i++) {
		writeFileSync(join(dir, `p${i}-wrapper.js`), WRAPPER);
		// Unique comment so no two plugins share source text.
		writeFileSync(join(dir, `p${i}-plugin.js`), `/* ${i} ${Math.random()} */\n${code}`);
		services.push(`    (name = "plugin-p${i}", worker = .pluginP${i}),`);
		sockets.push(`    (name = "socket-p${i}", address = "127.0.0.1:${basePort + i}", service = "plugin-p${i}"),`);
		workers.push(`const pluginP${i} :Workerd.Worker = (
  modules = [
    (name = "worker.js", esModule = embed "p${i}-wrapper.js"),
    (name = "sandbox-plugin.js", esModule = embed "p${i}-plugin.js"),
    (name = "emdash", esModule = embed "shim.js"),
  ],
  compatibilityDate = "2025-01-01",
  compatibilityFlags = ["nodejs_compat"],
);
`);
	}
	const config = `using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
  services = [
${services.join("\n")}
  ],
  sockets = [
${sockets.join("\n")}
  ],
);
${workers.join("\n")}`;
	writeFileSync(join(dir, "config.capnp"), config);

	const t0 = performance.now();
	const child = spawn(workerdBin, ["serve", join(dir, "config.capnp"), "--experimental"], { stdio: ["ignore", "ignore", "pipe"] });
	let stderr = "";
	child.stderr.on("data", (d) => (stderr += d));
	const ready = new Array(n).fill(false);
	let firstAllMs = null;
	const deadline = t0 + 120_000;
	while (performance.now() < deadline) {
		await Promise.all(
			ready.map(async (ok, i) => {
				if (ok) return;
				try {
					const r = await fetch(`http://127.0.0.1:${basePort + i}/`);
					if (r.ok) ready[i] = true;
				} catch {}
			}),
		);
		if (ready.every(Boolean)) {
			firstAllMs = performance.now() - t0;
			break;
		}
		if (child.exitCode !== null) break;
		await sleep(5);
	}
	await sleep(200);
	const rss = rssKb(child.pid);
	const exited = child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise((r) => child.once("exit", r));
	child.kill("SIGKILL");
	await Promise.race([exited, sleep(5000)]);
	rmSync(dir, { recursive: true, force: true });
	return { readyMs: firstAllMs, rssKb: rss, error: firstAllMs === null ? stderr.slice(0, 300) : null };
}

// Ports come from 20000-32000, below the ephemeral ranges Linux (32768+) and
// macOS (49152+) hand to outgoing connections, and every block is checked
// free before workerd binds it, so a stray socket cannot make a run fail.
const PORT_MIN = 20000;
const PORT_MAX = 32000;
const isFree = (p) =>
	new Promise((ok) => {
		const srv = createServer();
		srv.once("error", () => ok(false));
		srv.listen(p, "127.0.0.1", () => srv.close(() => ok(true)));
	});
async function freeBlock(start, count) {
	let base = start;
	for (;;) {
		if (base + count > PORT_MAX) base = PORT_MIN;
		let clash = -1;
		for (let i = 0; i < count; i++) if (!(await isFree(base + i))) { clash = i; break; }
		if (clash < 0) return base;
		base += clash + 1;
	}
}
let port = PORT_MIN;
for (const payload of PAYLOADS) {
	const meta = index.find((p) => p.name === payload);
	if (!meta) continue;
	for (const n of COUNTS) {
		const runs = [];
		for (let r = 0; r < REPS; r++) {
			port = await freeBlock(port, n);
			runs.push(await runOnce(payload, n, port));
			port += n + 1;
		}
		const ms = runs.map((x) => x.readyMs).filter((x) => x !== null).sort((a, b) => a - b);
		const row = {
			suite: "node-host",
			payload,
			shape: meta.shape,
			bytes: meta.bytes,
			plugins: n,
			totalBytes: meta.bytes * n,
			readyMs: runs.map((x) => (x.readyMs === null ? null : Math.round(x.readyMs))),
			readyMedianMs: ms.length ? Math.round(ms[Math.floor((ms.length - 1) / 2)]) : null,
			rssKb: runs.map((x) => x.rssKb),
			errors: runs.map((x) => x.error).filter(Boolean),
		};
		appendFileSync(out, JSON.stringify(row) + "\n");
		console.log(`${payload.padEnd(24)} x${String(n).padStart(2)}  ready ${String(row.readyMedianMs).padStart(6)} ms  rss ${Math.round(row.rssKb[0] / 1024)} MB${row.errors.length ? "  ERR " + row.errors[0] : ""}`);
	}
}
