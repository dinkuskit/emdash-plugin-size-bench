import { CloudflareSandboxRunner, generatePluginWrapper } from "@emdash-cms/cloudflare/sandbox";
import { createDialect } from "@emdash-cms/cloudflare/db/d1";
import { runMigrations } from "emdash/db";
import { env } from "cloudflare:workers";
import { Kysely, sql } from "kysely";
import { describe, expect, it } from "vitest";
import { sampleCount, summarize } from "../real-operation/config.mjs";

const E = env as unknown as { PAYLOADS: Fetcher; PROBE: Fetcher; BENCH_CONFIG: string };
const cfg = JSON.parse(E.BENCH_CONFIG || "{}");
const ENABLED = cfg.suites?.includes("real-operation") ?? false;
const COLD = sampleCount(cfg.realCold, 3, "realCold");
const WARM = sampleCount(cfg.realWarm, 5, "realWarm");
const runId = cfg.runId ?? new Date().toISOString();
const db = new Kysely<any>({ dialect: createDialect({ binding: "DB", session: "disabled" }) });
const SITE = { name: "Bench", url: "https://bench.test", locale: "en" };
const ITEM = "proof-item-001";
const CONNECTION = "proof-connection-001";
// Public synthetic challenge, never an issued session or credential.
const EXPIRES = 4102444800000;
const commerceExpected = {
	id: ITEM, name: "Public Proof Product", sku: "PROOF-001",
	price: { currency: "USD", minor: "1299" },
	availability: { status: "in-stock", sellable: true, listable: true }, image: null, gallery: [],
};
const proofExpected = {
	version: 1, connection_id: CONNECTION, challenge: "proof-challenge-001",
	client_id: "dinkus-inventory-emdash", service: "inventory", site_id: "proof-site-001",
	site_origin: SITE.url, callback_uri: `${SITE.url}/_emdash/admin/plugins/dinkus-inventory/inventory`,
	code_challenge: "proof-code-challenge-001", expires_at: EXPIRES,
};
const commerceRows = [
	["catalog_items", ITEM, { recordKind: "catalog-item", itemId: ITEM, name: commerceExpected.name, sku: commerceExpected.sku,
		creationIntent: { manageStock: false }, stockManagement: { mode: "unmanaged" }, fulfillment: "physical" }],
	["catalog_prices", ITEM, { recordKind: "catalog-price", recordId: ITEM, catalogItemId: ITEM, regular: commerceExpected.price }],
	["catalog_manual_availability", ITEM, { recordKind: "catalog-manual-availability", recordId: ITEM, catalogItemId: ITEM, status: "in-stock" }],
] as const;
const inventoryRows = [
	["__kv", `state:store-proof:${CONNECTION}`, proofExpected],
	["__kv", "settings:connectionSession", JSON.stringify({ phase: "challenge", connectionId: CONNECTION,
		challenge: proofExpected.challenge, verificationUri: "https://accounts.dinkuskit.invalid/account/connect?connection_id=proof-connection-001",
		expiresAt: EXPIRES, interval: 60000, nextPoll: EXPIRES - 1000,
		codeVerifier: "synthetic-proof-only-abcdefghijklmnopqrstuvwxyz123456789",
		initiatingAdminId: "proof-admin-001", siteId: proofExpected.site_id, siteOrigin: SITE.url,
		callbackUri: proofExpected.callback_uri, codeChallenge: proofExpected.code_challenge })],
] as const;
const cases = [
	{
		name: "commerce-catalog-item", label: "Commerce public priced, sellable product lookup",
		file: "operation-commerce.js", sourcePath: "real/dinkus-commerce-backend.js", sha256: "b5412f77ec6491b4a812dd2b71b9b3e136dcd88b4f50704329d4c05030eefea7",
		pluginId: "dinkus-commerce", route: "catalog/public/item", input: {},
		url: `${SITE.url}/catalog/public/item?itemId=${ITEM}`, expected: commerceExpected, rows: commerceRows,
		storage: { catalog_items: {}, catalog_prices: {}, catalog_manual_availability: {}, catalog_media: {}, storefront_placeholder_image: {} },
	},
	{
		name: "inventory-connection-proof", label: "Inventory public connection-proof read",
		file: "operation-inventory.js", sourcePath: "real/dinkus-inventory-backend.js", sha256: "b47bf6fba6b469bb52e45137301cffd9bbde9dce717ca29b080166cc1f6ae530",
		pluginId: "dinkus-inventory-emdash", route: "store-proof", input: { connection_id: CONNECTION },
		url: `${SITE.url}/store-proof?connection_id=${CONNECTION}`, expected: proofExpected, rows: inventoryRows, storage: {},
	},
];
type Case = typeof cases[number];
const manifest = (c: Case) => ({ id: c.pluginId, version: "1.0.0", capabilities: [], allowedHosts: [],
	storage: c.storage, hooks: [], routes: [c.route], admin: { pages: [], widgets: [] } });
