# Results summary

Cold = first call into a never-seen plugin in a new isolate (load + parse + run module top level + tiny route). Warm = later calls into the same isolate. Times in ms, medians over all passes.

Fixed cost of an isolate (smallest real plugin, cold): 11 ms.

| Shape | Cost per extra MB (ms) | Intercept (ms) |
|---|---:|---:|
| eager | 98.7 | 28.3 |
| lazy | 42.4 | 7.2 |
| data | 7.1 | 14.4 |


## real

| Payload | Size | Cold p50 | Cold p90 | Cold min | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| real-audit-log | 5 KB | 11 | 21 | 5 | 1 | 11 | 21 | 0 |
| real-webhook-notifier | 10 KB | 13 | 17 | 4 | 1 | 12 | 21 | 0 |
| real-atproto | 20 KB | 13 | 16 | 9 | 1 | 14 | 21 | 0 |
| real-dinkus-inventory-zodmini | 74 KB | 33 | 43 | 13 | 1 | 32 | 21 | 0 |
| real-dinkus-commerce | 114 KB | 19 | 44 | 10 | 1 | 18 | 21 | 0 |
| real-dinkus-inventory | 128 KB | 24 | 35 | 21 | 0 | 25 | 21 | 0 |

## eager

| Payload | Size | Cold p50 | Cold p90 | Cold min | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| eager-16k | 16 KB | 12 | 14 | 6 | 0 | 14 | 21 | 0 |
| eager-32k | 32 KB | 9 | 14 | 6 | 0 | 8 | 21 | 0 |
| eager-64k | 64 KB | 19 | 32 | 9 | 0 | 20 | 21 | 0 |
| eager-96k | 96 KB | 22 | 25 | 19 | 0 | 23 | 21 | 0 |
| eager-128k | 128 KB | 22 | 28 | 15 | 0 | 24 | 21 | 0 |
| eager-192k | 192 KB | 54 | 73 | 31 | 1 | 55 | 21 | 0 |
| eager-256k | 256 KB | 66 | 80 | 60 | 0 | 64 | 21 | 0 |
| eager-384k | 384 KB | 50 | 98 | 41 | 0 | 51 | 21 | 0 |
| eager-512k | 512 KB | 98 | 118 | 59 | 0 | 97 | 21 | 0 |
| eager-768k | 768 KB | 136 | 171 | 87 | 0 | 117 | 21 | 0 |
| eager-1024k | 1.0 MB | 172 | 222 | 109 | 1 | 139 | 21 | 0 |
| eager-1536k | 1.5 MB | 196 | 232 | 120 | 0 | 170 | 21 | 0 |
| eager-2048k | 2.0 MB | 199 | 280 | 132 | 0 | 227 | 21 | 0 |
| eager-4096k | 4.0 MB | 421 | 550 | 270 | 0 | 471 | 21 | 0 |
| eager-8192k | 8.0 MB | 813 | 931 | 612 | 0 | 843 | 21 | 0 |

## lazy

| Payload | Size | Cold p50 | Cold p90 | Cold min | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| lazy-16k | 16 KB | 12 | 16 | 10 | 0 | 13 | 21 | 0 |
| lazy-32k | 32 KB | 13 | 17 | 6 | 1 | 12 | 21 | 0 |
| lazy-64k | 64 KB | 14 | 18 | 5 | 0 | 16 | 21 | 0 |
| lazy-96k | 96 KB | 7 | 8 | 6 | 0 | 7 | 21 | 0 |
| lazy-128k | 128 KB | 15 | 21 | 7 | 0 | 11 | 21 | 0 |
| lazy-192k | 192 KB | 20 | 23 | 8 | 0 | 19 | 21 | 0 |
| lazy-256k | 256 KB | 15 | 27 | 13 | 0 | 14 | 21 | 0 |
| lazy-384k | 384 KB | 24 | 42 | 15 | 0 | 19 | 21 | 0 |
| lazy-512k | 512 KB | 23 | 47 | 18 | 1 | 23 | 21 | 0 |
| lazy-768k | 768 KB | 56 | 75 | 27 | 0 | 57 | 21 | 0 |
| lazy-1024k | 1.0 MB | 61 | 74 | 38 | 0 | 38 | 21 | 0 |
| lazy-1536k | 1.5 MB | 55 | 86 | 40 | 0 | 60 | 21 | 0 |
| lazy-2048k | 2.0 MB | 98 | 141 | 52 | 0 | 97 | 21 | 0 |
| lazy-4096k | 4.0 MB | 125 | 184 | 97 | 0 | 181 | 21 | 0 |
| lazy-8192k | 8.0 MB | 371 | 450 | 273 | 0 | 348 | 21 | 0 |

