// Builds report/plugin-size-benchmark.html from results/summary.json.
import { readFileSync, writeFileSync } from "node:fs";

const s = JSON.parse(readFileSync(new URL("../results/summary.json", import.meta.url), "utf8"));
const tpl = readFileSync(new URL("./template.html", import.meta.url), "utf8");

const pick = (t) => ({ n: t.payload, s: t.shape, b: t.bytes, p50: t.coldP50, p90: t.coldP90, min: t.coldMin, w: t.warmP50, same: t.sameSourceP50, k: t.samples });
const data = {
	matrix: s.table.map(pick),
	fits: s.fits,
	memory: s.memory,
	multi: s.multi,
	limits: s.limits,
	node: s.nodeHost.map((r) => ({ n: r.payload, s: r.shape, b: r.bytes, c: r.plugins, ms: r.readyMedianMs, mb: Math.round(Math.max(...r.rssKb) / 1024) })),
	generatedAt: s.generatedAt,
};
writeFileSync(new URL("./plugin-size-benchmark.html", import.meta.url), tpl.replace("/*__DATA__*/null", JSON.stringify(data)));
console.log("ok", JSON.stringify(data).length);
