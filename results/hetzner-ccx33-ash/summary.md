# Results summary

Cold = first call into a never-seen plugin in a new isolate (load + parse + run module top level + tiny route). Warm = later calls into the same isolate. Times in ms, medians over all passes.

Machine: hetzner-ccx33-ash AMD EPYC-Milan Processor, 8 CPUs, 31 GB, linux 6.8.0-139-generic x64, Node v22.23.3, governor n/a, pinned to CPUs 1-7.

Fixed cost of an isolate (smallest real plugin, cold): 24 ms.

"Extra" is each cold load minus a cold load of a tiny plugin taken right next to it, timed from outside the sandbox with a high-resolution clock; [a–b] is the 95% range of the median.

| Shape | Cost per MB (ms) | Intercept (ms) |
|---|---:|---:|
| real | 376.9 | 6.3 |
| eager | 297.8 | 80 |
| lazy | 106.9 | 6.2 |
| data | 15 | 2.8 |


## real

| Payload | Size | Extra p50 [95%] | Outer cold p50 [95%] | Cold p50 | Cold p90 | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| real-audit-log | 5 KB | 2.1 [2–2.2] | 26.8 [26.6–27.5] | 24 | 25 | 2 | 23 | 60 | 0 |
| real-webhook-notifier | 10 KB | 2.5 [2.4–2.6] | 27.2 [26.9–28.3] | 24 | 26 | 2 | 24 | 60 | 0 |
| real-atproto | 20 KB | 4.3 [4.2–4.4] | 30 [29.1–30.7] | 27 | 28 | 2 | 26 | 100 | 0 |
| real-dinkus-inventory-zodmini | 74 KB | 51.3 [50.3–51.9] | 77.5 [76.5–78.2] | 74 | 76 | 2 | 74 | 20 | 0 |
| real-dinkus-commerce | 114 KB | 21.2 [21.1–21.6] | 46.6 [46.1–46.8] | 43 | 46 | 2 | 43 | 60 | 0 |
| real-dinkus-inventory | 128 KB | 86.7 [86–89.7] | 111.8 [110.7–115] | 108 | 116 | 2 | 105 | 60 | 0 |
| real-combo-commerce-inventory-zodmini | 189 KB | 65 [64.6–65.4] | 90.6 [90.3–91.3] | 87 | 100 | 2 | 86 | 60 | 0 |
| real-combo-commerce-inventory | 243 KB | 104.1 [102–107.2] | 130.8 [127.3–133.8] | 126 | 135 | 2 | 126 | 80 | 0 |
| real-combo-x2 | 487 KB | 192.7 [190.5–194.1] | 217.9 [215.9–220.2] | 214 | 221 | 2 | 212 | 80 | 0 |
| real-combo-x4 | 978 KB | 360.4 [351.9–365.9] | 385 [377.9–391.2] | 381 | 400 | 2 | 386 | 40 | 0 |

## eager

| Payload | Size | Extra p50 [95%] | Outer cold p50 [95%] | Cold p50 | Cold p90 | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| eager-16k | 16 KB | 4.5 [4.3–4.8] | 29.5 [29.2–29.8] | 26 | 28 | 1 | 25 | 100 | 0 |
| eager-32k | 32 KB | 7.1 [6.7–8] | 30.7 [30.1–31.6] | 28 | 30 | 1 | 27 | 20 | 0 |
| eager-64k | 64 KB | 28.3 [28–28.7] | 53.9 [53.6–54.7] | 50 | 52 | 1 | 50 | 80 | 0 |
| eager-96k | 96 KB | 35.6 [35.3–36.1] | 61.6 [61.1–62] | 58 | 61 | 1 | 59 | 80 | 0 |
| eager-128k | 128 KB | 43.7 [43.6–43.9] | 68.4 [68.1–68.7] | 64 | 65 | 1 | 64 | 40 | 0 |
| eager-192k | 192 KB | 142.4 [140.5–144.6] | 168.4 [164.9–170.2] | 164 | 170 | 1 | 163 | 80 | 0 |
| eager-256k | 256 KB | 167.6 [165.2–170.4] | 194.5 [192.1–197.8] | 190 | 194 | 2 | 187 | 20 | 0 |
| eager-384k | 384 KB | 201.7 [200.9–202.7] | 226.4 [225.9–227.3] | 222 | 229 | 1 | 221 | 80 | 0 |
| eager-512k | 512 KB | 255 [252.8–256.3] | 280.7 [278.2–282.3] | 276 | 284 | 1 | 276 | 80 | 0 |
| eager-768k | 768 KB | 358.9 [351.6–360.9] | 385.4 [375.9–387.7] | 381 | 389 | 1 | 373 | 60 | 0 |
| eager-1024k | 1.0 MB | 480.4 [477.4–484.6] | 505.8 [502.7–510.4] | 501 | 514 | 1 | 498 | 60 | 0 |
| eager-1536k | 1.5 MB | 603.3 [595–606.5] | 629.7 [619.3–632.4] | 625 | 643 | 2 | 625 | 40 | 0 |
| eager-2048k | 2.0 MB | 778 [762.9–781.3] | 803.6 [787.4–806.7] | 799 | 826 | 1 | 826 | 40 | 0 |
| eager-4096k | 4.0 MB | 1358.6 [1353.5–1365.3] | 1384.3 [1377.7–1390.5] | 1380 | 1431 | 1 | 1370 | 60 | 0 |
| eager-8192k | 8.0 MB | 2361.4 [2348.3–2363.7] | 2384.2 [2371.5–2385.8] | 2379 | 2397 | 1 | 2364 | 20 | 0 |

