// A bounded local proof; no corpus generation, remote bindings or deployment.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { sampleCount } from "../real-operation/config.mjs";

const root = resolve(import.meta.dirname, "..");
const realCold = sampleCount(process.env.REAL_COLD, 3, "REAL_COLD");
const realWarm = sampleCount(process.env.REAL_WARM, 5, "REAL_WARM");
const results = resolve(root, process.env.BENCH_RESULTS ?? "results/real-operation-local/raw.jsonl");
mkdirSync(dirname(results), { recursive: true });
const child = spawnSync(process.execPath, [resolve(root, "node_modules/vitest/vitest.mjs"), "run", "test/real-operation.test.ts"], {
	cwd: root,
	stdio: "inherit",
	env: { ...process.env, BENCH_RESULTS: results, BENCH_CONFIG: JSON.stringify({ suites: ["real-operation"], realCold, realWarm }) },
});
if (child.error) throw child.error;
process.exitCode = child.status ?? 1;
