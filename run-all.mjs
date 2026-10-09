// Runs the full benchmark: several passes of the size matrix, each in a fresh
// workerd process with the payload order shuffled, then the memory and
// many-plugins suites, then the Node-hosting suite. Raw rows go to
// results/raw.jsonl; run `node analyze.mjs` afterwards.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PASSES = Number(process.env.PASSES ?? 3);
const COLD = Number(process.env.COLD ?? 7);
const index = JSON.parse(readFileSync("payloads/index.json", "utf8"));
let seed = Number(process.env.SEED ?? 42);
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const shuffle = (xs) => xs.map((x) => [rand(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

function vitest(config, label) {
	console.log(`\n=== ${label} ===`);
	const r = spawnSync("npx", ["vitest", "run", "--silent=false"], {
		stdio: ["ignore", "pipe", "pipe"],
		encoding: "utf8",
		env: { ...process.env, BENCH_CONFIG: JSON.stringify(config) },
		maxBuffer: 1 << 28,
	});
	const lines = (r.stdout + r.stderr).split("\n").filter((l) => /cold median|^memory |^multi |^limits /.test(l));
	console.log(lines.join("\n"));
	if (r.status !== 0) console.log(`(exit ${r.status})`);
}

vitest({ suites: ["limits"], runId: "limits" }, "limits");
for (let pass = 1; pass <= PASSES; pass++) {
	vitest({ suites: ["matrix"], only: shuffle(index.map((p) => p.name)), cold: COLD, warm: 5, runId: `matrix-pass-${pass}` }, `matrix pass ${pass}`);
}
vitest({ suites: ["memory"], memK: 8, runId: "memory" }, "memory");
vitest({ suites: ["multi"], multiN: 10, runId: "multi" }, "multi");