## lazy

| Payload | Size | Extra p50 [95%] | Outer cold p50 [95%] | Cold p50 | Cold p90 | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lazy-16k | 16 KB | 2 [1.8–2.4] | 26.8 [26.6–27.1] | 23 | 24 | 1 | 24 | 40 | 0 |
| lazy-32k | 32 KB | 3.6 [3.4–3.8] | 29 [28.6–29.3] | 25 | 27 | 1 | 25 | 60 | 0 |
| lazy-64k | 64 KB | 7.7 [7.5–8.1] | 33.2 [32.6–33.9] | 30 | 31 | 1 | 30 | 40 | 0 |
| lazy-96k | 96 KB | 11.5 [11.4–11.8] | 36.9 [36.4–37.4] | 33 | 35 | 1 | 33 | 80 | 0 |
| lazy-128k | 128 KB | 15.3 [15.2–15.5] | 39.8 [39.5–40.1] | 36 | 39 | 1 | 36 | 80 | 0 |
| lazy-192k | 192 KB | 25.3 [25–25.7] | 50.3 [50.1–50.6] | 46 | 49 | 1 | 46 | 80 | 0 |
| lazy-256k | 256 KB | 34.9 [34.4–36.3] | 61.5 [60.4–62.5] | 57 | 61 | 2 | 58 | 40 | 0 |
| lazy-384k | 384 KB | 51 [50.7–52] | 76.5 [76.1–77.2] | 73 | 76 | 2 | 72 | 40 | 0 |
| lazy-512k | 512 KB | 66.8 [66.5–67.6] | 93.1 [92.1–93.7] | 89 | 92 | 1 | 87 | 40 | 0 |
| lazy-768k | 768 KB | 91.5 [90.7–92.3] | 118.1 [117–118.7] | 114 | 118 | 1 | 114 | 60 | 0 |
| lazy-1024k | 1.0 MB | 120.6 [120.2–121.2] | 145.8 [145–147.1] | 142 | 147 | 1 | 143 | 80 | 0 |
| lazy-1536k | 1.5 MB | 165.4 [162.9–167.5] | 191.9 [188–192.8] | 188 | 193 | 1 | 178 | 60 | 0 |
| lazy-2048k | 2.0 MB | 221.6 [219.2–222.5] | 247.1 [245.2–248.2] | 243 | 253 | 1 | 237 | 60 | 0 |
| lazy-4096k | 4.0 MB | 438.9 [434.5–442.8] | 463.5 [458.6–469] | 460 | 483 | 1 | 437 | 60 | 0 |
| lazy-8192k | 8.0 MB | 857.1 [843.2–867.4] | 882 [871.3–892.3] | 878 | 922 | 1 | 886 | 80 | 0 |

## data

