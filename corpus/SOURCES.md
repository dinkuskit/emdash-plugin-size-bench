# Corpus sources

`node gen/fetch-corpus.mjs` downloads these from npm and writes `corpus/`. Builds are copied as published; `typescript.js` and `acorn.js` are minified with esbuild 0.28.2 (`minify: true`). The SHA-256 column is what the benchmark run used, so a fresh fetch can be checked byte for byte with `sha256sum corpus/*.js`.

| File | Package | Path in package | Bytes | SHA-256 |
|---|---|---|---:|---|
| dayjs.js | dayjs@1.11.23 | dayjs.min.js | 7161 | `0198dd0b1f760cded169c7e7ff7eaf56bc36c4c22c7c9b7c683e59437ed8700e` |
| marked.js | marked@12.0.2 | marked.min.js | 35479 | `15fabce5b65898b32b03f5ed25e9f891a729ad4c0d6d877110a7744aa847a894` |
| moment.js | moment@2.31.0 | min/moment.min.js | 60887 | `c111ad2e4447c253765e679bb4a40ba91a3e23d80b4b69d603a0fd25164cb9de` |
| lodash.js | lodash@4.18.1 | lodash.min.js | 73234 | `a8d7e6291ad80256f976ace90824a71018d2f706992c9107b20bdced97bee27b` |
| luxon.js | luxon@3.7.2 | build/global/luxon.min.js | 81694 | `516c5fea5c82bdf1fb5c472b9aafdca9cda6dc806b2c12ce9d62c2e0fc348104` |
| rxjs.js | rxjs@7.8.2 | dist/bundles/rxjs.umd.min.js | 88060 | `2152e8a794982170a4c1dae32a74e31a81218fd74781c27b0d628a02bf532413` |
| handlebars.js | handlebars@4.7.10 | dist/handlebars.min.js | 90836 | `e3be13921b1a0a6d7d7c72e4f561cc638e608c2476fd9b1919b72707e6933b62` |
| date-fns.js | date-fns@3.6.0 | cdn.min.js | 98562 | `ddb162ac5f467bc138b5a2f205cc0e1909488dbb1e3a36f3eb748e7d04b400b3` |
| acorn.js | acorn@8.19.0 | dist/acorn.js (minified) | 122259 | `9649597a8739482c4dc0c4ceaf99f1d258b2bd9b63e962ac9a397a674531d04b` |
| three.js | three@0.160.1 | build/three.min.js | 669884 | `170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa` |
| typescript.js | typescript@5.6.3 | lib/typescript.js (minified) | 3521192 | `223d3c5b76a0d2e17e38e29928ab904a63ac97aa1811d9ea4b2baaa6ef5cc9d1` |
