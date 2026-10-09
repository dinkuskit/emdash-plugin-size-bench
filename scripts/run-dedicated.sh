#!/usr/bin/env bash
# Full benchmark run for a dedicated Linux machine (e.g. a Hetzner CCX box).
# Installs dependencies, fetches the corpus, builds payloads, quiets the CPU,
# runs every local suite and writes everything to $RESULTS_DIR.
#
#   RESULTS_DIR=results/hetzner-ccx33-fsn1 ./scripts/run-dedicated.sh
#
# Env: RESULTS_DIR (required), PASSES/COLD (default 5 x 20), PIN_CPUS (cores
# to run on, default all but CPU 0, which is left for the OS), HOST_LABEL.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${RESULTS_DIR:?set RESULTS_DIR, e.g. results/hetzner-ccx33-fsn1}"
export RESULTS_DIR
mkdir -p "$RESULTS_DIR"
log="$RESULTS_DIR/run.log"
exec > >(tee -a "$log") 2>&1

ncpu=$(nproc)
export PIN_CPUS="${PIN_CPUS:-$([ "$ncpu" -gt 2 ] && echo "1-$((ncpu - 1))" || echo "0-$((ncpu - 1))")}"
export HOST_LABEL="${HOST_LABEL:-$(basename "$RESULTS_DIR")}"

echo "== $(date -u +%FT%TZ) setup on $(hostname), $ncpu CPUs, pinning to $PIN_CPUS"
pnpm install --frozen-lockfile
node gen/fetch-corpus.mjs
node gen/build-payloads.mjs > "$RESULTS_DIR/payloads.txt"

# Quiet the CPU where we can: fixed "performance" governor, no turbo boost
# (boost makes timings depend on temperature). Both need root; skipped if not.
if command -v sudo >/dev/null && sudo -n true 2>/dev/null; then
	for g in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do [ -w "$g" ] || sudo sh -c "echo performance > $g" 2>/dev/null || true; done
	[ -e /sys/devices/system/cpu/intel_pstate/no_turbo ] && sudo sh -c 'echo 1 > /sys/devices/system/cpu/intel_pstate/no_turbo' || true
	[ -e /sys/devices/system/cpu/cpufreq/boost ] && sudo sh -c 'echo 0 > /sys/devices/system/cpu/cpufreq/boost' || true
else
	echo "no passwordless sudo: CPU governor and boost left as they are"
fi
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || echo "governor: not exposed (normal on VMs)"

pin() { taskset -c "$PIN_CPUS" "$@"; }

echo "== $(date -u +%FT%TZ) local suites (limits, matrix x ${PASSES:-5} passes, memory, multi)"
pin node run-all.mjs

echo "== $(date -u +%FT%TZ) Node hosting suite"
WORKERD_BIN=$(ls -d node_modules/.pnpm/@cloudflare+workerd-linux-64@*/node_modules/@cloudflare/workerd-linux-64/bin/workerd | head -1) \
	pin node node-host/bench-workerd-node.mjs

echo "== $(date -u +%FT%TZ) analysis"
node analyze.mjs > /dev/null
node report/build-report.mjs
cp report/plugin-size-benchmark.html "$RESULTS_DIR/report.html"
git checkout -- report/plugin-size-benchmark.html 2>/dev/null || true
echo "== $(date -u +%FT%TZ) done: $RESULTS_DIR/summary.md"
