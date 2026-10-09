// Builds report/plugin-size-benchmark.html from results/summary.json.
import { readFileSync, writeFileSync } from "node:fs";

const s = JSON.parse(readFileSync(new URL(`../${process.env.RESULTS_DIR ?? "results"}/summary.json`, import.meta.url), "utf8"));
const tpl = readFileSync(new URL("./template.html", import.meta.url), "utf8");

// o/o90/omin: outside high-resolution clock; x/xr: extra over the paired tiny
// plugin with its 95% range. Older runs have only the inside clock (p50/p90).
const pick = (t) => ({ n: t.payload, s: t.shape, b: t.bytes, p50: t.coldP50, p90: t.coldP90, min: t.coldMin, o: t.outerP50 ?? null, o90: t.outerP90 ?? null, omin: t.outerMin ?? null, x: t.extraP50 ?? null, xr: t.extraRange ?? null, w: t.warmP50, same: t.sameSourceP50, k: t.samples });
const data = {
	matrix: s.table.map(pick),
	fits: s.fits,
	memory: s.memory,
	multi: s.multi,
	limits: s.limits,
	node: s.nodeHost.map((r) => ({ n: r.payload, s: r.shape, b: r.bytes, c: r.plugins, ms: r.readyMedianMs, mb: Math.round(Math.max(...r.rssKb) / 1024) })),
	generatedAt: s.generatedAt,
	machine: s.machine ? { label: s.machine.hostLabel, cpu: s.machine.cpuModel, cpus: s.machine.cpus, memGb: s.machine.memGb, platform: s.machine.platform, passes: s.machine.passes, cold: s.machine.coldPerPass } : null,
	bisect: (s.edgeBisect ?? []).map((r) => ({ n: r.payload, s: r.shape, b: r.bytes, cpu: r.minCpuMs, note: r.note })),
	edge: (s.edge ?? []).map((r) => ({ n: r.payload, s: r.shape, b: r.bytes, cpu: r.cpuMs, p50: r.coldP50, p90: r.coldP90, w: r.warmP50, failed: r.failed, total: r.total, err: r.firstError })),
};
writeFileSync(new URL("./plugin-size-benchmark.html", import.meta.url), tpl.replace("/*__DATA__*/null", JSON.stringify(data)));
console.log("ok", JSON.stringify(data).length);
