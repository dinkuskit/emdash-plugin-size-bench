// Builds report/plugin-size-benchmark.html from $RESULTS_DIR/summary.json
// (default results/). COMPARE_DIR names a second results folder whose first-call
// times are shown next to these, labelled COMPARE_LABEL / COMPARE_SHORT.
// EDGE_DIR takes the Cloudflare tables from another folder's summary.json, for
// edge runs analysed in a folder of their own.
import { readFileSync, writeFileSync } from "node:fs";

const load = (dir) => JSON.parse(readFileSync(new URL(`../${dir}/summary.json`, import.meta.url), "utf8"));
const s = load(process.env.RESULTS_DIR ?? "results");
const e = process.env.EDGE_DIR ? load(process.env.EDGE_DIR) : s;
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
	bisect: (e.edgeBisect ?? []).map((r) => ({ n: r.payload, s: r.shape, b: r.bytes, cpu: r.minCpuMs, note: r.note })),
	edge: (e.edge ?? []).map((r) => ({ n: r.payload, s: r.shape, b: r.bytes, cpu: r.cpuMs, p50: r.coldP50, p90: r.coldP90, w: r.warmP50, failed: r.failed, total: r.total, err: r.firstError })),
	compare: process.env.COMPARE_DIR
		? (() => {
				const c = load(process.env.COMPARE_DIR);
				return {
					label: process.env.COMPARE_LABEL ?? c.machine?.hostLabel ?? process.env.COMPARE_DIR,
					short: process.env.COMPARE_SHORT ?? "Other machine",
					rows: c.table.map((t) => ({ n: t.payload, p50: t.coldP50, o: t.outerP50 ?? null })),
				};
			})()
		: null,
};
writeFileSync(new URL("./plugin-size-benchmark.html", import.meta.url), tpl.replace("/*__DATA__*/null", JSON.stringify(data)));
console.log("ok", JSON.stringify(data).length);
