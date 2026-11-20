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
