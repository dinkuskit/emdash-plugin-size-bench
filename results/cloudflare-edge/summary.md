# Results summary

Cold = first call into a never-seen plugin in a new isolate (load + parse + run module top level + tiny route). Warm = later calls into the same isolate. Times in ms, medians over all passes.

Fixed cost of an isolate (smallest real plugin, cold): 0 ms.

"Extra" is each cold load minus a cold load of a tiny plugin taken right next to it, timed from outside the sandbox with a high-resolution clock; [a–b] is the 95% range of the median.

| Shape | Cost per MB (ms) | Intercept (ms) |
|---|---:|---:|


## real

| Payload | Size | Extra p50 [95%] | Outer cold p50 [95%] | Cold p50 | Cold p90 | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## eager

| Payload | Size | Extra p50 [95%] | Outer cold p50 [95%] | Cold p50 | Cold p90 | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## lazy

| Payload | Size | Extra p50 [95%] | Outer cold p50 [95%] | Cold p50 | Cold p90 | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## data

| Payload | Size | Extra p50 [95%] | Outer cold p50 [95%] | Cold p50 | Cold p90 | Warm p50 | Same-source cold p50 | Samples | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## Real Cloudflare

| Payload | Size | CPU limit | Cold p50 | Cold p90 | Warm p50 | Failed |
|---|---:|---:|---:|---:|---:|---:|
| data-16k | 16 KB | 50 | 15 | 17 | 2 | 0/15 |
| data-16k | 16 KB | 30000 | 14 | 17 | 2 | 0/15 |
| data-32k | 32 KB | 50 | 15 | 19 | 2 | 0/15 |
| data-32k | 32 KB | 30000 | 16 | 17 | 2 | 0/15 |
| data-64k | 64 KB | 50 | 16 | 18 | 2 | 0/15 |
| data-64k | 64 KB | 30000 | 16 | 21 | 3 | 0/15 |
| data-96k | 96 KB | 50 | 16 | 18 | 2 | 0/15 |
| data-96k | 96 KB | 30000 | 17 | 19 | 2 | 0/15 |
| data-128k | 128 KB | 50 | 17 | 21 | 2 | 0/15 |
| data-128k | 128 KB | 30000 | 17 | 22 | 2 | 0/15 |
| data-192k | 192 KB | 50 | 18 | 21 | 2 | 0/15 |
| data-192k | 192 KB | 30000 | 17 | 20 | 2 | 0/15 |
| data-256k | 256 KB | 50 | 17 | 19 | 2 | 0/15 |
| data-256k | 256 KB | 30000 | 18 | 24 | 2 | 0/15 |
| data-384k | 384 KB | 50 | 19 | 25 | 2 | 0/15 |
| data-384k | 384 KB | 30000 | 19 | 21 | 2 | 0/15 |
| data-512k | 512 KB | 50 | 21 | 27 | 2 | 0/15 |
| data-512k | 512 KB | 30000 | 22 | 25 | 2 | 0/15 |
| data-768k | 768 KB | 50 | 23 | 36 | 2 | 0/15 |
| data-768k | 768 KB | 30000 | 23 | 37 | 3 | 0/15 |
| data-1024k | 1 MB | 50 | 24 | 32 | 2 | 0/15 |
| data-1024k | 1 MB | 30000 | 24 | 33 | 2 | 0/15 |
| data-1536k | 1.5 MB | 50 | 32 | 40 | 2 | 0/15 |
| data-1536k | 1.5 MB | 30000 | 34 | 60 | 2 | 0/15 |
| data-2048k | 2 MB | 50 | 41 | 72 | 2 | 0/15 |
| data-2048k | 2 MB | 30000 | 36 | 62 | 2 | 0/15 |
| data-4096k | 4 MB | 50 | 60 | 81 | 2 | 0/15 |
| data-4096k | 4 MB | 30000 | 56 | 73 | 2 | 0/15 |
| data-8192k | 8 MB | 50 | 120 | 247 | 2 | 0/15 |
| data-8192k | 8 MB | 30000 | 115 | 269 | 2 | 0/15 |
| eager-16k | 16 KB | 50 | 17 | 19 | 2 | 0/15 |
| eager-16k | 16 KB | 30000 | 16 | 20 | 2 | 0/15 |
| eager-32k | 32 KB | 50 | 19 | 22 | 3 | 0/15 |
| eager-32k | 32 KB | 30000 | 19 | 24 | 2 | 0/15 |
| eager-64k | 64 KB | 50 | 29 | 32 | 3 | 0/15 |
| eager-64k | 64 KB | 30000 | 25 | 30 | 3 | 0/15 |
| eager-96k | 96 KB | 50 | 27 | 31 | 2 | 0/15 |
| eager-96k | 96 KB | 30000 | 28 | 34 | 2 | 0/15 |
| eager-128k | 128 KB | 50 | 30 | 39 | 2 | 0/15 |
| eager-128k | 128 KB | 30000 | 29 | 41 | 3 | 0/15 |
| eager-192k | 192 KB | 50 | 55 | 62 | 2 | 0/15 |
| eager-192k | 192 KB | 30000 | 51 | 57 | 2 | 0/15 |
| eager-256k | 256 KB | 50 | 61 | 70 | 3 | 0/15 |
| eager-256k | 256 KB | 30000 | 56 | 68 | 2 | 0/15 |
| eager-384k | 384 KB | 50 | 67 | 82 | 2 | 0/15 |
| eager-384k | 384 KB | 30000 | 69 | 86 | 2 | 0/15 |
| eager-512k | 512 KB | 50 | 96 | 147 | 3 | 0/15 |
| eager-512k | 512 KB | 30000 | 86 | 115 | 2 | 0/15 |
| eager-768k | 768 KB | 50 | 110 | 130 | 2 | 0/15 |
| eager-768k | 768 KB | 30000 | 110 | 150 | 2 | 0/15 |
| eager-1024k | 1.0 MB | 50 | 150 | 164 | 2 | 0/15 |
| eager-1024k | 1.0 MB | 30000 | 139 | 166 | 2 | 0/15 |
| eager-1536k | 1.5 MB | 50 | 189 | 220 | 2 | 0/15 |
| eager-1536k | 1.5 MB | 30000 | 180 | 210 | 2 | 0/15 |
| eager-2048k | 2.0 MB | 50 | 232 | 281 | 3 | 0/15 |
| eager-2048k | 2.0 MB | 30000 | 232 | 286 | 3 | 0/15 |
| eager-4096k | 4.0 MB | 50 | 399 | 465 | 2 | 0/15 |
| eager-4096k | 4.0 MB | 30000 | 427 | 518 | 3 | 0/15 |
| eager-8192k | 8.0 MB | 50 | 763 | 900 | 2 | 0/15 |
| eager-8192k | 8.0 MB | 30000 | 767 | 883 | 2 | 0/15 |
| lazy-16k | 16 KB | 50 | 17 | 19 | 2 | 0/15 |
| lazy-16k | 16 KB | 30000 | 14 | 18 | 2 | 0/15 |
| lazy-32k | 32 KB | 50 | 16 | 23 | 3 | 0/15 |
| lazy-32k | 32 KB | 30000 | 17 | 19 | 2 | 0/15 |
| lazy-64k | 64 KB | 50 | 20 | 23 | 2 | 0/15 |
| lazy-64k | 64 KB | 30000 | 18 | 21 | 2 | 0/15 |
| lazy-96k | 96 KB | 50 | 20 | 24 | 2 | 0/15 |
| lazy-96k | 96 KB | 30000 | 20 | 22 | 2 | 0/15 |
| lazy-128k | 128 KB | 50 | 20 | 25 | 2 | 0/15 |
| lazy-128k | 128 KB | 30000 | 22 | 26 | 2 | 0/15 |
| lazy-192k | 192 KB | 50 | 26 | 32 | 2 | 0/15 |
| lazy-192k | 192 KB | 30000 | 26 | 31 | 2 | 0/15 |
| lazy-256k | 256 KB | 50 | 29 | 42 | 2 | 0/15 |
| lazy-256k | 256 KB | 30000 | 29 | 38 | 2 | 0/15 |
| lazy-384k | 384 KB | 50 | 37 | 46 | 2 | 0/15 |
| lazy-384k | 384 KB | 30000 | 34 | 43 | 2 | 0/15 |
| lazy-512k | 512 KB | 50 | 42 | 47 | 2 | 0/15 |
| lazy-512k | 512 KB | 30000 | 44 | 58 | 2 | 0/15 |
| lazy-768k | 768 KB | 50 | 51 | 70 | 2 | 0/15 |
| lazy-768k | 768 KB | 30000 | 54 | 75 | 2 | 0/15 |
| lazy-1024k | 1.0 MB | 50 | 70 | 86 | 2 | 0/15 |
| lazy-1024k | 1.0 MB | 30000 | 63 | 86 | 2 | 0/15 |
| lazy-1536k | 1.5 MB | 50 | 91 | 126 | 2 | 0/15 |
| lazy-1536k | 1.5 MB | 30000 | 86 | 111 | 2 | 0/15 |
| lazy-2048k | 2.0 MB | 50 | 117 | 151 | 3 | 0/15 |
| lazy-2048k | 2.0 MB | 30000 | 107 | 170 | 2 | 0/15 |
| lazy-4096k | 4.0 MB | 50 | 224 | 298 | 2 | 0/15 |
| lazy-4096k | 4.0 MB | 30000 | 212 | 302 | 2 | 0/15 |
| lazy-8192k | 8.0 MB | 50 | 432 | 524 | 2 | 0/15 |
| lazy-8192k | 8.0 MB | 30000 | 424 | 496 | 2 | 0/15 |
| real-audit-log | 5 KB | 50 | 14 | 16 | 2 | 0/15 |
| real-audit-log | 5 KB | 30000 | 16 | 18 | 3 | 0/15 |
| real-webhook-notifier | 10 KB | 50 | 15 | 19 | 2 | 0/15 |
| real-webhook-notifier | 10 KB | 30000 | 17 | 20 | 3 | 0/15 |
| real-atproto | 20 KB | 50 | 16 | 20 | 3 | 0/15 |
| real-atproto | 20 KB | 30000 | 16 | 20 | 2 | 0/15 |
| real-dinkus-inventory-zodmini | 74 KB | 50 | 39 | 47 | 2 | 0/15 |
| real-dinkus-inventory-zodmini | 74 KB | 30000 | 37 | 41 | 2 | 0/15 |
| real-dinkus-commerce | 114 KB | 50 | 23 | 29 | 2 | 0/15 |
| real-dinkus-commerce | 114 KB | 30000 | 24 | 29 | 2 | 0/15 |
| real-dinkus-inventory | 128 KB | 50 | 59 | 75 | 3 | 0/15 |
| real-dinkus-inventory | 128 KB | 30000 | 63 | 76 | 3 | 0/15 |
| real-combo-commerce-inventory-zodmini | 189 KB | 50 | 46 | 56 | 2 | 0/15 |
| real-combo-commerce-inventory-zodmini | 189 KB | 30000 | 49 | 56 | 3 | 0/15 |
| real-combo-commerce-inventory | 243 KB | 50 | 67 | 77 | 2 | 0/15 |
| real-combo-commerce-inventory | 243 KB | 30000 | 68 | 75 | 2 | 0/15 |
| real-combo-x2 | 487 KB | 50 | 112 | 134 | 2 | 0/15 |
| real-combo-x2 | 487 KB | 30000 | 110 | 136 | 2 | 0/15 |
| real-combo-x4 | 978 KB | 50 | 195 | 225 | 2 | 0/15 |
| real-combo-x4 | 978 KB | 30000 | 209 | 231 | 2 | 0/15 |
| tiny | 0 KB | 50 | 14 | 19 | 2 | 0/15 |
| tiny | 0 KB | 30000 | 14 | 16 | 2 | 0/15 |