| Payload | Size | Extra p50 [95%] | Outer cold p50 [95%] | Cold p50 | Cold p90 | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| data-16k | 16 KB | 0.6 [0–0.7] | 24.8 [24.4–25.2] | 21 | 24 | 1 | 21 | 20 | 0 |
| data-32k | 32 KB | 0.8 [0.5–1.3] | 27.3 [24.1–27.8] | 23 | 25 | 1 | 24 | 40 | 0 |
| data-64k | 64 KB | 1.8 [1.4–2] | 27.8 [27.4–28] | 24 | 26 | 2 | 24 | 60 | 0 |
| data-96k | 96 KB | 2.1 [1.9–2.2] | 26 [25.7–26.3] | 23 | 25 | 1 | 22 | 60 | 0 |
| data-128k | 128 KB | 3.2 [3.1–3.5] | 27.6 [27.3–27.9] | 25 | 26 | 1 | 24 | 60 | 0 |
| data-192k | 192 KB | 4.6 [4.4–4.9] | 31.6 [31–31.9] | 27 | 29 | 2 | 27 | 40 | 0 |
| data-256k | 256 KB | 6.1 [5.9–6.4] | 30.7 [30.4–30.9] | 27 | 29 | 1 | 26 | 100 | 0 |
| data-384k | 384 KB | 10 [9.3–10.3] | 34.6 [34.2–35.1] | 31 | 33 | 1 | 30 | 60 | 0 |
| data-512k | 512 KB | 11.2 [10.7–13.3] | 36.6 [34.9–37.3] | 33 | 35 | 1 | 31 | 20 | 0 |
| data-768k | 768 KB | 16.8 [14.3–18.9] | 40.9 [37.8–42.1] | 38 | 40 | 1 | 33 | 40 | 0 |
| data-1024k | 1 MB | 20.2 [19.7–21.6] | 43.6 [42.7–45.1] | 40 | 43 | 1 | 37 | 60 | 0 |
| data-1536k | 1.5 MB | 29.3 [27–30] | 52.1 [51–53.1] | 49 | 51 | 1 | 47 | 40 | 0 |
| data-2048k | 2 MB | 35.8 [34.9–37] | 59.1 [57.6–60] | 56 | 62 | 1 | 53 | 60 | 0 |
| data-4096k | 4 MB | 62.3 [61.1–67.6] | 86.2 [84.5–93.9] | 83 | 94 | 2 | 94 | 40 | 0 |
| data-8192k | 8 MB | 120.8 [119.2–122.7] | 144.5 [142.8–147.9] | 140 | 190 | 1 | 138 | 60 | 0 |

## Memory (workerd resident memory added per loaded isolate)

| Payload | Size | Per isolate |
|---|---:|---:|
| real-audit-log | 5 KB | 1.2 MB |
| real-dinkus-commerce | 114 KB | 2.2 MB |
| real-combo-commerce-inventory | 243 KB | 3.8 MB |
| real-combo-x2 | 487 KB | 8.3 MB |
| real-combo-x4 | 978 KB | 13.4 MB |
| eager-64k | 64 KB | 1.6 MB |
| eager-128k | 128 KB | 2.2 MB |
| eager-256k | 256 KB | 5.3 MB |
| eager-512k | 512 KB | 7.3 MB |
| eager-1024k | 1024 KB | 10.9 MB |
| eager-2048k | 2.0 MB | 18.2 MB |
| eager-4096k | 4.0 MB | 32.9 MB |
| lazy-1024k | 1024 KB | 6.3 MB |
| lazy-4096k | 4.0 MB | 20.8 MB |
| data-1024k | 1 MB | 5.7 MB |
| data-4096k | 4 MB | 18.9 MB |

## Ten plugins on a cold site

| Payload | Size each | 10 in a row | 10 at once |
|---|---:|---:|---:|
| real-audit-log | 5 KB | 315 ms | 275 ms |
| real-dinkus-commerce | 114 KB | 493 ms | 448 ms |
| real-combo-commerce-inventory | 243 KB | 1320 ms | 1309 ms |
| real-combo-x2 | 487 KB | 2136 ms | 2091 ms |
| eager-128k | 128 KB | 725 ms | 680 ms |
| eager-256k | 256 KB | 1957 ms | 1896 ms |
| eager-512k | 512 KB | 2908 ms | 2806 ms |
| eager-1024k | 1024 KB | 5245 ms | 5062 ms |

## CPU limit check (local workerd)

| Plugin | Limits | Cold | Error | Second call | Error |
|---|---|---:|---|---:|---|
| quick | prod | 23 |  | 1 |  |
| quick | no-cpu-limit | 20 |  | 1 |  |
| spin-at-import | prod | 15733 |  | 2 |  |
| spin-at-import | no-cpu-limit | 15729 |  | 1 |  |
| spin-in-route | prod | 720 |  | 696 |  |
| spin-in-route | no-cpu-limit | 725 |  | 698 |  |

