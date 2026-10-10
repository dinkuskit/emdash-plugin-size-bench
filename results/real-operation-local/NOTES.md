# Successful real-operation local proof

Run ID: `2026-10-10T03:05:49.206Z`. Base: `d2f1d07b40986f181e51888f12116c0844d57345` (merged size-benchmark PR #1). `harness-identity.json` pins the measured harness files. `raw.jsonl` pins unmodified backend bytes, generated wrapper, manifest, deterministic seeded fixture, each cold source nonce and its complete code hash; it also contains observed business results.

Commands (after frozen dependency installation, using Node 22):

```sh
node --test test/real-operation-unit.test.mjs
node scripts/run-real-operation.mjs
```

| Operation | Cold samples | Warm samples | Median outside cold ms | Median outside warm ms | Unexpected operation failures |
|---|---:|---:|---:|---:|---:|
| commerce-catalog-item | 3 | 5 | 12.875 | 7.153 | 0 |
| inventory-connection-proof | 3 | 5 | 16.883 | 3.127 | 0 |

All 16 successful operation calls matched the complete expected output. Inventory also matched HTTP 200 and JSON content type. Three data controls passed: missing Commerce product, missing Inventory proof and mismatched Inventory challenge return their exact expected negative results. Two separate wrong-route assertions passed. Wrong-route calls emit expected workerd exception/cancellation messages to stderr; they are excluded from successful timing rows. Unit tests cover invalid sample counts and accounting for cold-load, output-mismatch and warm-RPC failures. A bounded existing matrix smoke (one Commerce missing-route cold/warm pair, plus its existing baseline/same-source probes) passed with the existing row schema and no unexpected errors; the new suite was disabled in that run.

This is one macOS arm64 development machine, Node 22.23.1, local workerd via Vitest 4.1.11 and the checked-in dependency lockfile. It is modest correctness/harness evidence, not a dedicated comparative or production run. Cold timing combines runner loading, generated wrapper, lazy initialization and the first operation, with unique source text for each fresh isolate. Warm timing reuses the first successful isolate. Node outside timing includes clock-probe overhead; inside time has 1 ms resolution and only advances on I/O. No independent loading stage or measured CPU time is claimed. The configured 50 ms budget is not enforced by local workerd.

Storage uses real local D1 and production PluginBridge, with synthetic rows seeded outside timing and unchanged-database assertions around reads. No external HTTP capability, production data, stock ledger, checkout, R2 or live deployment is involved. Inventory is a public connection-proof workload, not stock-query performance. Full-zod Inventory is the single representative backend; no additional size or validation-library comparison is introduced.

PR #1's committed notes say its Hetzner VM and temporary edge Worker were deleted. No host was provisioned or reused here. Dedicated comparison or a new live run requires a separate owner-approved resource/deployment gate.
