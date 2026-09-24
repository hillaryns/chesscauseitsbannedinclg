const FILES = 'abcdefgh';
const KNIGHT_OFFSETS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_OFFSETS = [[1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1]];

function square(file, rank) {
  return file >= 0 && file < 8 && rank >= 1 && rank <= 8 ? `${FILES[file]}${rank}` : null;
}

function fileIndex(squareName) {
  return FILES.indexOf(squareName[0]);
}

function rankIndex(squareName) {
  return Number(squareName[1]);
}

function positionFromFen(fen) {
  const board = new Map();
  fen.split(' ')[0].split('/').forEach((row, rowIndex) => {
    let file = 0;
    for (const token of row) {
      if (/\d/.test(token)) {
        file += Number(token);
        continue;
      }
      const squareName = square(file, 8 - rowIndex);
      board.set(squareName, { type: token.toLowerCase(), color: token === token.toUpperCase() ? 'w' : 'b' });
      file += 1;
    }
  });
  return board;
}

function positionToFen(board) {
  const rows = [];
  for (let rank = 8; rank >= 1; rank -= 1) {
    let empty = 0;
    let row = '';
    for (let file = 0; file < 8; file += 1) {
      const piece = board.get(square(file, rank));
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      row += piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/');
}

function addTarget(targets, board, movingColor, file, rank) {
  const destination = square(file, rank);
  if (!destination) return false;
  const target = board.get(destination);
  if (target?.color === movingColor) return false;
  targets.push(destination);
  return !target;
}

function rayTargets(targets, board, piece, from, directions) {
  directions.forEach(([fileStep, rankStep]) => {
    let file = fileIndex(from) + fileStep;
    let rank = rankIndex(from) + rankStep;
    while (addTarget(targets, board, piece.color, file, rank)) {
      file += fileStep;
      rank += rankStep;
    }
  });
}

function pawnTargets(targets, board, piece, from) {
  const file = fileIndex(from);
  const rank = rankIndex(from);
  const direction = piece.color === 'w' ? 1 : -1;
  const startRank = piece.color === 'w' ? 2 : 7;
  const next = square(file, rank + direction);

  if (next && !board.has(next)) {
    targets.push(next);
    const double = square(file, rank + direction * 2);
    if (rank === startRank && double && !board.has(double)) targets.push(double);
  }

  [-1, 1].forEach((fileStep) => {
    const diagonal = square(file + fileStep, rank + direction);
    if (diagonal && board.get(diagonal)?.color !== piece.color) targets.push(diagonal);
  });
}

function kingTargets(targets, board, piece, from) {
  KING_OFFSETS.forEach(([fileStep, rankStep]) => addTarget(targets, board, piece.color, fileIndex(from) + fileStep, rankIndex(from) + rankStep));

  const rank = piece.color === 'w' ? 1 : 8;
  if (from !== `e${rank}`) return;
  const kingSide = [`f${rank}`, `g${rank}`];
  const queenSide = [`d${rank}`, `c${rank}`, `b${rank}`];
  if (kingSide.every((target) => !board.has(target)) && board.get(`h${rank}`)?.color === piece.color) targets.push(`g${rank}`);
  if (queenSide.every((target) => !board.has(target)) && board.get(`a${rank}`)?.color === piece.color) targets.push(`c${rank}`);
}

function geometryTargets(board, from) {
  const piece = board.get(from);
  if (!piece) return [];
  const targets = [];

  if (piece.type === 'p') pawnTargets(targets, board, piece, from);
  if (piece.type === 'n') KNIGHT_OFFSETS.forEach(([fileStep, rankStep]) => addTarget(targets, board, piece.color, fileIndex(from) + fileStep, rankIndex(from) + rankStep));
  if (piece.type === 'b' || piece.type === 'q') rayTargets(targets, board, piece, from, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  if (piece.type === 'r' || piece.type === 'q') rayTargets(targets, board, piece, from, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
  if (piece.type === 'k') kingTargets(targets, board, piece, from);

  return targets;
}

function applyMove(board, move) {
  const piece = board.get(move.from);
  if (!piece || !move.to) return;

  board.delete(move.from);
  board.set(move.to, {
    ...piece,
    type: move.promotion || piece.type,
  });

  const rank = piece.color === 'w' ? 1 : 8;
  if (piece.type === 'k' && move.from === `e${rank}` && move.to === `g${rank}`) {
    const rook = board.get(`h${rank}`);
    if (rook?.color === piece.color) {
      board.delete(`h${rank}`);
      board.set(`f${rank}`, rook);
    }
  }
  if (piece.type === 'k' && move.from === `e${rank}` && move.to === `c${rank}`) {
    const rook = board.get(`a${rank}`);
    if (rook?.color === piece.color) {
      board.delete(`a${rank}`);
      board.set(`d${rank}`, rook);
    }
  }
}

export function simulatePremoveQueue(fen, queue = []) {
  const board = positionFromFen(fen);
  queue.forEach((move) => applyMove(board, move));
  const parts = fen.split(' ');
  parts[0] = positionToFen(board);
  return { board, fen: parts.join(' ') };
}

export function getPremovePiece(fen, queue, squareName) {
  return simulatePremoveQueue(fen, queue).board.get(squareName);
}

export function getPremoveTargets(fen, queue, color, from) {
  const { board } = simulatePremoveQueue(fen, queue);
  const piece = board.get(from);
  if (!piece || piece.color !== (color === 'white' ? 'w' : 'b')) return [];
  return geometryTargets(board, from);
}
