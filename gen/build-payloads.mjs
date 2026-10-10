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
//   real-combo-* - real DinkusKit backends bundled together into one plugin,
//           to measure real plugin code at 192 KB to 1 MB
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSync } from "esbuild";

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
	["real-audit-log", "real/plugin-audit-log/package/dist/plugin.mjs", "@emdash-cms/plugin-audit-log@0.2.3"],
	["real-webhook-notifier", "real/plugin-webhook-notifier/package/dist/plugin.mjs", "@emdash-cms/plugin-webhook-notifier@0.2.3"],
	["real-atproto", "real/plugin-atproto/package/dist/plugin.mjs", "@emdash-cms/plugin-atproto@0.2.3"],
	["real-dinkus-inventory-zodmini", "real/dinkus-inventory-zodmini-backend.js", "dinkuskit/inventory#53 (zod/mini) Registry backend.js"],
	["real-dinkus-commerce", "real/dinkus-commerce-backend.js", "dinkuskit/commerce main 554e085 Registry backend.js"],
	["real-dinkus-inventory", "real/dinkus-inventory-backend.js", "dinkuskit/inventory main fd2df02 Registry backend.js (full zod)"],
];
for (const [name, path, source] of real) {
	if (!path) continue;
	const abs = join(root, path);
	if (!existsSync(abs)) {
		console.warn(`skip ${name}: ${abs} missing`);
		continue;
	}
	const code = readFileSync(abs, "utf8");
	// Route that does not exist: the call still loads and runs the module,
	// then returns a "route not found" error, which the harness counts as done.
	emit(name, "real", code, [source], manifest(`bench-${name}`, ["__bench_missing"]), source);
}

// Real DinkusKit code at sizes above today's 128 KiB cap: several Registry
// backends bundled into one module whose routes are the union of theirs.
// A part listed twice is bundled from two separate copies, so V8 parses and
// runs it twice, as it would two different modules of the same size.
const COMBOS = [
	["real-combo-commerce-inventory-zodmini", ["dinkus-commerce-backend.js", "dinkus-inventory-zodmini-backend.js"]],
	["real-combo-commerce-inventory", ["dinkus-commerce-backend.js", "dinkus-inventory-backend.js"]],
	["real-combo-x2", ["dinkus-commerce-backend.js", "dinkus-inventory-backend.js", "dinkus-commerce-backend.js", "dinkus-inventory-backend.js"]],
	["real-combo-x4", Array.from({ length: 4 }, () => ["dinkus-commerce-backend.js", "dinkus-inventory-backend.js"]).flat()],
];
for (const [name, parts] of COMBOS) {
	const tmp = mkdtempSync(join(tmpdir(), "emdash-bench-combo-"));
	try {
		const imports = parts.map((part, i) => {
			copyFileSync(join(root, "real", part), join(tmp, `p${i}.js`));
			return `import p${i} from "./p${i}.js";`;
		});
		const routes = parts.map((_, i) => `...p${i}.routes`).join(",");
		writeFileSync(join(tmp, "entry.js"), `${imports.join("\n")}\nexport default { hooks: {}, routes: { ${routes} } };\n`);
		const out = buildSync({ entryPoints: [join(tmp, "entry.js")], bundle: true, format: "esm", minify: true, write: false, logLevel: "warning" });
		const code = out.outputFiles[0].text;
		emit(name, "real", code, parts, manifest(`bench-${name}`, ["__bench_missing"]), `bundle of ${parts.join(" + ")}`);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
}

writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2));
console.log(index.map((p) => `${p.name.padEnd(28)} ${String(p.bytes).padStart(9)}  ${p.parts.join("+").slice(0, 70)}`).join("\n"));
