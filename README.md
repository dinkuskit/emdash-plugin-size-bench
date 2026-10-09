# EmDash sandboxed plugin size benchmark

How much does a bigger sandboxed (Registry) plugin cost to load? This benchmark loads plugins from 5 KB to 8 MB through EmDash 1.2.0's own sandbox code and measures:

- **Cold**: the first call into a plugin in a brand-new isolate. This covers fetching the isolate, parsing, compiling, running the module's top level and one trivial route.
- **Warm**: later calls into the same isolate.
- **Same-source cold**: two fresh isolates with identical source, to show whether any compile cache helps repeat loads.
- **Memory**: workerd resident memory added per loaded plugin isolate.
- **Ten plugins on a cold site**: ten plugins woken one after another, as a content save with ten save hooks does, and all at once.
- **Node hosting**: standalone workerd started with N plugins, the way `@emdash-cms/sandbox-workerd` restarts on every plugin change.
- **Real Cloudflare** (optional): the same loads on Cloudflare's edge, where the 50 ms CPU limit is enforced.

## What gets loaded

`gen/build-payloads.mjs` writes `payloads/`. It needs the minified library corpus in `corpus/`, which `gen/fetch-corpus.mjs` downloads from npm at pinned versions; see `corpus/SOURCES.md`. The `real/` bundles are checked in: the three upstream plugins with their MIT licences, and the DinkusKit backends built from the public `dinkuskit/commerce` repo (554e085) and `dinkuskit/inventory` repo (fd2df02, plus the `zod/mini` build from inventory#53).

| Shape | What it is |
|---|---|
| `eager-*` | Real minified library code (dayjs, marked, moment, lodash, luxon, rxjs, handlebars, date-fns, acorn, three, typescript), every library initialised at import. Bundled ESM plugins behave this way, because every module's top level runs on load. |
| `lazy-*` | The same code wrapped in functions that only run on demand. This is the lower bound: V8 pre-parses those functions but does not compile or run them. |
| `data-*` | The same number of bytes as one string literal. This measures parsing alone. |
| `real-*` | Unmodified bundles: upstream `@emdash-cms/plugin-audit-log`, `plugin-webhook-notifier` and `plugin-atproto` 0.2.3, plus DinkusKit Commerce (117 KB, today's largest real Registry backend we know of) and Inventory with full zod (131 KB) and with `zod/mini` (76 KB). |

Each synthetic size comes in all three shapes: 16, 32, 64, 96, 128, 192, 256, 384 and 512 KB, then 768 KB and 1, 1.5, 2, 4 and 8 MB.

## How it measures

`test/bench.test.ts` runs inside workerd through `@cloudflare/vitest-plugin`. It loads each payload with EmDash's production `CloudflareSandboxRunner` from `@emdash-cms/cloudflare@1.2.0`, which uses a real Worker Loader binding, the generated wrapper and the `PluginBridge` loopback. Every cold load gets a new isolate key and a unique source comment, so neither isolate reuse nor a source-keyed cache can help.

The timer is `Date.now()` inside workerd, which only advances on I/O, so each number spans one awaited RPC into the plugin isolate. A Node-side clock taken around the first cold call of each payload agrees with it.

`run-all.mjs` runs the CPU-limit check, then three passes of the size matrix, each in a fresh workerd process with payload order shuffled to spread drift, then the memory and ten-plugin suites. `analyze.mjs` pools the samples (21 cold loads per payload) and writes `results/summary.md` and `results/summary.json`.

```sh
pnpm install
node gen/fetch-corpus.mjs      # downloads pinned libraries into corpus/
node gen/build-payloads.mjs
PASSES=3 COLD=7 node run-all.mjs
WORKERD_BIN=$(ls -d node_modules/.pnpm/@cloudflare+workerd-linux-64@*/node_modules/@cloudflare/workerd-linux-64/bin/workerd) \
  node node-host/bench-workerd-node.mjs
node analyze.mjs
```

### Real Cloudflare

Local workerd does **not** enforce Worker Loader's `cpuMs` limit: a plugin that spins for 3 seconds at import passes under EmDash's 50 ms default (see the limits table). Only the edge can show where the production limit bites.

```sh
cd edge
npx wrangler deploy                      # needs Worker Loader access on the account
node run-edge.mjs https://emdash-plugin-size-bench.<account>.workers.dev
cd .. && node analyze.mjs                # adds a "Real Cloudflare" table
```

`edge/src/wrapper.js.txt` is EmDash 1.2.0's generated wrapper. It was exported by the harness's `wrapper` suite, so the edge worker loads exactly the module pair the runner loads, at limits of 50 ms (production) and 30 s.

## Caveats

- The local numbers come from one shared 4-vCPU cloud VM (Intel Xeon 2.1 GHz). Read them for shape and ratios, not as absolute production latency. Below about 30 ms, run-to-run noise (5 to 20 ms) is as large as the size effect.
- RSS per isolate is the workerd process growth divided by eight loaded isolates, so it includes allocator slack.
- The Node-hosting harness uses a minimal stand-in wrapper and shim module instead of EmDash's generated ones. Those are the same few KB for every plugin, so they do not change the size trend.
- Network and storage costs that also grow with size are not measured here: downloading the bundle from the Registry at install, and reading `backend.js` from R2 on every host cold start (`loadBundleFromR2`).
