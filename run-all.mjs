// Runs the full benchmark: several passes of the size matrix, each in a fresh
// workerd process with the payload order shuffled, then the memory and
// many-plugins suites. Raw rows go to $RESULTS_DIR/raw.jsonl (default
// results/); run `node analyze.mjs` afterwards.
//
// Env: PASSES (default 5) x COLD (default 20) cold loads per payload,
// SEED for the shuffle, SUITES to pick suites (default all),
// RESULTS_DIR for the output folder, CHUNK payloads per workerd process.
//
// One workerd process that loads a whole pass (about 2,300 isolates at 20
// samples) runs out of memory and crashes: segfaults and aborts after 1,100 to
// 1,600 isolates on a Hetzner CCX33, a V8 heap out-of-memory on a smaller VM.
// Each pass is therefore split into chunks of CHUNK payloads (default 4), each
// in a fresh workerd, and payloads a crashed chunk did not finish are retried
// once in another fresh process.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";

const PASSES = Number(process.env.PASSES ?? 5);
const COLD = Number(process.env.COLD ?? 20);
const SUITES = (process.env.SUITES ?? "limits,matrix,memory,multi").split(",");
const CHUNK = Number(process.env.CHUNK ?? 4);
const resultsDir = resolve(process.env.RESULTS_DIR ?? "results");
mkdirSync(resultsDir, { recursive: true });
const index = JSON.parse(readFileSync("payloads/index.json", "utf8"));
let seed = Number(process.env.SEED ?? 42);
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const shuffle = (xs) => xs.map((x) => [rand(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

const sh = (cmd, args) => {
	try {
		return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
	} catch {
		return null;
	}
};
const readOr = (path) => {
	try {
		return readFileSync(path, "utf8").trim();
	} catch {
		return null;
	}
};
writeFileSync(
	join(resultsDir, "machine.json"),
	JSON.stringify(
		{
			startedAt: new Date().toISOString(),
			hostLabel: process.env.HOST_LABEL ?? null,
			platform: `${os.platform()} ${os.release()} ${os.arch()}`,
			cpuModel: os.cpus()[0]?.model ?? null,
			cpus: os.cpus().length,
			memGb: Math.round(os.totalmem() / 2 ** 30),
			node: process.version,
			governor: readOr("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"),
			pinnedCpus: process.env.PIN_CPUS ?? null,
			lscpu: sh("lscpu", []),
			passes: PASSES,
			coldPerPass: COLD,
			chunk: CHUNK,
			seed,
		},
		null,
		2,
	),
);

const rawFile = join(resultsDir, "raw.jsonl");
function finished(runId) {
	if (!existsSync(rawFile)) return new Set();
	const done = new Set();
	for (const line of readFileSync(rawFile, "utf8").split("\n")) {
		if (!line) continue;
		const r = JSON.parse(line);
		if (r.runId === runId && r.suite === "matrix") done.add(r.payload);
	}
	return done;
}

function vitest(config, label) {
	console.log(`\n=== ${label} ===`);
	const r = spawnSync("npx", ["vitest", "run", "--silent=false"], {
		stdio: ["ignore", "pipe", "pipe"],
		encoding: "utf8",
		env: { ...process.env, BENCH_RESULTS: join(resultsDir, "raw.jsonl"), BENCH_CONFIG: JSON.stringify(config) },
		maxBuffer: 1 << 28,
	});
	const lines = (r.stdout + r.stderr).split("\n").filter((l) => /cold median|^memory |^multi |^limits /.test(l.trim()));
	console.log(lines.join("\n"));
	if (r.status !== 0) console.log(`(exit ${r.status})\n${(r.stdout + r.stderr).split("\n").filter((l) => /signal|Fatal|fatal|memory|Error:/.test(l)).slice(-15).join("\n")}`);
	return r.status;
}

if (SUITES.includes("limits")) vitest({ suites: ["limits"], runId: "limits" }, "limits");
if (SUITES.includes("matrix")) {
	for (let pass = 1; pass <= PASSES; pass++) {
		const runId = `matrix-pass-${pass}`;
		const order = shuffle(index.map((p) => p.name));
		for (let c = 0; c < order.length; c += CHUNK) {
			const chunk = order.slice(c, c + CHUNK);
			const label = `matrix pass ${pass}, payloads ${c + 1}-${c + chunk.length} of ${order.length}`;
			if (vitest({ suites: ["matrix"], only: chunk, cold: COLD, warm: 5, runId }, label) === 0) continue;
			const done = finished(runId);
			const left = chunk.filter((n) => !done.has(n));
			if (left.length) {
				console.log(`retrying ${left.join(", ")} in a fresh process`);
				vitest({ suites: ["matrix"], only: left, cold: COLD, warm: 5, runId }, `${label} (retry)`);
			}
		}
	}
}
if (SUITES.includes("memory")) vitest({ suites: ["memory"], memK: 8, runId: "memory" }, "memory");
if (SUITES.includes("multi")) vitest({ suites: ["multi"], multiN: 10, runId: "multi" }, "multi");