const bytes = (s: string) => new TextEncoder().encode(s).byteLength;
async function digest(s: string) {
	return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
		(b) => b.toString(16).padStart(2, "0")).join("");
}
async function payload(file: string) {
	const r = await E.PAYLOADS.fetch(`https://p/${file}`);
	if (!r.ok) throw new Error(`backend fixture ${file}: ${r.status}`);
	return r.text();
}
async function record(row: object) {
	const r = await E.PROBE.fetch("https://p/result", { method: "POST", body: JSON.stringify({ runId, ...row }) });
	if (!r.ok) throw new Error(`result recording failed: ${r.status}`);
}
async function nodeNow() {
	return ((await (await E.PROBE.fetch("https://p/now")).json()) as { ms: number }).ms;
}
async function put(id: string, collection: string, key: string, value: unknown) {
	await sql`INSERT INTO _plugin_storage (plugin_id, collection, id, data, revision, updated_at)
		VALUES (${id}, ${collection}, ${key}, ${JSON.stringify(value)}, 'fixture-v1', '2000-01-01 00:00:00')
		ON CONFLICT (plugin_id, collection, id) DO UPDATE SET data=excluded.data, revision=excluded.revision, updated_at=excluded.updated_at`.execute(db);
}
async function seed(c: Case) {
	for (const [collection, key, value] of c.rows) await put(c.pluginId, collection, key, value);
}
async function snapshot() {
	return (await sql`SELECT plugin_id, collection, id, data, revision, updated_at FROM _plugin_storage
		ORDER BY plugin_id, collection, id`.execute(db)).rows;
}
async function load(c: Case, code: string) {
	return new CloudflareSandboxRunner({ db, siteInfo: SITE,
		isolateKey: `operation-${runId}-${crypto.randomUUID()}` } as any).load(manifest(c) as any, code);
}
function projection(raw: any) {
	if (!raw?.__emdashPluginResponse) return { status: 200, headers: null, body: raw };
	return { status: raw.status, headers: raw.headers,
		body: raw.body?.kind === "text" ? JSON.parse(raw.body.value) : raw.body };
}
function validate(raw: unknown, expected: unknown, status = 200, isProof = false) {
	const result = projection(raw);
	expect(result.status).toBe(status);
	expect(result.body).toEqual(expected);
	if (isProof) expect(result.headers).toContainEqual(["content-type", "application/json"]);
}
// Validation and the post-call Node clock probe are outside the inside timer.
// Cold includes runner.load, wrapper generation, lazy module init and operation.
async function measure(c: Case, code: string, existing?: any, input = c.input, url = c.url) {
	const nodeStart = await nodeNow();
	const insideStart = Date.now();
	let inst = existing, raw: unknown = null, error: string | null = null;
	try {
		inst ??= await load(c, code);
		raw = await inst.invokeRoute(c.route, input, { url, method: "GET", headers: {}, meta: {} });
	} catch (e) { error = String((e as Error)?.message ?? e).slice(0, 300); }
	const insideWallMs = Date.now() - insideStart;
	const nodeMs = Math.round(((await nodeNow()) - nodeStart) * 1000) / 1000;
	return { inst, raw, error, insideWallMs, nodeMs };
}
function checked(sample: Awaited<ReturnType<typeof measure>>, c: Case, status = 200, expected: unknown = c.expected) {
	let error = sample.error;
	if (!error) {
		try { validate(sample.raw, expected, status, c.route === "store-proof"); }
		catch (e) { error = `output mismatch: ${String((e as Error).message).slice(0, 300)}`; }
	}
	return { nodeMs: sample.nodeMs, insideWallMs: sample.insideWallMs, ok: error === null, error, observed: sample.raw };
}
async function runCase(c: Case, code: string) {
	const actualHash = await digest(code);
	expect(actualHash, "tracked backend identity").toBe(c.sha256);
	await seed(c);
	const before = await snapshot();
	const wrapper = generatePluginWrapper(manifest(c) as any, { site: SITE });
	const samples: any[] = [];
	let warmInstance: any, warmIdentity: any;
	for (let i = 0; i < COLD; i++) {
		const nonce = crypto.randomUUID();
		const unique = `/* real-operation ${nonce} */\n${code}`;
		const identity = { nonce, codeSha256: await digest(unique) };
		const sample = await measure(c, unique);
		const result = checked(sample, c);
		samples.push({ phase: "cold", index: i, ...identity, ...result });
		if (result.ok && !warmInstance) { warmInstance = sample.inst; warmIdentity = identity; }
	}
	if (warmInstance) for (let i = 0; i < WARM; i++) {
		samples.push({ phase: "warm", index: i, ...warmIdentity, ...checked(await measure(c, code, warmInstance), c) });
	}
	const summary = summarize(samples);
	const unchanged = JSON.stringify(before) === JSON.stringify(await snapshot());
	await record({ suite: "real-operation", case: c.name, label: c.label, units: "ms", ...summary, samples,
		requested: { cold: COLD, warm: WARM }, timing: "cold runner.load + first operation (including lazy initialization); warm same isolate; wall-clock only",
		source: { path: c.sourcePath, sha256: actualHash, bytes: bytes(code) },
		wrapper: { sha256: await digest(wrapper), bytes: bytes(wrapper) },
		manifest: { sha256: await digest(JSON.stringify(manifest(c))), value: manifest(c) },
		fixture: { kind: "local D1 via production PluginBridge", sha256: await digest(JSON.stringify(c.rows)), rows: c.rows,
			storageUnchanged: unchanged, network: "no http capability, no allowed hosts, globalOutbound null" },
		cpuBudget: { configuredMs: 50, measuredCpuMs: null, enforcedLocally: false },
	});
	expect(unchanged, "read-only operation preserved fixture database").toBe(true);
	expect(summary.success).toBe(COLD + WARM);
	expect(summary.errors).toEqual([]);
}

