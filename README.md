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
| `real-combo-*` | Real plugin code above today's cap: the DinkusKit backends bundled by esbuild into one plugin whose routes are the union of theirs. Commerce + Inventory `zod/mini` (194 KB), Commerce + Inventory (249 KB), that pair twice (498 KB) and four times (1 MB). Repeated parts come from separate copies, so V8 parses and runs each copy, as it would for different code of the same size. |

Each synthetic size comes in all three shapes: 16, 32, 64, 96, 128, 192, 256, 384 and 512 KB, then 768 KB and 1, 1.5, 2, 4 and 8 MB.

## How it measures

`test/bench.test.ts` runs inside workerd through `@cloudflare/vitest-plugin`. It loads each payload with EmDash's production `CloudflareSandboxRunner` from `@emdash-cms/cloudflare@1.2.0`, which uses a real Worker Loader binding, the generated wrapper and the `PluginBridge` loopback. Every cold load gets a new isolate key and a unique source comment, so neither isolate reuse nor a source-keyed cache can help.

Each call is timed two ways. `Date.now()` inside workerd only advances on I/O and has 1 ms resolution, so it spans exactly one awaited RPC into the plugin isolate. Node's high-resolution clock, read through a service binding just before and after the same call, gives sub-millisecond resolution plus a small constant round-trip cost.

Every cold load in the size matrix is paired with a cold load of the smallest possible plugin, taken right next to it, alternating which goes first. The difference ("extra over the tiny plugin") cancels the isolate's fixed start-up cost, the round trip and slow drift in the machine, which leaves the cost that size adds. `analyze.mjs` reports its median with a 95% bootstrap range.

`run-all.mjs` runs the CPU-limit check, then five passes of the size matrix with payload order shuffled in each pass to spread drift, then the memory and ten-plugin suites. Each pass starts a fresh workerd process for every four payloads (`CHUNK`), because one process that has loaded more than about a thousand plugin isolates eventually runs out of heap and crashes; a chunk that dies is retried once in a new process. `analyze.mjs` pools the samples (100 cold loads per payload by default; the first published run used 21) and writes `summary.md` and `summary.json` next to the raw rows. `RESULTS_DIR` picks the folder (default `results/`), so runs on different machines sit side by side, each with a `machine.json`.

```sh
pnpm install
node gen/fetch-corpus.mjs      # downloads pinned libraries into corpus/
node gen/build-payloads.mjs
PASSES=5 COLD=20 node run-all.mjs
WORKERD_BIN=$(ls -d node_modules/.pnpm/@cloudflare+workerd-linux-64@*/node_modules/@cloudflare/workerd-linux-64/bin/workerd) \
  node node-host/bench-workerd-node.mjs
node analyze.mjs
```

### On a dedicated machine

For numbers with less noise, use a Linux box with dedicated cores (for example a Hetzner CCX server, which has AMD EPYC cores like many of Cloudflare's machines) and nothing else running:

```sh
RESULTS_DIR=results/hetzner-ccx33-ash ./scripts/run-dedicated.sh
```

The script installs everything, builds the payloads, sets the CPU governor to `performance` and turns off turbo boost when it has passwordless sudo, keeps CPU 0 free for the operating system, runs every local suite pinned to the other cores, and writes the raw rows, `summary.md`, `machine.json`, a `progress.log` and a `report.html` into `RESULTS_DIR`. Expect about an hour.

### Real Cloudflare

Local workerd does **not** enforce Worker Loader's `cpuMs` limit: a plugin whose busy loop at import runs for seconds still loads under EmDash's 50 ms default (see the limits table). Only the edge can show where the production limit bites.

```sh
cd edge
npx wrangler deploy                      # needs Worker Loader access on the account
MODE=all node run-edge.mjs https://emdash-plugin-size-bench.<account>.workers.dev
cd .. && node analyze.mjs                # adds the "Real Cloudflare" tables
```

`MODE=timing` loads every payload at the production limit (50 ms) and at 30 s. `MODE=bisect` finds, for an almost empty plugin (`tiny`, built into the worker as the baseline), each real plugin, and eager and lazy code up to 2 MB, the smallest `cpuMs` under which a fresh isolate still loads and answers (two of three fresh loads at each step). That number is the plugin's start-up CPU cost as Cloudflare counts it, which is what decides whether a bigger plugin fits under EmDash's 50 ms default.

The worker makes the plugin bridge from its own exports once per request and hands it to Worker Loader ready-made, as EmDash's runner does; if the bridge can't be made, the plugin gets a placeholder, which the benchmark routes never call. `GET /diag` shows what the runtime offered, and every `/run` answer records how the bridge was made.

`edge/src/wrapper.js.txt` is EmDash 1.2.0's generated wrapper. It was exported by the harness's `wrapper` suite, so the edge worker loads exactly the module pair the runner loads, at limits of 50 ms (production) and 30 s.

## Results

- `results/hetzner-ccx33-ash/`: a dedicated Hetzner CCX33 server (8 AMD EPYC-Milan vCPUs), every suite, 20 to 100 cold loads per payload with the outside clock and paired tiny-plugin loads. Its `NOTES.md` explains the uneven sample counts.
- `results/shared-xeon-4vcpu/`: a shared 4-vCPU Intel Xeon VM measured the same way, 30 cold loads per payload, size matrix and CPU-limit check only.
- `results/`: the first run, on a VM of the same Xeon kind with the older method (one workerd per pass, inside clock only, 21 cold loads per payload).

With the same method, the Hetzner server took 2.8 to 5.1 times as long as the Xeon VM for every payload, 4.1 times at the median, even for an almost empty plugin. So read the times for shape and for costs relative to an almost empty plugin; only the Real Cloudflare run gives production times.

`report/plugin-size-benchmark.html` shows the Hetzner run with the Xeon VM alongside. `COMPARE_DIR` adds a second machine's first-call times, and `EDGE_DIR` takes the Cloudflare tables from an edge run analysed in its own folder:

```sh
RESULTS_DIR=results/hetzner-ccx33-ash COMPARE_DIR=results/shared-xeon-4vcpu \
  COMPARE_LABEL="a shared 4-vCPU Intel Xeon cloud VM measured the same way" COMPARE_SHORT="Shared Xeon VM" \
  node report/build-report.mjs
```

## Caveats

- Absolute times depend heavily on the machine (see Results). In the first run (`results/`), below about 30 ms, run-to-run noise (5 to 20 ms) is as large as the size effect, and its plain-data times jump around; the Hetzner run's paired loads bring its 95% ranges to within a few percent.
- RSS per isolate is the workerd process growth divided by eight loaded isolates, so it includes allocator slack.
- The Node-hosting harness uses a minimal stand-in wrapper and shim module instead of EmDash's generated ones. Those are the same few KB for every plugin, so they do not change the size trend.
- Network and storage costs that also grow with size are not measured here: downloading the bundle from the Registry at install, and reading `backend.js` from R2 on every host cold start (`loadBundleFromR2`).
