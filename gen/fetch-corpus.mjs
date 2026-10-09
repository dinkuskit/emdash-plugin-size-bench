// Fills corpus/ with the minified library builds the payload generator uses.
// Installs pinned npm packages into a temporary folder, copies their minified
// builds, and minifies typescript and acorn with esbuild. See corpus/SOURCES.md.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSync } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "corpus");
mkdirSync(out, { recursive: true });

const PACKAGES = [
	"lodash@4.18.1", "moment@2.31.0", "luxon@3.7.2", "handlebars@4.7.10", "rxjs@7.8.2",
	"marked@12.0.2", "three@0.160.1", "typescript@5.6.3", "date-fns@3.6.0", "acorn@8.19.0", "dayjs@1.11.23",
];
const COPY = {
	"dayjs.js": "dayjs/dayjs.min.js",
	"marked.js": "marked/marked.min.js",
	"moment.js": "moment/min/moment.min.js",
	"lodash.js": "lodash/lodash.min.js",
	"luxon.js": "luxon/build/global/luxon.min.js",
	"rxjs.js": "rxjs/dist/bundles/rxjs.umd.min.js",
	"handlebars.js": "handlebars/dist/handlebars.min.js",
	"date-fns.js": "date-fns/cdn.min.js",
	"three.js": "three/build/three.min.js",
};
const MINIFY = { "typescript.js": "typescript/lib/typescript.js", "acorn.js": "acorn/dist/acorn.js" };

const tmp = mkdtempSync(join(tmpdir(), "emdash-bench-corpus-"));
try {
	writeFileSync(join(tmp, "package.json"), '{"name":"corpus","private":true}');
	execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...PACKAGES], { cwd: tmp, stdio: "inherit" });
	const nm = join(tmp, "node_modules");
	for (const [name, path] of Object.entries(COPY)) copyFileSync(join(nm, path), join(out, name));
	for (const [name, path] of Object.entries(MINIFY)) {
		buildSync({ entryPoints: [join(nm, path)], outfile: join(out, name), minify: true, bundle: false, logLevel: "warning" });
	}
	console.log(`corpus written to ${out}`);
} finally {
	rmSync(tmp, { recursive: true, force: true });
}
