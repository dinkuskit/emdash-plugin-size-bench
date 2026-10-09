// EmDash sandboxed plugin load-time benchmark.
//
// Every measurement goes through EmDash's production CloudflareSandboxRunner
// (Worker Loader + generated wrapper + PluginBridge), the same path a Registry
// plugin takes on a Cloudflare-hosted site. Results are appended as JSON lines
// through the PROBE binding.
import { createDialect } from "@emdash-cms/cloudflare/db/d1";
import { CloudflareSandboxRunner, generatePluginWrapper } from "@emdash-cms/cloudflare/sandbox";
import { env } from "cloudflare:workers";
import { Kysely } from "kysely";
import { describe, it } from "vitest";

const E = env as unknown as {
	PAYLOADS: Fetcher;
	PROBE: Fetcher;
	BENCH_CONFIG: string;
};
const cfg = JSON.parse(E.BENCH_CONFIG || "{}") as {
	suites?: string[];
	only?: string[];
	cold?: number;
	warm?: number;
	memK?: number;
	memPayloads?: string[];
	multiN?: number;
	multiPayloads?: string[];
	runId?: string;
	modes?: string[];
};
const COLD = cfg.cold ?? 5;
const WARM = cfg.warm ?? 5;
const runId = cfg.runId ?? new Date().toISOString();
const wants = (s: string) => !cfg.suites || cfg.suites.includes(s);

const db = new Kysely<any>({ dialect: createDialect({ binding: "DB", session: "disabled" }) });
const REQ = { url: "https://bench.test/_emdash/api/plugins/x/ping", method: "POST", headers: {}, meta: {} } as any;
const PROD_LIMITS = undefined; // EmDash defaults: cpuMs 50, subrequests 10, wallTimeMs 30000
const NO_CPU_LIMIT = { cpuMs: 120_000, wallTimeMs: 120_000 };
// Local workerd does not enforce Worker Loader cpuMs (see the limits suite), so
// by default only the production limits are run; set modes to compare.
const MODES = (cfg.modes ?? ["prod"]).map((m) => (m === "prod" ? (["prod", PROD_LIMITS] as const) : (["no-cpu-limit", NO_CPU_LIMIT] as const)));

type IndexEntry = { name: string; shape: string; bytes: number; parts: string[]; route: string | null };

async function text(path: string) {
	const r = await E.PAYLOADS.fetch(`https://p/${path}`);
	if (!r.ok) throw new Error(`payload ${path}: ${r.status}`);
	return r.text();
}
async function record(row: Record<string, unknown>) {
	await E.PROBE.fetch("https://p/result", { method: "POST", body: JSON.stringify({ runId, ...row }) });
}
async function rss(): Promise<number> {
	return ((await (await E.PROBE.fetch("https://p/rss")).json()) as { rssKb: number }).rssKb;
}
async function nodeNow(): Promise<number> {
	return ((await (await E.PROBE.fetch("https://p/now")).json()) as { ms: number }).ms;
}

let keySeq = 0;
function newRunner(limits?: object) {
	return new CloudflareSandboxRunner({
		db,
		limits,
		siteInfo: { name: "Bench", url: "https://bench.test", locale: "en" },
		isolateKey: `bench-${runId}-${keySeq++}-${crypto.randomUUID()}`,
	} as any);
}

/** Invoke once and time it. Real plugins get a missing route: the module still loads and runs. */
async function invoke(inst: any, route: string) {
	const t0 = Date.now();
	let error: string | undefined;
	try {
		await inst.invokeRoute(route, {}, REQ);
	} catch (e) {
		error = String((e as Error)?.message ?? e).slice(0, 200);
	}
	return { ms: Date.now() - t0, error };
}
const isExpected = (route: string, error?: string) =>
	!error || (route === "__bench_missing" && /not found|NOT_FOUND|ROUTE/i.test(error));

function median(xs: number[]) {
	const s = [...xs].sort((a, b) => a - b);
	return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN;
}

async function loadPayload(name: string) {
	const [code, manifestJson] = await Promise.all([text(`${name}.js`), text(`${name}.json`)]);
	return { code, manifest: JSON.parse(manifestJson) };
}

