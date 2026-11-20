// Pure position-analysis functions over a plain 8x8 board array.
// Board = Cell[8][8], row 0 = rank 8, col 0 = file a.
// Cell = null | { square: 'e4', type: 'p'|'n'|'b'|'r'|'q'|'k', color: 'w'|'b' }
// (identical to chess.js board()).

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FILES = 'abcdefgh';

export function squareName(row, col) {
  return FILES[col] + (8 - row);
}

export function squareIndex(name) {
  return { row: 8 - Number(name[1]), col: FILES.indexOf(name[0]) };
}

export function squareColor(name) {
  const { row, col } = squareIndex(name);
  return (row + col) % 2 === 0 ? 'light' : 'dark';
}

export function boardFromFen(fen) {
  const placement = fen.trim().split(/\s+/)[0];
  return placement.split('/').map((rankStr, row) => {
    const cells = [];
    for (const ch of rankStr) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        const col = cells.length;
        cells.push({
          square: squareName(row, col),
          type: ch.toLowerCase(),
          color: ch === ch.toUpperCase() ? 'w' : 'b',
        });
      }
    }
    return cells;
  });
}

export function symbol(cell, name) {
  if (!cell) return squareColor(name) === 'dark' ? '.' : '';
  if (cell.type === 'p') return cell.color === 'w' ? 'o' : 'x';
  const letter = cell.type.toUpperCase();
  return cell.color === 'w' ? letter : letter + "'";
}

export function boardText(board) {
  const coords = '  ' + FILES.split('').map((f) => f.padEnd(2)).join(' ');
  const lines = [coords.trimEnd()];
  board.forEach((rowCells, row) => {
    const rank = 8 - row;
    const cells = rowCells.map((c, col) => symbol(c, squareName(row, col)).padEnd(2));
    lines.push(`${rank} ${cells.join(' ')} ${rank}`);
  });
  lines.push(coords.trimEnd());
  return lines.join('\n');
}

// ---------- attacks ----------

const KNIGHT_OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_OFFSETS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const emptyGrid = (v = 0) => Array.from({ length: 8 }, () => Array(8).fill(v));

/** Squares attacked by the piece at (row, col). Sliders stop at (and include) the first occupied square. */
export function attacksFrom(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  const out = [];
  const push = (r, c) => { if (onBoard(r, c)) out.push([r, c]); };
  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (onBoard(r, c)) {
        out.push([r, c]);
        if (board[r][c]) break;
        r += dr; c += dc;
      }
    }
  };
  switch (piece.type) {
    case 'p': { const dr = piece.color === 'w' ? -1 : 1; push(row + dr, col - 1); push(row + dr, col + 1); break; }
    case 'n': KNIGHT_OFFSETS.forEach(([dr, dc]) => push(row + dr, col + dc)); break;
    case 'k': KING_OFFSETS.forEach(([dr, dc]) => push(row + dr, col + dc)); break;
    case 'b': slide(BISHOP_DIRS); break;
    case 'r': slide(ROOK_DIRS); break;
    case 'q': slide(BISHOP_DIRS); slide(ROOK_DIRS); break;
  }
  return out;
}

export function attackMap(board) {
  const map = { w: emptyGrid(), b: emptyGrid() };
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      for (const [r, c] of attacksFrom(board, row, col)) map[piece.color][r][c] += 1;
    }
  }
  return map;
}

const CENTER = ['d4', 'e4', 'd5', 'e5'];

export function territory(board) {
  const a = attackMap(board);
  const mark = emptyGrid('');
  const diff = emptyGrid();
  const summary = { w: 0, b: 0, centerW: 0, centerB: 0 };
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const w = a.w[row][col], b = a.b[row][col];
      diff[row][col] = w - b;
      let m = '';
      if (w > b) m = '+'; else if (b > w) m = '-'; else if (w > 0) m = '=';
      mark[row][col] = m;
      const central = CENTER.includes(squareName(row, col));
      if (m === '+') { summary.w++; if (central) summary.centerW++; }
      if (m === '-') { summary.b++; if (central) summary.centerB++; }
    }
  }
  return { mark, diff, summary };
}

// ---------- mobility ----------

