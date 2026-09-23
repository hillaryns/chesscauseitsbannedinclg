import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function ChessBoard({ fen, myColor, turn, lastMove, onMove, disabled }) {
  const [selected, setSelected] = useState(null);
  const chess = new Chess(fen);
  const legalTargets = selected ? chess.moves({ square: selected, verbose: true }).map((move) => move.to) : [];
  const customSquareStyles = {};
  if (selected) customSquareStyles[selected] = { backgroundColor: 'rgba(196,154,82,.7)' };
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: 'rgba(196,154,82,.35)' };
    customSquareStyles[lastMove.to] = { backgroundColor: 'rgba(196,154,82,.62)' };
  }
  legalTargets.forEach((square) => { customSquareStyles[square] = { background: 'radial-gradient(circle, rgba(196,154,82,.8) 18%, transparent 20%)' }; });
  const canMove = !disabled && myColor === turn;
  const submitMove = (from, to) => {
    if (!canMove) return false;
    const piece = chess.get(from);
    const promotion = piece?.type === 'p' && to[1] === (piece.color === 'w' ? '8' : '1') ? 'q' : undefined;
    onMove({ from, to, promotion });
    setSelected(null);
    return true;
  };
  const handleSquareClick = (square) => {
    if (!canMove) return;
    if (selected && legalTargets.includes(square)) return submitMove(selected, square);
    const piece = chess.get(square);
    setSelected(piece && (piece.color === (myColor === 'white' ? 'w' : 'b')) ? square : null);
  };
  return <div className="board-wrap w-full overflow-hidden border-4 border-[#29251f] bg-[#29251f]"><Chessboard position={fen} boardOrientation={myColor} onPieceDrop={(from, to) => submitMove(from, to)} onSquareClick={handleSquareClick} customSquareStyles={customSquareStyles} arePiecesDraggable={canMove} animationDuration={180} /></div>;
}
