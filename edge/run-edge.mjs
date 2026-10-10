// Drives the deployed edge benchmark, writing JSON lines to
// $RESULTS_DIR/edge.jsonl (default ../results/).
//
//   node run-edge.mjs https://emdash-plugin-size-bench.<account>.workers.dev
//
// MODE=timing (default): every payload, several passes in shuffled order, at
//   EmDash's production CPU limit (50 ms) and with a high limit.
// MODE=bisect: for each payload, the smallest cpuMs limit under which a fresh
//   isolate still loads the plugin and answers. Each step runs three fresh
//   loads and counts as enough when two of three succeed. This is the
//   plugin's start-up CPU cost as Cloudflare itself counts it.
// MODE=control: busy-loop plugins that need a known amount of CPU in their
//   route or at import, at 50 ms and at 30 s, then the same search for some of
//   them. Shows whether Cloudflare enforces the limit at all, and on which part
//   of a call.
// MODE=all: timing, then bisect, then control.
// ONLY=name,name limits timing and bisect to those payloads.
import { appendFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2];
if (!base) throw new Error("usage: node run-edge.mjs <worker url>");
const MODE = process.env.MODE ?? "timing";
const PASSES = Number(process.env.PASSES ?? 3);
const here = fileURLToPath(new URL(".", import.meta.url));
const resultsDir = resolve(here, "..", process.env.RESULTS_DIR ?? "results");
mkdirSync(resultsDir, { recursive: true });
const out = join(resultsDir, "edge.jsonl");
const write = (row) => appendFileSync(out, JSON.stringify(row) + "\n");

// ONLY=name,name limits the run to those payloads.
const ONLY = process.env.ONLY?.split(",");
// "tiny" is the worker's built-in almost empty plugin, the baseline for the rest.
const TINY = { name: "tiny", shape: "tiny", bytes: 71 };
const index = [TINY, ...(await (await fetch(`${base}/index.json`)).json())].filter((p) => !ONLY || ONLY.includes(p.name));
const shuffle = (xs) => xs.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

async function run(name, cold, warm, cpuMs) {
	const r = await fetch(`${base}/run?payload=${name}&cold=${cold}&warm=${warm}&cpuMs=${cpuMs}`);
	return r.ok ? r.json() : { error: `${r.status} ${(await r.text()).slice(0, 200)}` };
}

if (MODE === "timing" || MODE === "all") {
	for (let pass = 1; pass <= PASSES; pass++) {
		for (const p of shuffle(index)) {
			for (const cpuMs of [50, 30000]) {
				const body = await run(p.name, 5, 5, cpuMs);
				write({ suite: "edge", pass, shape: p.shape, ...body, payload: p.name, bytes: p.bytes, cpuMs });
				const cold = (body.cold ?? []).map((c) => (c.error ? `ERR` : c.ms)).join(",");
				console.log(`pass ${pass} ${p.name.padEnd(30)} cpu ${String(cpuMs).padEnd(5)} cold ${cold}`);
			}
		}
	}
}

// The smallest cpuMs under which two of three fresh loads still succeed.
async function bisect(p, suite) {
	const trials = [];
	let colo = null;
	const enough = async (cpuMs) => {
		const body = await run(p.name, 3, 0, cpuMs);
		colo ??= body.colo ?? null;
		const results = (body.cold ?? []).map((c) => (c.error ? { ok: false, ms: c.ms, error: c.error.slice(0, 120) } : { ok: true, ms: c.ms }));
		const ok = results.filter((c) => c.ok).length >= 2;
		trials.push({ cpuMs, ok, results, error: body.error ?? null });
		return ok;
	};
	// Find an upper bound, starting at EmDash's default.
	let hi = 50;
	let note = null;
	while (!(await enough(hi))) {
		hi *= 2;
		if (hi > 30000) {
			hi = null;
			note = "fails even at 30 s: not a CPU-limit failure";
			break;
		}
	}
	// Binary search down to 1 ms.
	let lo = 0;
	if (hi != null) {
		while (hi - lo > 1) {
			const mid = Math.floor((lo + hi) / 2);
			if (await enough(mid)) hi = mid;
			else lo = mid;
		}
	}
	write({ suite, payload: p.name, shape: p.shape, bytes: p.bytes, minCpuMs: hi, note, colo, trials });
	console.log(`${suite} ${p.name.padEnd(30)} ${String(p.bytes).padStart(8)} B  smallest cpuMs ${hi ?? "n/a"} ${note ?? ""}`);
}

if (MODE === "bisect" || MODE === "all") {
	// The baseline, real plugins, and eager and lazy code up to 2 MB; data payloads barely use CPU.
	const BISECT_MAX = Number(process.env.BISECT_MAX_BYTES ?? 2 * 1024 * 1024 + 4096);
	const list = index.filter((p) => p.shape === "tiny" || p.shape === "real" || ((p.shape === "eager" || p.shape === "lazy") && p.bytes <= BISECT_MAX));
	for (const p of list) await bisect(p, "edge-bisect");
}

if (MODE === "control" || MODE === "all") {
	// n million steps of the local harness's busy loop, in the route or at import.
	// Under local workerd 100 million steps take about 0.6 s in a route and 0.8 s at import.
	const steps = { route: [2, 10, 30, 100, 300], import: [2, 10, 30, 100, 300, 1000] };
	const control = Object.entries(steps).flatMap(([where, ns]) => ns.map((n) => ({ name: `spin-${where}-${n}`, shape: `spin-${where}`, steps: n * 1e6 })));
	for (const p of control) {
		for (const cpuMs of [50, 30000]) {
			const body = await run(p.name, 3, 2, cpuMs);
			p.bytes ??= body.bytes ?? null;
			write({ suite: "edge-control", shape: p.shape, steps: p.steps, ...body, payload: p.name, cpuMs });
			const fmt = (xs) => (xs ?? []).map((c) => (c.error ? `ERR(${c.error.slice(0, 60)})` : c.ms)).join(",");
			console.log(`control ${p.name.padEnd(20)} cpu ${String(cpuMs).padEnd(5)} cold ${fmt(body.cold)} warm ${fmt(body.warm)}${body.error ? ` ${body.error}` : ""}`);
		}
	}
	for (const p of control.filter((c) => c.steps === 30e6 || c.steps === 300e6)) await bisect(p, "edge-control-bisect");
}