/** Pseudo-legal destination count for the piece at (row, col): no castling, no en passant, check ignored. */
export function movesFrom(board, row, col) {
  const piece = board[row][col];
  if (!piece) return 0;
  if (piece.type === 'p') {
    const dr = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    let n = 0;
    if (onBoard(row + dr, col) && !board[row + dr][col]) {
      n++;
      if (row === startRow && !board[row + 2 * dr][col]) n++;
    }
    for (const dc of [-1, 1]) {
      const r = row + dr, c = col + dc;
      if (onBoard(r, c) && board[r][c] && board[r][c].color !== piece.color) n++;
    }
    return n;
  }
  return attacksFrom(board, row, col).filter(([r, c]) => !board[r][c] || board[r][c].color !== piece.color).length;
}

export function mobility(board) {
  const pieces = [];
  const summary = { w: 0, b: 0 };
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      const count = movesFrom(board, row, col);
      pieces.push({ square: piece.square, type: piece.type, color: piece.color, count });
      summary[piece.color] += count;
    }
  }
  return { pieces, summary };
}

export function mobilityTone(count) {
  return count <= 2 ? 'low' : count <= 6 ? 'mid' : 'high';
}

// ---------- roads (lines) ----------

function buildLines() {
  const lines = [];
  for (let col = 0; col < 8; col++) {
    lines.push({ id: FILES[col], kind: 'file', squares: Array.from({ length: 8 }, (_, i) => squareName(7 - i, col)) });
  }
  for (let rank = 1; rank <= 8; rank++) {
    lines.push({ id: String(rank), kind: 'rank', squares: Array.from({ length: 8 }, (_, col) => squareName(8 - rank, col)) });
  }
  // Diagonals: walk from each starting square on the bottom/left edges going up-right, and bottom/right edges going up-left.
  const diag = (startRow, startCol, dc) => {
    const squares = [];
    let r = startRow, c = startCol;
    while (onBoard(r, c)) { squares.push(squareName(r, c)); r -= 1; c += dc; }
    if (squares.length >= 3) lines.push({ id: `${squares[0]}-${squares[squares.length - 1]}`, kind: 'diag', squares });
  };
  for (let col = 0; col < 8; col++) diag(7, col, 1);          // from rank 1 going up-right
  for (let row = 6; row >= 0; row--) diag(row, 0, 1);         // from a-file going up-right
  for (let col = 7; col >= 0; col--) diag(7, col, -1);        // from rank 1 going up-left
  for (let row = 6; row >= 0; row--) diag(row, 7, -1);        // from h-file going up-left
  return lines;
}

export const LINES = buildLines();

export function roads(board) {
  return LINES.map((line) => {
    const pieces = line.squares.map((sq) => { const { row, col } = squareIndex(sq); return board[row][col]; }).filter(Boolean);
    const pawnColors = new Set(pieces.filter((p) => p.type === 'p').map((p) => p.color));
    const state = pawnColors.size === 0 ? 'open' : pawnColors.size === 1 ? 'half' : 'closed';
    return { id: line.id, kind: line.kind, squares: line.squares, state, pieces };
  });
}

export function activeOnRoads(roadList) {
  const active = new Set();
  for (const road of roadList) {
    if (road.state !== 'open' || road.kind === 'rank') continue;
    const wants = road.kind === 'file' ? ['r', 'q'] : ['b', 'q'];
    for (const p of road.pieces) if (wants.includes(p.type)) active.add(p.square);
  }
  return active;
}

// ---------- king houses ----------

export function kingHouses(board) {
  const a = attackMap(board);
  const house = (color) => {
    let kr = -1, kc = -1;
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (p && p.type === 'k' && p.color === color) { kr = row; kc = col; }
    }
    if (kr < 0) return null;
    const enemy = color === 'w' ? 'b' : 'w';
    const cells = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = kr + dr, c = kc + dc;
      if (!onBoard(r, c)) continue;
      const attackers = a[enemy][r][c], defenders = a[color][r][c];
      cells.push({ square: squareName(r, c), attackers, defenders, danger: attackers > defenders });
    }
    return { king: squareName(kr, kc), cells };
  };
  return { w: house('w'), b: house('b') };
}

// ---------- input detection ----------

const PLACEMENT_RE = /^[prnbqkPRNBQK1-8]+(\/[prnbqkPRNBQK1-8]+){7}$/;

/** Castling rights implied by kings and rooks still on their home squares. */
function inferCastling(placement) {
  const b = boardFromFen(placement);
  const is = (sq, type, color) => { const { row, col } = squareIndex(sq); const p = b[row][col]; return !!p && p.type === type && p.color === color; };
  let rights = '';
  if (is('e1', 'k', 'w')) { if (is('h1', 'r', 'w')) rights += 'K'; if (is('a1', 'r', 'w')) rights += 'Q'; }
  if (is('e8', 'k', 'b')) { if (is('h8', 'r', 'b')) rights += 'k'; if (is('a8', 'r', 'b')) rights += 'q'; }
  return rights || '-';
}

