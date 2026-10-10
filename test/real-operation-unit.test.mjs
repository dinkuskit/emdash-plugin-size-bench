import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleCount, summarize } from "../real-operation/config.mjs";

test("sample counts accept bounded integers and reject unsafe configuration", () => {
	assert.equal(sampleCount(undefined, 3, "cold"), 3);
	assert.equal(sampleCount("20", 3, "cold"), 20);
	for (const value of [0, -1, 21, 1.5, "NaN", "", null]) {
		assert.throws(() => sampleCount(value, 3, "cold"), /integer from 1 to 20/);
	}
});
test("cold load failures, output mismatches and warm RPC failures remain counted", () => {
	const rows = [
		{ phase: "cold", index: 0, ok: false, error: "load failed" },
		{ phase: "cold", index: 1, ok: true, error: null },
		{ phase: "warm", index: 0, ok: false, error: "output mismatch" },
		{ phase: "warm", index: 1, ok: false, error: "RPC failed" },
	];
	assert.deepEqual(summarize(rows), {
		attempted: 4, success: 1, failed: 3, coldSamples: 2, warmSamples: 2,
		errors: ["cold[0]: load failed", "warm[0]: output mismatch", "warm[1]: RPC failed"],
	});
});