## data

| Payload | Size | Cold p50 | Cold p90 | Cold min | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| data-16k | 16 KB | 5 | 13 | 4 | 0 | 7 | 21 | 0 |
| data-32k | 32 KB | 10 | 16 | 5 | 0 | 13 | 21 | 0 |
| data-64k | 64 KB | 5 | 6 | 5 | 0 | 5 | 21 | 0 |
| data-96k | 96 KB | 12 | 15 | 4 | 0 | 11 | 21 | 0 |
| data-128k | 128 KB | 12 | 21 | 5 | 0 | 14 | 21 | 0 |
| data-192k | 192 KB | 12 | 17 | 6 | 0 | 14 | 21 | 0 |
| data-256k | 256 KB | 13 | 21 | 4 | 0 | 13 | 21 | 0 |
| data-384k | 384 KB | 8 | 24 | 5 | 0 | 8 | 21 | 0 |
| data-512k | 512 KB | 7 | 31 | 6 | 0 | 6 | 21 | 0 |
| data-768k | 768 KB | 32 | 46 | 5 | 0 | 33 | 21 | 0 |
| data-1024k | 1 MB | 39 | 49 | 9 | 0 | 33 | 21 | 0 |
| data-1536k | 1.5 MB | 17 | 56 | 9 | 0 | 45 | 21 | 0 |
| data-2048k | 2 MB | 55 | 84 | 10 | 0 | 58 | 21 | 0 |
| data-4096k | 4 MB | 75 | 129 | 21 | 0 | 76 | 21 | 0 |
| data-8192k | 8 MB | 48 | 181 | 39 | 0 | 175 | 21 | 0 |

## Memory (workerd resident memory added per loaded isolate)

| Payload | Size | Per isolate |
|---|---:|---:|
| real-audit-log | 5 KB | 1.2 MB |
| eager-64k | 64 KB | 1.5 MB |
| eager-128k | 128 KB | 2.1 MB |
| eager-256k | 256 KB | 5.2 MB |
| eager-512k | 512 KB | 5.5 MB |
| eager-1024k | 1024 KB | 13.4 MB |
| eager-2048k | 2.0 MB | 18.3 MB |
| eager-4096k | 4.0 MB | 35.4 MB |
| lazy-1024k | 1024 KB | 6.3 MB |
| lazy-4096k | 4.0 MB | 19.9 MB |
| data-1024k | 1 MB | 5.7 MB |
| data-4096k | 4 MB | 17.5 MB |

## Ten plugins on a cold site

| Payload | Size each | 10 in a row | 10 at once |
|---|---:|---:|---:|
| real-audit-log | 5 KB | 61 ms | 62 ms |
| real-dinkus-commerce | 114 KB | 109 ms | 108 ms |
| eager-128k | 128 KB | 172 ms | 169 ms |
| eager-256k | 256 KB | 418 ms | 649 ms |
| eager-512k | 512 KB | 656 ms | 815 ms |
| eager-1024k | 1024 KB | 1052 ms | 1132 ms |

## CPU limit check (local workerd)

