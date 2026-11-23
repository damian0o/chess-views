# Engine files

Stockfish 19, lite network, single-threaded WebAssembly build.

- Source: nmrugg/stockfish.js, release v19.0.1
  (https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.1), built from
  official Stockfish (https://github.com/official-stockfish/Stockfish).
- Files: `stockfish-19-lite-single.js` (loader, 28,230 bytes) and
  `stockfish-19-lite-single.wasm` (engine with the embedded net, 1,845,971 bytes).
- SHA-256, pinned by `tests/engine.test.js`:
  - js   `ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a`
  - wasm `ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de`
- Licence: GNU GPL v3, see `COPYING.txt`. The page talks to the engine only
  through UCI text messages in a Web Worker; the app code lives outside this folder.

The loader was read before committing: it fetches only its own `.wasm` next to
it and never talks to the network otherwise. It runs without `SharedArrayBuffer`,
so it needs no cross-origin isolation headers and works on any static host.

To upgrade: download the two files of a newer release, update the hashes in
`tests/engine.test.js` and this file, and run `npm test`.