export function normaliseFen(fen) {
  const fields = fen.trim().split(/\s+/);
  const defaults = ['w', inferCastling(fields[0]), '-', '0', '1'];
  while (fields.length < 6) fields.push(defaults[fields.length - 1]);
  return fields.slice(0, 6).join(' ');
}

/** Returns null when the placement is well formed, otherwise a human-readable reason. */
export function validatePlacement(placement) {
  if (!PLACEMENT_RE.test(placement)) return 'Not a FEN: expected 8 ranks of pieces and digits separated by /.';
  const ranks = placement.split('/');
  for (let i = 0; i < 8; i++) {
    const n = [...ranks[i]].reduce((sum, ch) => sum + (/\d/.test(ch) ? Number(ch) : 1), 0);
    if (n !== 8) return `Rank ${8 - i} has ${n} squares, it needs 8.`;
  }
  return null;
}

// Lichess paths that are exactly 8 letters and would otherwise look like a game id.
const RESERVED_PATHS = new Set(['analysis', 'training', 'practice', 'streamer', 'insights', 'settings', 'openings', 'password']);
const GAME_URL_RE = /^(?:https?:\/\/)?(?:www\.)?lichess\.org\/([A-Za-z0-9]{8})(?:[A-Za-z0-9]{4})?(?:\/(?:white|black))?\/?(?:#(\d+))?$/i;

export function parseInput(text) {
  const s = (text || '').trim();
  if (!s) return { kind: 'unknown' };

  const analysis = s.match(/lichess\.org\/analysis\/(?:standard\/)?([^?#\s]+)/i);
  if (analysis) {
    let fen;
    try { fen = decodeURIComponent(analysis[1]).replace(/_/g, ' '); } catch { return { kind: 'unknown' }; }
    const placement = fen.trim().split(/\s+/)[0];
    if (PLACEMENT_RE.test(placement)) {
      const reason = validatePlacement(placement);
      return reason ? { kind: 'invalid', reason } : { kind: 'fen', fen: normaliseFen(fen) };
    }
    return { kind: 'unknown' };
  }

  if (/\[Event\s/.test(s) || /(^|\s)1\.\s*[a-hNBRQKO]/.test(s)) return { kind: 'pgn', pgn: s };

  const game = s.match(GAME_URL_RE);
  if (game && !RESERVED_PATHS.has(game[1].toLowerCase())) {
    const out = { kind: 'lichess-game', gameId: game[1] };
    if (game[2] !== undefined) out.ply = Number(game[2]);
    return out;
  }

  const first = s.split(/\s+/)[0];
  if (PLACEMENT_RE.test(first)) {
    const reason = validatePlacement(first);
    return reason ? { kind: 'invalid', reason } : { kind: 'fen', fen: normaliseFen(s) };
  }

  return { kind: 'unknown' };
}

// ---------- diamond (45° view) ----------

/** 15 rows; row i holds the squares with file + rank === 16 - i (a = 1), ordered a-file first. */
export function diamondRows(board) {
  const rows = Array.from({ length: 15 }, () => []);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = col + 1, rank = 8 - row;
      rows[16 - (file + rank)].push({ square: squareName(row, col), cell: board[row][col] });
    }
  }
  return rows;
}

// ---------- knight ----------

export const KNIGHT_DIRS = KNIGHT_OFFSETS;

/** The knight's 8 straight tracks from `origin`: hop squares with hop number and landing status. */
export function knightTracks(board, origin) {
  const { row, col } = squareIndex(origin);
  const originPiece = board[row][col];
  const color = originPiece ? originPiece.color : 'w';
  return KNIGHT_DIRS.map(([dr, dc]) => {
    const hops = [];
    let r = row + dr, c = col + dc, n = 1;
    while (onBoard(r, c)) {
      const p = board[r][c];
      hops.push({ square: squareName(r, c), n, status: !p ? 'free' : p.color === color ? 'own' : 'enemy' });
      r += dr; c += dc; n += 1;
    }
    return { dir: [dr, dc], hops };
  });
}

/** Minimum knight moves from `origin` to every square on an empty board. */
export function knightDistances(origin) {
  const d = emptyGrid(-1);
  const { row, col } = squareIndex(origin);
  d[row][col] = 0;
  const queue = [[row, col]];
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of KNIGHT_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (onBoard(nr, nc) && d[nr][nc] < 0) { d[nr][nc] = d[r][c] + 1; queue.push([nr, nc]); }
    }
  }
  return d;
}

/** First knight of `turn`'s side, else any knight, else null. */
export function defaultKnightSquare(board, turn) {
  const knights = board.flat().filter((p) => p && p.type === 'n');
  const own = knights.find((p) => p.color === turn);
  return (own || knights[0] || null)?.square ?? null;
}

// ---------- king house report ----------

/** Strengths, weaknesses and pressure on one king's 3x3 house. Null if that colour has no king. */
export function kingHouseReport(board, color) {
  const houses = kingHouses(board);
  const house = houses[color];
  if (!house) return null;
  const enemy = color === 'w' ? 'b' : 'w';
  const { row: kr, col: kc } = squareIndex(house.king);
  const houseSet = new Set(house.cells.map((c) => c.square));

  const cells = house.cells.map((c) => ({ ...c, balance: c.defenders - c.attackers }));

  // Shield: the three squares in front of the king.
  const forward = color === 'w' ? -1 : 1;
  const shield = [];
  for (let dc = -1; dc <= 1; dc++) {
    const c = kc + dc, r = kr + forward;
    if (!onBoard(r, c)) continue;
    const sq = squareName(r, c);
    const here = board[r][c];
    let status = 'missing';
    if (here && here.type === 'p' && here.color === color) status = 'pawn';
    else if (onBoard(r + forward, c)) {
      const up = board[r + forward][c];
      if (up && up.type === 'p' && up.color === color) status = 'advanced';
    }
    shield.push({ square: sq, status });
  }

  // Files next to the king with no own pawn.
  const openFiles = [];
  for (let dc = -1; dc <= 1; dc++) {
    const c = kc + dc;
    if (c < 0 || c > 7) continue;
    const ownPawn = board.some((rowCells) => rowCells[c] && rowCells[c].type === 'p' && rowCells[c].color === color);
    if (!ownPawn) openFiles.push(FILES[c]);
  }

  // Pieces touching the house.
  const aiming = [], defending = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p || (p.type === 'k' && p.color === color)) continue;
    const hits = attacksFrom(board, r, c).map(([ar, ac]) => squareName(ar, ac)).filter((sq) => houseSet.has(sq));
    if (!hits.length) continue;
    (p.color === enemy ? aiming : defending).push({ square: p.square, type: p.type, color: p.color, hits });
  }

  const weakestCell = cells.reduce((w, c) => (c.balance < w.balance ? c : w), cells[0]);
  const weakest = { square: weakestCell.square, balance: weakestCell.balance, needs: Math.max(0, weakestCell.balance + 1) };
  const brokenSquares = cells.filter((c) => c.balance < 0).length;
  const shieldPawns = shield.filter((s) => s.status === 'pawn').length;

  // Squares the king could step to right now: in the house, not its own square, not own-occupied, not attacked.
  const escapes = cells
    .filter((c) => c.square !== house.king && c.attackers === 0)
    .filter((c) => { const { row, col } = squareIndex(c.square); const p = board[row][col]; return !p || p.color === enemy; })
    .map((c) => c.square);

  // What the opponent has to attack with (kings and pawns excluded).
  const VALUE = { q: 9, r: 5, b: 3, n: 3 };
  const WORD = { q: 'a queen', r: 'a rook', b: 'a bishop', n: 'a knight' };
  const enemyPieces = board.flat().filter((p) => p && p.color === enemy && VALUE[p.type]);
  const enemyForce = enemyPieces.reduce((n, p) => n + VALUE[p.type], 0);
  const enemyForceWords = enemyPieces.length ? enemyPieces.map((p) => WORD[p.type]).join(' and ') : 'nothing';
  const quiet = enemyForce < 5;

  // Being boxed in only matters when somebody is aiming at the house.
  const escapePenalty = aiming.length ? (escapes.length === 0 ? 2 : escapes.length === 1 ? 1 : 0) : 0;
  const score = shieldPawns - openFiles.length - brokenSquares - (aiming.length >= 3 ? 1 : 0) - escapePenalty;
  const label = quiet ? 'Safe' : score >= 3 ? 'Strong' : score >= 1 ? 'Shaky' : 'In danger';

  return { king: house.king, cells, shield, openFiles, aiming, defending, weakest, brokenSquares, shieldPawns,
    escapes, escapePenalty, enemyForce, enemyForceWords, quiet, score, label };
}