describe("focused real-operation benchmark", () => {
	it("verifies seeded Commerce product and Inventory connection proof", async () => {
		if (!ENABLED) return;
		await runMigrations(db);
		// Run both even if one fails, so each backend gets a diagnostic row.
		const failures: string[] = [];
		for (const c of cases) {
			try { await runCase(c, await payload(c.file)); }
			catch (e) { failures.push(`${c.name}: ${String((e as Error).message)}`); }
		}
		expect(failures).toEqual([]);
	});
	it("verifies read-only negative controls outside successful latency samples", async () => {
		if (!ENABLED) return;
		await runMigrations(db);
		const samples: any[] = [];
		for (const c of cases) {
			const code = await payload(c.file);
			await seed(c);
			const inst = await load(c, code);
			const before = await snapshot();
			const missing = await measure(c, code, inst, c.route === "store-proof" ? { connection_id: "missing" } : {},
				c.route === "store-proof" ? c.url : `${SITE.url}/catalog/public/item?itemId=missing`);
			samples.push({ phase: "negative", index: samples.length, case: `${c.name}-missing`,
				...checked(missing, c, c.route === "store-proof" ? 404 : 200, c.route === "store-proof" ? { error: "not_found" } : null) });
			expect(await snapshot()).toEqual(before);
			if (c.route === "store-proof") {
				// A valid stored challenge with a mismatched current session is rejected.
				await put(c.pluginId, "__kv", `state:store-proof:${CONNECTION}`, { ...proofExpected, challenge: "mismatch" });
				const changed = await snapshot();
				samples.push({ phase: "negative", index: samples.length, case: "inventory-connection-proof-mismatch",
					...checked(await measure(c, code, inst), c, 404, { error: "not_found" }) });
				expect(await snapshot()).toEqual(changed);
			}
			// Wrong route is an RPC failure, never an accepted successful operation.
			await expect(inst.invokeRoute("__bench_missing", {}, { url: c.url, method: "GET", headers: {}, meta: {} })).rejects.toThrow(/Route not found/);
		}
		await record({ suite: "real-operation-controls", case: "expected-negative-results", units: "ms", attempted: samples.length,
			expectedFailures: samples.filter((s) => s.ok).length, unexpectedFailures: samples.filter((s) => !s.ok).length, samples,
			includedInSuccessfulLatencies: false });
		expect(samples.filter((s) => !s.ok)).toEqual([]);
	});
});
