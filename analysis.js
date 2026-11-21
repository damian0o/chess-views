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

/** Map of square → pin for every piece pinned to its king (the strongest pin per square). */
export function absolutePinMap(board) {
  const m = new Map();
  for (const pn of pins(board)) if (pn.absolute) m.set(pn.pinned.square, pn);
  return m;
}

/** Attacks from (row, col); with a pin map, a piece pinned to its king only attacks along the pin line. */
export function attacksFromPinned(board, row, col, pinMap) {
  const piece = board[row][col];
  const all = attacksFrom(board, row, col);
  const pn = pinMap && piece && pinMap.get(piece.square);
  if (!pn) return all;
  const line = new Set(pn.between.concat([pn.pinner.square, pn.target.square]));
  return all.filter(([r, c]) => line.has(squareName(r, c)));
}

export function attackMap(board, { respectPins = false } = {}) {
  const map = { w: emptyGrid(), b: emptyGrid() };
  const pinMap = respectPins ? absolutePinMap(board) : null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      for (const [r, c] of attacksFromPinned(board, row, col, pinMap)) map[piece.color][r][c] += 1;
    }
  }
  return map;
}

const CENTER = ['d4', 'e4', 'd5', 'e5'];

export function territory(board) {
  const a = attackMap(board, { respectPins: true });
  const pinned = [...absolutePinMap(board).values()].map((pn) => ({ square: pn.pinned.square, by: pn.pinner.square, to: pn.target.square }));
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
  return { mark, diff, summary, pinned };
}

// ---------- mobility ----------

/** Pseudo-legal destination squares for the piece at (row, col): no castling, no en passant, check ignored. */
export function destinationsFrom(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  const out = [];
  if (piece.type === 'p') {
    const dr = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    if (onBoard(row + dr, col) && !board[row + dr][col]) {
      out.push(squareName(row + dr, col));
      if (row === startRow && !board[row + 2 * dr][col]) out.push(squareName(row + 2 * dr, col));
    }
    for (const dc of [-1, 1]) {
      const r = row + dr, c = col + dc;
      if (onBoard(r, c) && board[r][c] && board[r][c].color !== piece.color) out.push(squareName(r, c));
    }
    return out;
  }
  return attacksFrom(board, row, col)
    .filter(([r, c]) => !board[r][c] || board[r][c].color !== piece.color)
    .map(([r, c]) => squareName(r, c));
}

export function movesFrom(board, row, col) {
  return destinationsFrom(board, row, col).length;
}

/**
 * Mobility per piece: squares a piece can move to; for pawns, the squares it attacks. With { respectPins: true } a piece pinned to its king may only move along the
 * pin line (towards or capturing the pinner); pieces pinned to lesser targets are flagged but unrestricted.
 */
export function mobility(board, { respectPins = false } = {}) {
  const pieces = [];
  const summary = { w: 0, b: 0 };
  const pinInfo = new Map();
  if (respectPins) {
    for (const pn of pins(board)) {
      const prev = pinInfo.get(pn.pinned.square);
      if (!prev || (pn.absolute && !prev.absolute)) pinInfo.set(pn.pinned.square, pn);
    }
  }
  const enemyAttacks = attackMap(board);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      // Pawns count the squares they attack (their real influence); other pieces the squares they can move to.
      let dests = piece.type === 'p'
        ? attacksFrom(board, row, col).map(([r, c]) => squareName(r, c))
        : destinationsFrom(board, row, col);
      if (piece.type === 'k') {
        // A king may not step onto a square the enemy attacks.
        const enemy = piece.color === 'w' ? 'b' : 'w';
        dests = dests.filter((sq) => { const { row: r, col: c } = squareIndex(sq); return enemyAttacks[enemy][r][c] === 0; });
      }
      const pn = pinInfo.get(piece.square);
      if (pn && pn.absolute) {
        // Squares strictly between pinner and target, plus the pinner itself.
        const line = new Set(pn.between.concat([pn.pinner.square]));
        line.delete(piece.square);
        dests = dests.filter((sq) => line.has(sq));
      }
      const count = dests.length;
      pieces.push({ square: piece.square, type: piece.type, color: piece.color, count, pinned: pn ? (pn.absolute ? 'absolute' : 'relative') : null });
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

export function kingHouses(board, { respectPins = false } = {}) {
  const a = attackMap(board, { respectPins });
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

// ---------- shapes ----------

/** Square size for the Shapes view: pawns small, minors and rooks medium, king and queen big. */
export function shapeSize(type) {
  if (type === 'p') return 'small';
  if (type === 'k' || type === 'q') return 'big';
  return 'mid';
}

/** Which third of the board a file belongs to: a-c queenside, d-e centre, f-h kingside. */
export function zoneOf(col) {
  return col < 3 ? 'queenside' : col < 5 ? 'centre' : 'kingside';
}

/**
 * Groups of touching same-side pieces (8-neighbour adjacency) inside one zone
 * (queenside, centre, kingside), the "chunks" a strong player sees. Without the
 * zone split a normal middlegame is one giant group per side. Each group:
 * { color, zone, squares, box: { r0, r1, c0, c1 } } in board coordinates
 * (row 0 = rank 8). Scan order: rank 8 to 1, a to h.
 */
export function pieceGroups(board) {
  const seen = Array.from({ length: 8 }, () => Array(8).fill(false));
  const groups = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const start = board[row][col];
      if (!start || seen[row][col]) continue;
      const squares = [];
      const box = { r0: row, r1: row, c0: col, c1: col };
      const stack = [[row, col]];
      seen[row][col] = true;
      while (stack.length) {
        const [r, c] = stack.pop();
        squares.push(squareName(r, c));
        box.r0 = Math.min(box.r0, r); box.r1 = Math.max(box.r1, r);
        box.c0 = Math.min(box.c0, c); box.c1 = Math.max(box.c1, c);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if ((dr === 0 && dc === 0) || nr < 0 || nr > 7 || nc < 0 || nc > 7 || seen[nr][nc]) continue;
            const p = board[nr][nc];
            if (!p || p.color !== start.color || zoneOf(nc) !== zoneOf(col)) continue;
            seen[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
      }
      groups.push({ color: start.color, zone: zoneOf(col), squares, box });
    }
  }
  return groups;
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

/** Squares every knight on the board can jump to right now (free or enemy-occupied), with the colours that reach each. */
export function knightJumps(board) {
  const reach = new Map();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p || p.type !== 'n') continue;
    for (const [dr, dc] of KNIGHT_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (!onBoard(nr, nc)) continue;
      const t = board[nr][nc];
      if (t && t.color === p.color) continue;
      const sq = squareName(nr, nc);
      if (!reach.has(sq)) reach.set(sq, new Set());
      reach.get(sq).add(p.color);
    }
  }
  return [...reach].map(([square, colors]) => ({ square, colors: ['w', 'b'].filter((c) => colors.has(c)) }));
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

// ---------- pins ----------

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Every pin on the board: a slider, one enemy piece in between, and the king or a more valuable piece behind it. */
export function pins(board) {
  const out = [];
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const pinner = board[row][col];
    if (!pinner || !'brq'.includes(pinner.type)) continue;
    const dirs = pinner.type === 'b' ? BISHOP_DIRS : pinner.type === 'r' ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc, pinned = null;
      const between = [];
      // `between` collects every square strictly between pinner and target, the pinned square included.
      while (onBoard(r, c)) {
        const p = board[r][c];
        if (p) {
          if (p.color === pinner.color) break;
          if (!pinned) { if (p.type === 'k') break; pinned = p; }
          else {
            if (p.type === 'k' || PIECE_VALUE[p.type] > PIECE_VALUE[pinned.type]) {
              out.push({ pinner, pinned, target: p, absolute: p.type === 'k', between: between.slice() });
            }
            break;
          }
        }
        between.push(squareName(r, c));
        r += dr; c += dc;
      }
    }
  }
  return out;
}

