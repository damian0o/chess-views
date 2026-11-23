// A small promise-based wrapper around the vendored Stockfish Web Worker (engine/).
// The engine speaks UCI over postMessage; this module serialises requests so the
// page can simply await a best move. No DOM, no network: the Worker only loads its own wasm.

const ENGINE_PATH = 'engine/stockfish-19-lite-single.js';

/** Kid-friendly levels: Stockfish's Skill Level (0..20) plus a shallow search depth. */
export const LEVELS = {
  learning: { skill: 0, depth: 4 },
  club: { skill: 4, depth: 8 },
  strong: { skill: 10, depth: 12 },
  master: { skill: 20, depth: 16 },
};

/**
 * Start the engine. Returns an object with:
 *   ready            promise that resolves once the engine answered `uciok` and `readyok`
 *   bestMove(fen, o) promise of { from, to, promotion, uci, mateIn, cp } for the side to move in `fen`;
 *                    o = { level: 'club' } or { skill, depth, movetime }, plus optional timeoutMs
 *   stop()           abandon the current search (its promise still resolves with whatever bestmove arrives)
 *   terminate()      kill the Worker
 */
export function createEngine({ path = ENGINE_PATH, timeoutMs = 10000 } = {}) {
  const worker = new Worker(path);
  const listeners = new Set();
  worker.onmessage = (e) => { const line = String(e.data); for (const fn of listeners) fn(line); };
  const send = (cmd) => worker.postMessage(cmd);
  const waitFor = (prefix, ms = timeoutMs) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { listeners.delete(fn); reject(new Error(`engine: no "${prefix}" within ${ms} ms`)); }, ms);
    const fn = (line) => { if (line.startsWith(prefix)) { clearTimeout(timer); listeners.delete(fn); resolve(line); } };
    listeners.add(fn);
  });

  let queue = Promise.resolve();
  const serial = (job) => { const run = queue.then(job, job); queue = run.catch(() => {}); return run; };

  const ready = serial(async () => {
    send('uci'); await waitFor('uciok');
    send('isready'); await waitFor('readyok');
  });

  let currentSkill = null;
  async function bestMove(fen, opts = {}) {
    const o = { ...(LEVELS[opts.level] || LEVELS.club), ...opts };
    return serial(async () => {
      if (o.skill !== currentSkill) { send(`setoption name Skill Level value ${o.skill}`); currentSkill = o.skill; }
      send('ucinewgame');
      send('isready'); await waitFor('readyok');
      let last = null;
      const info = (line) => { if (line.startsWith('info ') && line.includes(' score ')) last = line; };
      listeners.add(info);
      send(`position fen ${fen}`);
      send(o.movetime ? `go movetime ${o.movetime}` : `go depth ${o.depth}`);
      let line;
      try { line = await waitFor('bestmove', o.timeoutMs || timeoutMs); }
      catch (err) {
        // Give up on this search, but swallow its late `bestmove` so it cannot be mistaken for the next answer.
        send('stop'); await waitFor('bestmove', 2000).catch(() => {});
        throw err;
      } finally { listeners.delete(info); }
      const uci = line.split(/\s+/)[1];
      if (!uci || uci === '(none)') return null;
      const score = last ? /score (cp|mate) (-?\d+)/.exec(last) : null;
      return {
        uci, from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined,
        cp: score && score[1] === 'cp' ? Number(score[2]) : undefined,
        mateIn: score && score[1] === 'mate' ? Number(score[2]) : undefined,
      };
    });
  }

  return { ready, bestMove, stop: () => send('stop'), terminate: () => worker.terminate() };
}
