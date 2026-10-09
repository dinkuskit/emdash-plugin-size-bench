// Loads benchmark payloads through Worker Loader with the same module layout
// and limits EmDash's CloudflareSandboxRunner uses (wrapper.js is EmDash's
// generated wrapper, saved by the local harness's "wrapper" suite).
import { WorkerEntrypoint } from "cloudflare:workers";
import WRAPPER from "./wrapper.js.txt";

// Stand-in for EmDash's PluginBridge. The benchmark routes never call it.
export class BenchBridge extends WorkerEntrypoint {}

const REQ = { url: "https://bench.test/_emdash/api/plugins/bench/ping", method: "POST", headers: {}, meta: {} };

async function payload(env, name) {
	const base = "https://assets.local";
	const [code, manifest] = await Promise.all([
		env.ASSETS.fetch(`${base}/${name}.js`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`missing ${name}`)))),
		env.ASSETS.fetch(`${base}/${name}.json`).then((r) => r.json()),
	]);
	return { code, route: manifest.routes[0] ?? "ping" };
}

async function invokeOnce(env, ctx, code, route, cpuMs, key) {
	const t0 = Date.now();
	let error = null;
	try {
		const stub = env.LOADER.get(key, () => ({
			compatibilityDate: "2026-04-01",
			mainModule: "plugin.js",
			modules: { "plugin.js": { js: WRAPPER }, "sandbox-plugin.js": { js: code } },
			globalOutbound: null,
			limits: { cpuMs, subRequests: 10 },
			env: { PLUGIN_ID: "bench", PLUGIN_VERSION: "1.0.0", BRIDGE: ctx.exports.BenchBridge({ props: {} }) },
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
		if (url.pathname !== "/run") return new Response("GET /run?payload=<name>&cold=5&warm=5&cpuMs=50\n");
		const name = url.searchParams.get("payload");
		const cold = Number(url.searchParams.get("cold") ?? 5);
		const warm = Number(url.searchParams.get("warm") ?? 5);
		const cpuMs = Number(url.searchParams.get("cpuMs") ?? 50);
		const { code, route } = await payload(env, name);
		const coldRuns = [];
		const warmRuns = [];
		for (let i = 0; i < cold; i++) {
			const key = `bench-${crypto.randomUUID()}`;
			const unique = `/* nonce ${key} */\n${code}`;
			coldRuns.push(await invokeOnce(env, ctx, unique, route, cpuMs, key));
			if (i === 0 && !coldRuns[0].error) {
				for (let w = 0; w < warm; w++) warmRuns.push(await invokeOnce(env, ctx, unique, route, cpuMs, key));
			}
		}
		return Response.json({
			payload: name,
			bytes: code.length,
			cpuMs,
			colo: request.cf?.colo ?? null,
			cold: coldRuns,
			warm: warmRuns,
		});
	},
};