## Node hosting (standalone workerd, restart with all plugins)

| Payload | Size each | Plugins | Ready p50 | Memory |
|---|---:|---:|---:|---:|
| real-audit-log | 5 KB | 1 | 89 ms | 42 MB |
| real-audit-log | 5 KB | 5 | 162 ms | 48 MB |
| real-audit-log | 5 KB | 10 | 247 ms | 55 MB |
| real-audit-log | 5 KB | 20 | 436 ms | 70 MB |
| real-dinkus-commerce | 114 KB | 1 | 111 ms | 45 MB |
| real-dinkus-commerce | 114 KB | 5 | 254 ms | 54 MB |
| real-dinkus-commerce | 114 KB | 10 | 451 ms | 66 MB |
| real-dinkus-commerce | 114 KB | 20 | 819 ms | 87 MB |
| real-combo-commerce-inventory | 243 KB | 1 | 205 ms | 55 MB |
| real-combo-commerce-inventory | 243 KB | 5 | 701 ms | 79 MB |
| real-combo-commerce-inventory | 243 KB | 10 | 1337 ms | 109 MB |
| real-combo-commerce-inventory | 243 KB | 20 | 2662 ms | 160 MB |
| real-combo-x2 | 487 KB | 1 | 307 ms | 58 MB |
| real-combo-x2 | 487 KB | 5 | 1148 ms | 99 MB |
| real-combo-x2 | 487 KB | 10 | 2342 ms | 140 MB |
| real-combo-x2 | 487 KB | 20 | 4559 ms | 225 MB |
| eager-128k | 128 KB | 1 | 143 ms | 46 MB |
| eager-128k | 128 KB | 5 | 390 ms | 55 MB |
| eager-128k | 128 KB | 10 | 693 ms | 68 MB |
| eager-128k | 128 KB | 20 | 1383 ms | 95 MB |
| eager-256k | 256 KB | 1 | 261 ms | 50 MB |
| eager-256k | 256 KB | 5 | 989 ms | 76 MB |
| eager-256k | 256 KB | 10 | 1964 ms | 108 MB |
| eager-256k | 256 KB | 20 | 3793 ms | 157 MB |
| eager-512k | 512 KB | 1 | 367 ms | 54 MB |
| eager-512k | 512 KB | 5 | 1490 ms | 92 MB |
| eager-512k | 512 KB | 10 | 2959 ms | 128 MB |
| eager-512k | 512 KB | 20 | 6096 ms | 215 MB |
| eager-1024k | 1.0 MB | 1 | 616 ms | 63 MB |
| eager-1024k | 1.0 MB | 5 | 2702 ms | 123 MB |
| eager-1024k | 1.0 MB | 10 | 5513 ms | 204 MB |
| eager-1024k | 1.0 MB | 20 | 11223 ms | 358 MB |
| eager-2048k | 2.0 MB | 1 | 974 ms | 80 MB |
| eager-2048k | 2.0 MB | 5 | 4339 ms | 178 MB |
| eager-2048k | 2.0 MB | 10 | 8386 ms | 300 MB |
| eager-2048k | 2.0 MB | 20 | 16910 ms | 533 MB |
| eager-4096k | 4.0 MB | 1 | 1580 ms | 95 MB |
| eager-4096k | 4.0 MB | 5 | 7833 ms | 277 MB |
| eager-4096k | 4.0 MB | 10 | 15546 ms | 492 MB |
| eager-4096k | 4.0 MB | 20 | 31251 ms | 755 MB |
| lazy-1024k | 1.0 MB | 1 | 245 ms | 54 MB |
| lazy-1024k | 1.0 MB | 5 | 887 ms | 85 MB |
| lazy-1024k | 1.0 MB | 10 | 1761 ms | 133 MB |
| lazy-1024k | 1.0 MB | 20 | 3448 ms | 218 MB |
| data-1024k | 1 MB | 1 | 137 ms | 52 MB |
| data-1024k | 1 MB | 5 | 406 ms | 84 MB |
| data-1024k | 1 MB | 10 | 774 ms | 131 MB |
| data-1024k | 1 MB | 20 | 1534 ms | 215 MB |
