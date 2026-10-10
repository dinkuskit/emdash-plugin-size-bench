# Shared Xeon VM run, 2026-10-10

- **Machine**: a shared 4-vCPU Intel Xeon (2.1 GHz) cloud VM, 16 GB, Linux 6.18, Node 22.22 (`machine.json`). The same kind of VM as the first run in `results/`, but a fresh one.
- **What ran**: `PASSES=3 COLD=10 CHUNK=4 SUITES=limits,matrix node run-all.mjs`, from 00:35 to 00:50 UTC: the CPU-limit check and three passes of the size matrix, 30 cold loads per payload with the same outside clock and paired tiny-plugin loads as the Hetzner run. No crashes and no errors. Memory, ten plugins and Node hosting were not rerun here.
- **Why it exists**: to compare machines with one method. The Hetzner CCX33 run (`results/hetzner-ccx33-ash/`) took 2.8 to 5.1 times as long as this VM for every payload, 4.1 times at the median, including an almost empty plugin (26.8 ms there, 7.1 ms here) and plain data.
- **The first run**: `results/` came from a VM of this kind with the older method (one workerd per pass, workerd's 1 ms clock, 21 loads). Its times are mostly higher than this run's, and its plain-data times jump around (768 KB 32 ms, 1.5 MB 17 ms), so compare against this folder instead.
- **CPU-limit check**: the busy-loop plugins succeeded under EmDash's 50 ms limit here too. How long a fixed busy loop takes depends on when V8 optimises it, so those times vary a lot between runs and machines.