| Plugin | Limits | Cold | Error | Second call | Error |
|---|---|---:|---|---:|---|
| quick | prod | 7 |  | 1 |  |
| quick | no-cpu-limit | 6 |  | 0 |  |
| spin-at-import | prod | 3155 |  | 1 |  |
| spin-at-import | no-cpu-limit | 2943 |  | 0 |  |
| spin-in-route | prod | 2087 |  | 2001 |  |
| spin-in-route | no-cpu-limit | 2125 |  | 2120 |  |

## Node hosting (standalone workerd, restart with all plugins)

| Payload | Size each | Plugins | Ready p50 | Memory |
|---|---:|---:|---:|---:|
| real-audit-log | 5 KB | 1 | 27 ms | 42 MB |
| real-audit-log | 5 KB | 5 | 42 ms | 48 MB |
| real-audit-log | 5 KB | 10 | 62 ms | 55 MB |
| real-audit-log | 5 KB | 20 | 106 ms | 70 MB |
| real-dinkus-commerce | 114 KB | 1 | 31 ms | 44 MB |
| real-dinkus-commerce | 114 KB | 5 | 56 ms | 54 MB |
| real-dinkus-commerce | 114 KB | 10 | 104 ms | 65 MB |
| real-dinkus-commerce | 114 KB | 20 | 168 ms | 86 MB |
| eager-128k | 128 KB | 1 | 35 ms | 45 MB |
| eager-128k | 128 KB | 5 | 82 ms | 54 MB |
| eager-128k | 128 KB | 10 | 163 ms | 67 MB |
| eager-128k | 128 KB | 20 | 361 ms | 93 MB |
| eager-256k | 256 KB | 1 | 63 ms | 50 MB |
| eager-256k | 256 KB | 5 | 214 ms | 75 MB |
| eager-256k | 256 KB | 10 | 467 ms | 107 MB |
| eager-256k | 256 KB | 20 | 895 ms | 156 MB |
| eager-512k | 512 KB | 1 | 99 ms | 54 MB |
| eager-512k | 512 KB | 5 | 313 ms | 91 MB |
| eager-512k | 512 KB | 10 | 641 ms | 127 MB |
| eager-512k | 512 KB | 20 | 1411 ms | 213 MB |
| eager-1024k | 1.0 MB | 1 | 126 ms | 62 MB |
| eager-1024k | 1.0 MB | 5 | 676 ms | 122 MB |
| eager-1024k | 1.0 MB | 10 | 1298 ms | 203 MB |
| eager-1024k | 1.0 MB | 20 | 2179 ms | 357 MB |
| eager-2048k | 2.0 MB | 1 | 190 ms | 78 MB |
| eager-2048k | 2.0 MB | 5 | 882 ms | 177 MB |
| eager-2048k | 2.0 MB | 10 | 1994 ms | 298 MB |
| eager-2048k | 2.0 MB | 20 | 3565 ms | 543 MB |
| eager-4096k | 4.0 MB | 1 | 332 ms | 94 MB |
| eager-4096k | 4.0 MB | 5 | 1667 ms | 276 MB |
| eager-4096k | 4.0 MB | 10 | 3274 ms | 502 MB |
| eager-4096k | 4.0 MB | 20 | 6825 ms | 949 MB |
| lazy-1024k | 1.0 MB | 1 | 60 ms | 52 MB |
| lazy-1024k | 1.0 MB | 5 | 187 ms | 85 MB |
| lazy-1024k | 1.0 MB | 10 | 346 ms | 132 MB |
| lazy-1024k | 1.0 MB | 20 | 694 ms | 217 MB |
| data-1024k | 1 MB | 1 | 34 ms | 51 MB |
| data-1024k | 1 MB | 5 | 81 ms | 83 MB |
| data-1024k | 1 MB | 10 | 176 ms | 130 MB |
| data-1024k | 1 MB | 20 | 325 ms | 213 MB |
