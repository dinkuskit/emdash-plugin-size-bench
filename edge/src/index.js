// Loads benchmark payloads through Worker Loader with the same module layout
// and limits EmDash's CloudflareSandboxRunner uses (wrapper.js is EmDash's
// generated wrapper, saved by the local harness's "wrapper" suite).
//
// The bridge binding is made the way EmDash's runner makes it: from the
// Worker's own exports (getPluginBridge in @emdash-cms/cloudflare:
// exports.PluginBridge({ props })), once per request in the request itself,
// and handed to Worker Loader's callback ready-made. Making it inside the
// callback worked under wrangler dev but not on deployed Workers. If the
// runtime offers no callable entrypoint, the plugin gets a plain placeholder
// instead: the benchmark routes never call the bridge, so load times are
// unaffected. Every /run response says which one was used, and /diag shows
// what the runtime offered.
import { WorkerEntrypoint, exports } from "cloudflare:workers";
import WRAPPER from "./wrapper.js.txt";

// Stand-in for EmDash's PluginBridge. The benchmark routes never call it.
export class BenchBridge extends WorkerEntrypoint {}

function bridge(ctx) {
	for (const [how, src] of [["exports", exports], ["ctx.exports", ctx?.exports]]) {
		if (typeof src?.BenchBridge === "function") {
			try {
				return { how: `${how}.BenchBridge({ props })`, binding: src.BenchBridge({ props: {} }) };
			} catch {}
		}
	}
	return { how: "placeholder", binding: { placeholder: true } };
}

function describe(src) {
	if (src == null) return String(src);
	let keys = null;
	try {
		keys = Reflect.ownKeys(src).map(String);
	} catch {}
	return { type: typeof src, keys, BenchBridge: typeof src.BenchBridge };
}

const REQ = { url: "https://bench.test/_emdash/api/plugins/bench/ping", method: "POST", headers: {}, meta: {} };

// The local harness's almost empty plugin, as a baseline: what loading any
// plugin costs before its own code does anything.
const TINY_CODE = `export default {hooks:{},routes:{ping:{handler:async()=>({ok:true})}}};`;

// Busy-loop plugins that check the limit itself: spin-route-<n> runs n million
// loop steps inside its route, spin-import-<n> runs them at import. Same loop
// as the local harness's limits suite.
const SPIN = /^spin-(route|import)-(\d+)$/;
function spinCode(where, n) {
	const loop = `let x=0;for(let i=0;i<${n}e6;i++){x=(x+i)|0}`;
	return where === "route"
		? `export default {hooks:{},routes:{ping:{handler:async()=>{${loop}return {x}}}}};`
		: `${loop}\nexport default {hooks:{},routes:{ping:{handler:async()=>({x})}}};`;
}

async function payload(env, name) {
	if (name === "tiny") return { code: TINY_CODE, route: "ping" };
	const spin = SPIN.exec(name ?? "");
	if (spin) return { code: spinCode(spin[1], Number(spin[2])), route: "ping" };
	const base = "https://assets.local";
	const [code, manifest] = await Promise.all([
		env.ASSETS.fetch(`${base}/${name}.js`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`missing ${name}`)))),
		env.ASSETS.fetch(`${base}/${name}.json`).then((r) => r.json()),
	]);
	return { code, route: manifest.routes[0] ?? "ping" };
}

async function invokeOnce(env, br, code, route, cpuMs, key) {
	const t0 = Date.now();
	let error = null;
	try {
		const stub = env.LOADER.get(key, () => ({
			compatibilityDate: "2026-04-01",
			mainModule: "plugin.js",
			modules: { "plugin.js": { js: WRAPPER }, "sandbox-plugin.js": { js: code } },
			globalOutbound: null,
			limits: { cpuMs, subRequests: 10 },
			env: { PLUGIN_ID: "bench", PLUGIN_VERSION: "1.0.0", BRIDGE: br.binding },
		}));
		await stub.getEntrypoint("default").invokeRoute(route, {}, REQ, crypto.randomUUID());
	} catch (e) {
		error = String(e?.message ?? e).slice(0, 200);
	}
	const ms = Date.now() - t0;
	if (error && route === "__bench_missing" && /not found/i.test(error)) error = null;
	return { ms, error };
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname === "/index.json") return env.ASSETS.fetch("https://assets.local/index.json");
		if (url.pathname === "/diag") return Response.json({ exports: describe(exports), ctxExports: describe(ctx.exports), bridge: bridge(ctx).how, colo: request.cf?.colo ?? null });
		if (url.pathname !== "/run") return new Response("GET /run?payload=<name>&cold=5&warm=5&cpuMs=50\n");
		const name = url.searchParams.get("payload");
		const cold = Number(url.searchParams.get("cold") ?? 5);
		const warm = Number(url.searchParams.get("warm") ?? 5);
		const cpuMs = Number(url.searchParams.get("cpuMs") ?? 50);
		const { code, route } = await payload(env, name);
		const br = bridge(ctx);
		const coldRuns = [];
		const warmRuns = [];
		for (let i = 0; i < cold; i++) {
			const key = `bench-${crypto.randomUUID()}`;
			const unique = `/* nonce ${key} */\n${code}`;
			coldRuns.push(await invokeOnce(env, br, unique, route, cpuMs, key));
			if (i === 0 && !coldRuns[0].error) {
				for (let w = 0; w < warm; w++) warmRuns.push(await invokeOnce(env, br, unique, route, cpuMs, key));
			}
		}
		return Response.json({
			payload: name,
			bytes: code.length,
			cpuMs,
			bridge: br.how,
			colo: request.cf?.colo ?? null,
			cold: coldRuns,
			warm: warmRuns,
		});
	},
};
