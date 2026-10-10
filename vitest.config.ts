// Runs the benchmark inside workerd (via @cloudflare/vitest-plugin) so plugins
// are loaded by EmDash's production CloudflareSandboxRunner through a real
// Worker Loader binding. Payload files and process probes are served from Node
// through function service bindings.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig, type Plugin } from "vite";

const virtualModules: Record<string, string> = {
	"virtual:emdash/wait-until": `export { waitUntil } from "cloudflare:workers";`,
	"virtual:emdash/scheduler": "export const createScheduler = null;",
	"virtual:emdash/config": "export default {};",
	"virtual:emdash/env": "export const env = undefined;",
	"virtual:emdash/build": "export const buildTime = 0;",
	"virtual:emdash/object-cache": "export const createObjectCacheBackend = null;",
};
const virtualPlugin: Plugin = {
	name: "virtual",
	resolveId: (id) => (Object.hasOwn(virtualModules, id) ? `\0${id}` : null),
	load: (id) => (id.startsWith("\0virtual:emdash/") ? virtualModules[id.slice(1)] : null),
};

const payloadDir = resolve("payloads");
const resultsFile = resolve(process.env.BENCH_RESULTS ?? "results/raw.jsonl");
// One line per finished measurement, so a long run can be followed with tail -f.
const progressFile = resolve(dirname(resultsFile), "progress.log");

function workerdRssKb(): { rssKb: number; pids: number[] } {
	const out = execFileSync("ps", ["-eo", "pid=,rss=,comm="], { encoding: "utf8" });
	let rssKb = 0;
	const pids: number[] = [];
	for (const line of out.trim().split("\n")) {
		const [pid, rss, comm] = line.trim().split(/\s+/);
		if (comm?.startsWith("workerd")) {
			rssKb += Number(rss);
			pids.push(Number(pid));
		}
	}
	return { rssKb, pids };
}

export default defineConfig({
	plugins: [
		virtualPlugin,
		cloudflareTest({
			main: resolve("node_modules/@emdash-cms/plugin-test/dist/worker.mjs"),
			remoteBindings: false,
			additionalExports: { PluginBridge: "WorkerEntrypoint" },
			miniflare: {
				compatibilityDate: "2026-08-20",
				compatibilityFlags: ["nodejs_compat"],
				d1Databases: ["DB"],
				workerLoaders: { LOADER: {} },
				bindings: { BENCH_CONFIG: process.env.BENCH_CONFIG ?? "{}" },
				serviceBindings: {
					PAYLOADS: async (request: Request) => {
						const name = new URL(request.url).pathname.slice(1);
						if (name.includes("/") || name.includes("..")) return new Response("bad", { status: 400 });
						try {
							return new Response(readFileSync(resolve(payloadDir, name)));
						} catch {
							return new Response("missing", { status: 404 });
						}
					},
					PROBE: async (request: Request) => {
						const url = new URL(request.url);
						if (url.pathname === "/rss") return Response.json(workerdRssKb());
						// Node's high-resolution clock (fractional ms), used for the outside timing.
						if (url.pathname === "/now") return Response.json({ ms: performance.now() });
						if (url.pathname === "/wrapper") {
							writeFileSync(resolve("edge/src/wrapper.js.txt"), await request.text());
							return new Response("ok");
						}
						if (url.pathname === "/log") {
							appendFileSync(progressFile, `${new Date().toISOString()} ${await request.text()}\n`);
							return new Response("ok");
						}
						if (url.pathname === "/result") {
							appendFileSync(resultsFile, (await request.text()) + "\n");
							return new Response("ok");
						}
						return new Response("?", { status: 404 });
					},
				},
			},
		}),
	],
	test: { include: ["test/**/*.test.ts"], testTimeout: 3_600_000, hookTimeout: 600_000 },
});