// ---------- king house report ----------

/** Strengths, weaknesses and pressure on one king's 3x3 house. Null if that colour has no king. */
export function kingHouseReport(board, color) {
  const houses = kingHouses(board, { respectPins: true });
  const house = houses[color];
  if (!house) return null;
  const rawHouse = kingHouses(board)[color];
  const pinMap = absolutePinMap(board);
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
    const hits = attacksFromPinned(board, r, c, pinMap).map(([ar, ac]) => squareName(ar, ac)).filter((sq) => houseSet.has(sq));
    if (!hits.length) continue;
    (p.color === enemy ? aiming : defending).push({ square: p.square, type: p.type, color: p.color, hits });
  }

  const weakestCell = cells.reduce((w, c) => (c.balance < w.balance ? c : w), cells[0]);
  const weakest = { square: weakestCell.square, balance: weakestCell.balance, needs: Math.max(0, weakestCell.balance + 1) };
  const brokenSquares = cells.filter((c) => c.balance < 0).length;
  const shieldPawns = shield.filter((s) => s.status === 'pawn').length;

  // Squares the king could step to right now: in the house, not its own square, not own-occupied, not attacked.
  // Escape squares use raw attacks: a pinned piece still gives check.
  const rawAttackers = new Map(rawHouse.cells.map((c) => [c.square, c.attackers]));
  const escapes = cells
    .filter((c) => c.square !== house.king && rawAttackers.get(c.square) === 0)
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
  // Pins against this side: pieces pinned to the king count against the house.
  const sidePins = pins(board).filter((p) => p.pinned.color === color);
  const pinPenalty = Math.min(2, sidePins.filter((p) => p.absolute).length);
  const score = shieldPawns - openFiles.length - brokenSquares - (aiming.length >= 3 ? 1 : 0) - escapePenalty - pinPenalty;
  const label = quiet ? 'Safe' : score >= 3 ? 'Strong' : score >= 1 ? 'Shaky' : 'In danger';

  return { king: house.king, cells, shield, openFiles, aiming, defending, weakest, brokenSquares, shieldPawns,
    escapes, escapePenalty, pins: sidePins, pinPenalty, enemyForce, enemyForceWords, quiet, score, label };
}

// ---------- pawn paths ----------

/** For every pawn: the squares ahead on its file, the first blocker, enemy pawns that could stop it, and whether it is passed. */
export function pawnPaths(board) {
  const out = [];
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const p = board[row][col];
    if (!p || p.type !== 'p') continue;
    const dr = p.color === 'w' ? -1 : 1;
    const path = [];
    let blocker = null;
    for (let r = row + dr; onBoard(r, col); r += dr) {
      path.push(squareName(r, col));
      if (board[r][col] && blocker === null) blocker = squareName(r, col);
    }
    const guards = [];
    for (let r = row + dr; onBoard(r, col); r += dr) {
      for (const dc of [-1, 0, 1]) {
        const c = col + dc;
        if (!onBoard(r, c)) continue;
        const q = board[r][c];
        if (q && q.type === 'p' && q.color !== p.color) guards.push(squareName(r, c));
      }
    }
    out.push({
      square: p.square, color: p.color, path, blocker, guards,
      passed: guards.length === 0, clear: blocker === null,
      promotion: path.length ? path[path.length - 1] : null, stepsToPromote: path.length,
    });
  }
  return out;
}