describe("emdash plugin size benchmark", () => {
	it("wrapper: save EmDash's generated plugin wrapper for the edge benchmark", async () => {
		if (!wants("wrapper")) return;
		const w = generatePluginWrapper(
			{ id: "bench", version: "1.0.0", capabilities: [], allowedHosts: [], storage: {}, hooks: [], routes: ["ping", "info", "__bench_missing"], admin: { pages: [], widgets: [] } } as any,
			{ site: { name: "Bench", url: "https://bench.test", locale: "en" } },
		);
		await E.PROBE.fetch("https://p/wrapper", { method: "POST", body: w });
	});

	it("cpu limit check: does the 50 ms CPU limit apply to module start-up?", async () => {
		if (!wants("limits")) return;
		const spinImport = `let x=0;for(let i=0;i<${"4e8"};i++){x=(x+i)|0}\nexport default {hooks:{},routes:{ping:{handler:async()=>({x})}}};`;
		const spinRoute = `export default {hooks:{},routes:{ping:{handler:async()=>{let x=0;for(let i=0;i<4e8;i++){x=(x+i)|0}return {x}}}}};`;
		const quick = `export default {hooks:{},routes:{ping:{handler:async()=>({ok:true})}}};`;
		const man = (id: string) => ({ id, version: "1.0.0", capabilities: [], allowedHosts: [], storage: {}, hooks: [], routes: ["ping"], admin: { pages: [], widgets: [] } });
		for (const [label, code] of [["quick", quick], ["spin-at-import", spinImport], ["spin-in-route", spinRoute]] as const) {
			for (const [limitLabel, limits] of [["prod", PROD_LIMITS], ["no-cpu-limit", NO_CPU_LIMIT]] as const) {
				const inst = await newRunner(limits).load(man(`limits-${label}`) as any, code);
				const r = await invoke(inst, "ping");
				const warm = await invoke(inst, "ping");
				await record({ suite: "limits", payload: label, limits: limitLabel, coldMs: r.ms, coldError: r.error ?? null, warmMs: warm.ms, warmError: warm.error ?? null });
				console.log(`limits ${label} ${limitLabel}: cold ${r.ms} ms ${r.error ?? "ok"} | second ${warm.ms} ms ${warm.error ?? "ok"}`);
			}
		}
	});

	it("matrix: cold and warm invocation by size and shape", async () => {
		if (!wants("matrix")) return;
		const index = JSON.parse(await text("index.json")) as IndexEntry[];
		// Run in the order given (the driver shuffles it per pass to spread drift).
		const list = cfg.only ? cfg.only.map((n) => index.find((p) => p.name === n)!).filter(Boolean) : index;
		for (const p of list) {
			const { code, manifest } = await loadPayload(p.name);
			const route = p.route ?? "ping";
			for (const [limitLabel, limits] of MODES) {
				const cold: number[] = [];
				const coldErrors: string[] = [];
				const warm: number[] = [];
				let outerFirst: number | undefined;
				for (let i = 0; i < COLD; i++) {
					// A unique comment makes every cold load see never-before-seen source,
					// so no compile cache keyed on source text can help.
					const unique = `/* bench nonce ${crypto.randomUUID()} */\n${code}`;
					const inst = await newRunner(limits).load({ ...manifest, id: `${manifest.id}-${i}` }, unique);
					const n0 = i === 0 ? await nodeNow() : 0;
					const r = await invoke(inst, route);
					if (i === 0) outerFirst = (await nodeNow()) - n0;
					cold.push(r.ms);
					if (!isExpected(route, r.error)) coldErrors.push(r.error!);
					if (i === 0 && isExpected(route, r.error)) {
						for (let w = 0; w < WARM; w++) {
							const wr = await invoke(inst, route);
							warm.push(wr.ms);
						}
					}
				}
				// Same source twice in fresh isolates: shows whether repeat loads get cheaper.
				const sameA = await invoke(await newRunner(limits).load({ ...manifest, id: `${manifest.id}-same` }, code), route);
				const sameB = await invoke(await newRunner(limits).load({ ...manifest, id: `${manifest.id}-same` }, code), route);
				const row = {
					suite: "matrix",
					payload: p.name,
					shape: p.shape,
					bytes: p.bytes,
					limits: limitLabel,
					coldMs: cold,
					coldMedianMs: median(cold),
					coldErrors,
					outerFirstColdMs: outerFirst,
					warmMs: warm,
					warmMedianMs: median(warm),
					sameSourceColdMs: [sameA.ms, sameB.ms],
					sameSourceErrors: [sameA.error, sameB.error].filter((e) => e && !isExpected(route, e)),
				};
				await record(row);
				console.log(`${p.name.padEnd(30)} ${limitLabel.padEnd(13)} cold median ${String(row.coldMedianMs).padStart(6)} ms  warm ${String(row.warmMedianMs).padStart(4)} ms  errors ${coldErrors.length}${coldErrors[0] ? " (" + coldErrors[0].slice(0, 80) + ")" : ""}`);
			}
		}
	});

	it("memory: workerd resident memory per loaded plugin isolate", async () => {
		if (!wants("memory")) return;
		const K = cfg.memK ?? 8;
		const names = cfg.memPayloads ?? ["real-audit-log", "eager-64k", "eager-128k", "eager-256k", "eager-512k", "eager-1024k", "eager-2048k", "eager-4096k", "lazy-1024k", "lazy-4096k", "data-1024k", "data-4096k"];
		for (const name of names) {
			const { code, manifest } = await loadPayload(name);
			const route = manifest.routes[0] ?? "ping";
			const keep: unknown[] = [];
			const before = await rss();
			let errors = 0;
			for (let i = 0; i < K; i++) {
				const inst = await newRunner(NO_CPU_LIMIT).load({ ...manifest, id: `${manifest.id}-mem-${i}` }, `/* ${crypto.randomUUID()} */\n${code}`);
				const r = await invoke(inst, route);
				if (!isExpected(route, r.error)) errors++;
				keep.push(inst);
			}
			const after = await rss();
			const row = { suite: "memory", payload: name, bytes: code.length, isolates: K, rssBeforeKb: before, rssAfterKb: after, perIsolateKb: Math.round((after - before) / K), errors };
			await record(row);
			console.log(`memory ${name.padEnd(24)} +${row.perIsolateKb} KB per isolate (${K} isolates, ${errors} errors)`);
		}
	});

	it("multi: a cold site running N plugins in a row and at once", async () => {
		if (!wants("multi")) return;
		const N = cfg.multiN ?? 10;
		const names = cfg.multiPayloads ?? ["real-audit-log", "real-dinkus-commerce", "eager-128k", "eager-256k", "eager-512k", "eager-1024k"];
		for (const name of names) {
			const { code, manifest } = await loadPayload(name);
			const route = manifest.routes[0] ?? "ping";
			for (const [limitLabel, limits] of MODES) {
				const mk = async (tag: string, i: number) =>
					newRunner(limits).load({ ...manifest, id: `${manifest.id}-${tag}-${i}` }, `/* ${crypto.randomUUID()} */\n${code}`);
				// In a row: what a content save pays when N plugins each have a save hook.
				const seqInst = await Promise.all(Array.from({ length: N }, (_, i) => mk("seq", i)));
				const t0 = Date.now();
				let seqErrors = 0;
				for (const inst of seqInst) if (!isExpected(route, (await invoke(inst, route)).error)) seqErrors++;
				const seqMs = Date.now() - t0;
				// At once: N plugins woken by parallel requests or Promise.all.
				const parInst = await Promise.all(Array.from({ length: N }, (_, i) => mk("par", i)));
				const t1 = Date.now();
				const par = await Promise.all(parInst.map((inst) => invoke(inst, route)));
				const parMs = Date.now() - t1;
				const parErrors = par.filter((r) => !isExpected(route, r.error)).length;
				const row = { suite: "multi", payload: name, bytes: code.length, n: N, limits: limitLabel, sequentialMs: seqMs, parallelMs: parMs, seqErrors, parErrors };
				await record(row);
				console.log(`multi ${name.padEnd(22)} ${limitLabel.padEnd(13)} ${N} in a row ${seqMs} ms (${seqErrors} err), at once ${parMs} ms (${parErrors} err)`);
			}
		}
	});
});