## Real Cloudflare: smallest CPU limit that still loads

EmDash's default is 50 ms. Each step is three fresh loads; a limit counts as enough when two of three succeed.

| Payload | Size | Smallest cpuMs | Note |
|---|---:|---:|---|
| eager-16k | 16 KB | 1 |  |
| eager-32k | 32 KB | 1 |  |
| eager-64k | 64 KB | 1 |  |
| eager-96k | 96 KB | 1 |  |
| eager-128k | 128 KB | 1 |  |
| eager-192k | 192 KB | 1 |  |
| eager-256k | 256 KB | 1 |  |
| eager-384k | 384 KB | 1 |  |
| eager-512k | 512 KB | 1 |  |
| eager-768k | 768 KB | 1 |  |
| eager-1024k | 1.0 MB | 1 |  |
| eager-1536k | 1.5 MB | 1 |  |
| eager-2048k | 2.0 MB | 1 |  |
| lazy-16k | 16 KB | 1 |  |
| lazy-32k | 32 KB | 1 |  |
| lazy-64k | 64 KB | 1 |  |
| lazy-96k | 96 KB | 1 |  |
| lazy-128k | 128 KB | 1 |  |
| lazy-192k | 192 KB | 1 |  |
| lazy-256k | 256 KB | 1 |  |
| lazy-384k | 384 KB | 1 |  |
| lazy-512k | 512 KB | 1 |  |
| lazy-768k | 768 KB | 1 |  |
| lazy-1024k | 1.0 MB | 1 |  |
| lazy-1536k | 1.5 MB | 1 |  |
| lazy-2048k | 2.0 MB | 1 |  |
| real-audit-log | 5 KB | 1 |  |
| real-webhook-notifier | 10 KB | 1 |  |
| real-atproto | 20 KB | 1 |  |
| real-dinkus-inventory-zodmini | 74 KB | 1 |  |
| real-dinkus-commerce | 114 KB | 1 |  |
| real-dinkus-inventory | 128 KB | 1 |  |
| real-combo-commerce-inventory-zodmini | 189 KB | 1 |  |
| real-combo-commerce-inventory | 243 KB | 1 |  |
| real-combo-x2 | 487 KB | 1 |  |
| real-combo-x4 | 978 KB | 1 |  |
| tiny | 0 KB | 1 |  |

