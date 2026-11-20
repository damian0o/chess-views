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
