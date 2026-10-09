// Runs the full benchmark: several passes of the size matrix, each in a fresh
// workerd process with the payload order shuffled, then the memory and
// many-plugins suites. Raw rows go to $RESULTS_DIR/raw.jsonl (default
// results/); run `node analyze.mjs` afterwards.
//
// Env: PASSES (default 5) x COLD (default 20) cold loads per payload,
// SEED for the shuffle, SUITES to pick suites (default all),
// RESULTS_DIR for the output folder.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";

const PASSES = Number(process.env.PASSES ?? 5);
const COLD = Number(process.env.COLD ?? 20);
const SUITES = (process.env.SUITES ?? "limits,matrix,memory,multi").split(",");
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
			seed,
		},
		null,
		2,
	),
);

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
	if (r.status !== 0) console.log(`(exit ${r.status})\n${(r.stdout + r.stderr).split("\n").slice(-40).join("\n")}`);
}

if (SUITES.includes("limits")) vitest({ suites: ["limits"], runId: "limits" }, "limits");
if (SUITES.includes("matrix")) {
	for (let pass = 1; pass <= PASSES; pass++) {
		vitest({ suites: ["matrix"], only: shuffle(index.map((p) => p.name)), cold: COLD, warm: 5, runId: `matrix-pass-${pass}` }, `matrix pass ${pass}`);
	}
}
if (SUITES.includes("memory")) vitest({ suites: ["memory"], memK: 8, runId: "memory" }, "memory");
if (SUITES.includes("multi")) vitest({ suites: ["multi"], multiN: 10, runId: "multi" }, "multi");