## Real Cloudflare: is the limit enforced?

Busy-loop plugins: n million steps of the local limits suite's loop, in the route or at import.

| Payload | Where | Steps (M) | CPU limit | Cold p50 | Cold failed | Warm p50 | Warm failed | First error |
|---|---|---:|---:|---:|---:|---:|---:|---|
| spin-import-2 | import | 2 | 50 | 29 | 0/3 | 2 | 0/2 |  |
| spin-import-2 | import | 2 | 30000 | 27 | 0/3 | 2 | 0/2 |  |
| spin-import-10 | import | 10 | 50 | 86 | 0/3 | 2 | 0/2 |  |
| spin-import-10 | import | 10 | 30000 | 86 | 0/3 | 2 | 0/2 |  |
| spin-import-30 | import | 30 | 50 | 262 | 0/3 | 2 | 0/2 |  |
| spin-import-30 | import | 30 | 30000 | 267 | 0/3 | 2 | 0/2 |  |
| spin-import-100 | import | 100 | 50 | 846 | 0/3 | 0 | 0/2 |  |
| spin-import-100 | import | 100 | 30000 | 745 | 0/3 | 2 | 0/2 |  |
| spin-import-300 | import | 300 | 50 | 2605 | 0/3 | 1 | 0/2 |  |
| spin-import-300 | import | 300 | 30000 | 2582 | 0/3 | 3 | 0/2 |  |
| spin-import-1000 | import | 1000 | 50 | 8154 | 0/3 | 2 | 0/2 |  |
| spin-import-1000 | import | 1000 | 30000 | 8201 | 0/3 | 1 | 0/2 |  |
| spin-route-2 | route | 2 | 50 | 21 | 0/3 | 13 | 0/2 |  |
| spin-route-2 | route | 2 | 30000 | 22 | 0/3 | 12 | 0/2 |  |
| spin-route-10 | route | 10 | 50 | 65 | 0/3 | 52 | 0/2 |  |
| spin-route-10 | route | 10 | 30000 | 62 | 0/3 | 54 | 0/2 |  |
| spin-route-30 | route | 30 | 50 | 166 | 0/3 | 138 | 0/2 |  |
| spin-route-30 | route | 30 | 30000 | 169 | 0/3 | 137 | 0/2 |  |
| spin-route-100 | route | 100 | 50 | 482 | 0/3 | 459 | 0/2 |  |
| spin-route-100 | route | 100 | 30000 | 483 | 0/3 | 446 | 0/2 |  |
| spin-route-300 | route | 300 | 50 | 1535 | 0/3 | 1581 | 1/2 | Worker exceeded CPU time limit. |
| spin-route-300 | route | 300 | 30000 | 1457 | 0/3 | 1611 | 0/2 |  |

## Real Cloudflare: smallest CPU limit for the busy loops

| Payload | Smallest cpuMs | Note |
|---|---:|---|
| spin-import-30 | 1 |  |
| spin-import-300 | 1 |  |
| spin-route-30 | 1 |  |
| spin-route-300 | 1 |  |
