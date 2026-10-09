// Summarises results/raw.jsonl (+ node-host.jsonl, edge.jsonl when present)
// into results/summary.json and results/summary.md.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const rows = (f) =>
	existsSync(f)
		? readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
		: [];
const raw = rows("results/raw.jsonl");
const nodeHost = rows("results/node-host.jsonl");
const edge = rows("results/edge.jsonl");

const q = (xs, p) => {
	const s = [...xs].sort((a, b) => a - b);
	if (!s.length) return null;
	return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
};
const kb = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(b % (1024 * 1024) ? 1 : 0)} MB` : `${Math.round(b / 1024)} KB`);

// ---- matrix: pool samples across passes
const matrix = raw.filter((r) => r.suite === "matrix" && String(r.runId).startsWith("matrix-pass-"));
const byPayload = new Map();
for (const r of matrix) {
	const e = byPayload.get(r.payload) ?? { payload: r.payload, shape: r.shape, bytes: r.bytes, cold: [], warm: [], same: [], errors: [], passes: 0, outer: [] };
	e.cold.push(...r.coldMs);
	e.warm.push(...r.warmMs);
	e.same.push(...r.sameSourceColdMs);
	e.errors.push(...r.coldErrors, ...r.sameSourceErrors);
	if (r.outerFirstColdMs != null) e.outer.push(r.outerFirstColdMs);
	e.passes++;
	byPayload.set(r.payload, e);
}
const table = [...byPayload.values()]
	.map((e) => ({
		payload: e.payload,
		shape: e.shape,
		bytes: e.bytes,
		samples: e.cold.length,
		coldP50: q(e.cold, 0.5),
		coldP90: q(e.cold, 0.9),
		coldMin: q(e.cold, 0),
		warmP50: q(e.warm, 0.5),
		sameSourceP50: q(e.same, 0.5),
		errors: e.errors.length,
		passes: e.passes,
	}))
	.sort((a, b) => a.shape.localeCompare(b.shape) || a.bytes - b.bytes);

// Baseline: the smallest real plugin's cold time is the fixed cost of an isolate.
const baseline = table.find((t) => t.payload === "real-audit-log")?.coldP50 ?? 0;

// Least-squares slope (ms per MB) per shape.
function fit(shape) {
	const pts = table.filter((t) => t.shape === shape).map((t) => [t.bytes / 1048576, t.coldP50]);
	const n = pts.length;
	if (n < 2) return null;
	const mx = pts.reduce((s, p) => s + p[0], 0) / n;
	const my = pts.reduce((s, p) => s + p[1], 0) / n;
	const sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
	const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
	const slope = sxy / sxx;
	return { shape, msPerMB: Math.round(slope * 10) / 10, interceptMs: Math.round((my - slope * mx) * 10) / 10 };
}
const fits = ["eager", "lazy", "data"].map(fit).filter(Boolean);

// ---- other suites (latest run of each)
const latest = (suite) => {
	const rs = raw.filter((r) => r.suite === suite && r.runId === suite);
	return rs;
};
const memory = latest("memory").map((r) => ({ payload: r.payload, bytes: r.bytes, perIsolateKb: r.perIsolateKb, isolates: r.isolates, errors: r.errors }));
const multi = latest("multi").map((r) => ({ payload: r.payload, bytes: r.bytes, n: r.n, sequentialMs: r.sequentialMs, parallelMs: r.parallelMs, errors: r.seqErrors + r.parErrors }));
const limits = latest("limits").map((r) => ({ payload: r.payload, limits: r.limits, coldMs: r.coldMs, coldError: r.coldError, warmMs: r.warmMs, warmError: r.warmError }));

// ---- edge (if run)
const edgeBy = new Map();
for (const r of edge) {
	if (!r.cold) continue;
	const k = `${r.payload}|${r.cpuMs}`;
	const e = edgeBy.get(k) ?? { payload: r.payload, shape: r.shape, bytes: r.bytes, cpuMs: r.cpuMs, cold: [], warm: [], errors: [], colos: new Set() };
	for (const c of r.cold) (c.error ? e.errors.push(c.error) : e.cold.push(c.ms));
	for (const w of r.warm ?? []) if (!w.error) e.warm.push(w.ms);
	if (r.colo) e.colos.add(r.colo);
	edgeBy.set(k, e);
}
const edgeTable = [...edgeBy.values()].map((e) => ({ payload: e.payload, shape: e.shape, bytes: e.bytes, cpuMs: e.cpuMs, coldP50: q(e.cold, 0.5), coldP90: q(e.cold, 0.9), warmP50: q(e.warm, 0.5), failed: e.errors.length, total: e.errors.length + e.cold.length, firstError: e.errors[0] ?? null, colos: [...e.colos] })).sort((a, b) => a.shape.localeCompare(b.shape) || a.bytes - b.bytes || a.cpuMs - b.cpuMs);

const summary = { generatedAt: new Date().toISOString(), baselineColdMs: baseline, fits, table, memory, multi, limits, nodeHost, edge: edgeTable };
writeFileSync("results/summary.json", JSON.stringify(summary, null, 2));

// ---- markdown
const md = [];
md.push(`# Results summary\n`);
md.push(`Cold = first call into a never-seen plugin in a new isolate (load + parse + run module top level + tiny route). Warm = later calls into the same isolate. Times in ms, medians over all passes.\n`);
md.push(`Fixed cost of an isolate (smallest real plugin, cold): ${baseline} ms.\n`);
md.push(`| Shape | Cost per extra MB (ms) | Intercept (ms) |\n|---|---:|---:|`);
for (const f of fits) md.push(`| ${f.shape} | ${f.msPerMB} | ${f.interceptMs} |`);
md.push(``);
for (const shape of ["real", "eager", "lazy", "data"]) {
	md.push(`\n## ${shape}\n`);
	md.push(`| Payload | Size | Cold p50 | Cold p90 | Cold min | Warm p50 | Same-source cold p50 | Samples | Errors |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|`);
	for (const t of table.filter((t) => t.shape === shape)) md.push(`| ${t.payload} | ${kb(t.bytes)} | ${t.coldP50} | ${t.coldP90} | ${t.coldMin} | ${t.warmP50} | ${t.sameSourceP50} | ${t.samples} | ${t.errors} |`);
}
if (memory.length) {
	md.push(`\n## Memory (workerd resident memory added per loaded isolate)\n\n| Payload | Size | Per isolate |\n|---|---:|---:|`);
	for (const m of memory) md.push(`| ${m.payload} | ${kb(m.bytes)} | ${(m.perIsolateKb / 1024).toFixed(1)} MB |`);
}
if (multi.length) {
	md.push(`\n## Ten plugins on a cold site\n\n| Payload | Size each | 10 in a row | 10 at once |\n|---|---:|---:|---:|`);
	for (const m of multi) md.push(`| ${m.payload} | ${kb(m.bytes)} | ${m.sequentialMs} ms | ${m.parallelMs} ms |`);
}
if (limits.length) {
	md.push(`\n## CPU limit check (local workerd)\n\n| Plugin | Limits | Cold | Error | Second call | Error |\n|---|---|---:|---|---:|---|`);
	for (const l of limits) md.push(`| ${l.payload} | ${l.limits} | ${l.coldMs} | ${l.coldError ?? ""} | ${l.warmMs} | ${l.warmError ?? ""} |`);
}
if (nodeHost.length) {
	md.push(`\n## Node hosting (standalone workerd, restart with all plugins)\n\n| Payload | Size each | Plugins | Ready p50 | Memory |\n|---|---:|---:|---:|---:|`);
	for (const n of nodeHost) md.push(`| ${n.payload} | ${kb(n.bytes)} | ${n.plugins} | ${n.readyMedianMs} ms | ${Math.round(Math.max(...n.rssKb) / 1024)} MB |`);
}
if (edgeTable.length) {
	md.push(`\n## Real Cloudflare\n\n| Payload | Size | CPU limit | Cold p50 | Cold p90 | Warm p50 | Failed |\n|---|---:|---:|---:|---:|---:|---:|`);
	for (const e of edgeTable) md.push(`| ${e.payload} | ${kb(e.bytes)} | ${e.cpuMs} | ${e.coldP50} | ${e.coldP90} | ${e.warmP50} | ${e.failed}/${e.total} |`);
}
writeFileSync("results/summary.md", md.join("\n") + "\n");
console.log(md.join("\n"));
