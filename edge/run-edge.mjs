// Drives the deployed edge benchmark: every payload, several passes in
// shuffled order, at EmDash's production CPU limit (50 ms) and with a high
// limit, writing JSON lines to ../results/edge.jsonl.
// Usage: node run-edge.mjs https://emdash-plugin-size-bench.<account>.workers.dev
import { appendFileSync } from "node:fs";

const base = process.argv[2];
if (!base) throw new Error("usage: node run-edge.mjs <worker url>");
const PASSES = Number(process.env.PASSES ?? 3);
const index = await (await fetch(`${base}/index.json`)).json();
const shuffle = (xs) => xs.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
for (let pass = 1; pass <= PASSES; pass++) {
	for (const p of shuffle(index)) {
		for (const cpuMs of [50, 30000]) {
			const r = await fetch(`${base}/run?payload=${p.name}&cold=5&warm=5&cpuMs=${cpuMs}`);
			const body = r.ok ? await r.json() : { error: `${r.status} ${await r.text()}` };
			const row = { suite: "edge", pass, shape: p.shape, ...body, payload: p.name, bytes: p.bytes, cpuMs };
			appendFileSync(new URL("../results/edge.jsonl", import.meta.url), JSON.stringify(row) + "\n");
			const cold = (body.cold ?? []).map((c) => (c.error ? `ERR` : c.ms)).join(",");
			console.log(`pass ${pass} ${p.name.padEnd(28)} cpu ${String(cpuMs).padEnd(5)} cold ${cold}`);
		}
	}
}
