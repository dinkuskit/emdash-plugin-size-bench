// Generates benchmark plugin payloads: sandboxed-plugin modules of controlled
// size and shape, plus a manifest for each. Output: payloads/<name>.js,
// payloads/<name>.json and payloads/index.json.
//
// Shapes:
//   eager - real minified library code, every library initialised at import
//           (what a bundled ESM plugin does: all module top-levels run on load)
//   lazy  - the same code wrapped in functions that only run on demand
//           (lower bound: V8 pre-parses but does not compile or run them)
//   data  - the same byte count as one string literal (parse cost only)
//   real-* - unmodified published plugin bundles (upstream + DinkusKit)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpusDir = join(root, "corpus");
const outDir = join(root, "payloads");
mkdirSync(outDir, { recursive: true });

const KiB = 1024;
const SIZES = (process.env.SIZES ?? "16,32,64,96,128,192,256,384,512,768,1024,1536,2048,4096,8192")
	.split(",")
	.map((n) => Number(n) * KiB);

// Small to large so that small payloads stay diverse.
const CORPUS = [
	"dayjs", "marked", "moment", "lodash", "luxon", "rxjs", "handlebars", "date-fns",
	"acorn", "three", "typescript",
].map((name) => ({ name, code: readFileSync(join(corpusDir, `${name}.js`), "utf8") }));

// Deterministic "app-like" filler code for the last few KB of a payload.
function filler(bytes, seed) {
	let out = "";
	let i = 0;
	while (out.length < bytes) {
		const n = `${seed}_${i++}`;
		out += `function f${n}(a,b){const c=(a|0)*31+(b|0);if(c>${i * 7})return[c,a,"${n}"].join("-");const o={a,b,c,k:"k${n}"};for(const x of Object.keys(o))o[x]=String(o[x]).length;return o}\n`;
	}
	return out;
}

const HEADER = `const __mods=[];const __state={loaded:0,errors:[]};\n`;
function wrapMod(name, code) {
	return `__mods.push(function(module,exports){/* ${name} */\n${code}\n});\n`;
}
const RUN = `function __run(){for(const f of __mods){const m={exports:{}};try{f.call(globalThis,m,m.exports);__state.loaded++}catch(e){__state.errors.push(String(e&&e.message||e).slice(0,120))}}}\n`;
const FOOTER = (eager) => `${eager ? "__run();\n" : ""}
export default {
	hooks: {},
	routes: {
		ping: { handler: async () => ({ ok: true }) },
		info: { handler: async () => { ${eager ? "" : "if(!__state.loaded&&!__state.errors.length)__run();"} return { mods: __mods.length, ...__state }; } },
	},
};
`;

function codePayload(target, eager) {
	const parts = [];
	let body = "";
	const overhead = HEADER.length + RUN.length + FOOTER(eager).length;
	let budget = target - overhead;
	// Cycle through the corpus, taking every library that still fits.
	for (let round = 0; round < 4 && budget > 0; round++) {
		for (const lib of CORPUS) {
			const chunk = wrapMod(lib.name, lib.code);
			if (chunk.length <= budget) {
				body += chunk;
				budget -= chunk.length;
				parts.push(lib.name);
			}
		}
	}
	if (budget > 200) {
		body += wrapMod("filler", filler(budget - 80, parts.length));
		parts.push(`filler`);
	}
	return { code: HEADER + body + RUN + FOOTER(eager), parts };
}

function dataPayload(target) {
	const pre = `const __blob="`;
	const post = `";\nexport default { hooks: {}, routes: { ping: { handler: async () => ({ ok: true }) }, info: { handler: async () => ({ length: __blob.length }) } } };\n`;
	const n = target - pre.length - post.length;
	let s = "";
	const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let x = 12345;
	const chars = [];
	for (let i = 0; i < n; i++) {
		x = (x * 1103515245 + 12345) & 0x7fffffff;
		chars.push(alphabet[x % alphabet.length]);
	}
	s = chars.join("");
	return { code: pre + s + post, parts: ["string"] };
}

function manifest(id, routes = ["ping", "info"]) {
	return {
		id,
		version: "1.0.0",
		capabilities: [],
		allowedHosts: [],
		storage: {},
		hooks: [],
		routes,
		admin: { pages: [], widgets: [] },
	};
}

const index = [];
function emit(name, shape, code, parts, man, source) {
	writeFileSync(join(outDir, `${name}.js`), code);
	writeFileSync(join(outDir, `${name}.json`), JSON.stringify(man));
	index.push({ name, shape, bytes: Buffer.byteLength(code), parts, source, route: man.routes[0] ?? null });
}

for (const size of SIZES) {
	const kb = size / KiB;
	const e = codePayload(size, true);
	emit(`eager-${kb}k`, "eager", e.code, e.parts, manifest(`bench-eager-${kb}k`));
	const l = codePayload(size, false);
	emit(`lazy-${kb}k`, "lazy", l.code, l.parts, manifest(`bench-lazy-${kb}k`));
	const d = dataPayload(size);
	emit(`data-${kb}k`, "data", d.code, d.parts, manifest(`bench-data-${kb}k`));
}

// Real published bundles.
const real = [
	["real-audit-log", "bench/real/plugin-audit-log/package/dist/plugin.mjs", "@emdash-cms/plugin-audit-log@0.2.3"],
	["real-webhook-notifier", "bench/real/plugin-webhook-notifier/package/dist/plugin.mjs", "@emdash-cms/plugin-webhook-notifier@0.2.3"],
	["real-atproto", "bench/real/plugin-atproto/package/dist/plugin.mjs", "@emdash-cms/plugin-atproto@0.2.3"],
	["real-dinkus-inventory-zodmini", "bench/real/dinkus-inventory-zodmini-backend.js", "dinkuskit/inventory#53 (zod/mini) Registry backend.js"],
	["real-dinkus-commerce", "bench/real/dinkus-commerce-backend.js", "dinkuskit/commerce main 554e085 Registry backend.js"],
	["real-dinkus-inventory", "bench/real/dinkus-inventory-backend.js", "dinkuskit/inventory main fd2df02 Registry backend.js (full zod)"],
];
for (const [name, path, source] of real) {
	if (!path) continue;
	const abs = path.startsWith("/") ? path : join(root, "..", path);
	if (!existsSync(abs)) {
		console.warn(`skip ${name}: ${abs} missing`);
		continue;
	}
	const code = readFileSync(abs, "utf8");
	// Route that does not exist: the call still loads and runs the module,
	// then returns a "route not found" error, which the harness counts as done.
	emit(name, "real", code, [source], manifest(`bench-${name}`, ["__bench_missing"]), source);
}

writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2));
console.log(index.map((p) => `${p.name.padEnd(28)} ${String(p.bytes).padStart(9)}  ${p.parts.join("+").slice(0, 70)}`).join("\n"));
