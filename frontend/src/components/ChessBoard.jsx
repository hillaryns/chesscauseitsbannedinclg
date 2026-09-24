import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getPremoveTargets, simulatePremoveQueue } from '../premove';

export default function ChessBoard({ fen, myColor, turn, lastMove, premoveQueue, onMoveRequest, onClearPremoveQueue, disabled }) {
  const [selected, setSelected] = useState(null);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const isPremove = turn !== myColor;
  const simulation = useMemo(() => simulatePremoveQueue(fen, premoveQueue), [fen, premoveQueue]);
  const boardFen = premoveQueue.length ? simulation.fen : fen;
  const legalTargets = selected
    ? (isPremove
      ? getPremoveTargets(fen, premoveQueue, myColor, selected)
      : chess.moves({ square: selected, verbose: true }).map((move) => move.to))
    : [];
  const customSquareStyles = {};

  if (selected) customSquareStyles[selected] = { backgroundColor: 'rgba(196,154,82,.7)' };
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: 'rgba(196,154,82,.35)' };
    customSquareStyles[lastMove.to] = { backgroundColor: 'rgba(196,154,82,.62)' };
  }
  legalTargets.forEach((square) => { customSquareStyles[square] = { background: 'radial-gradient(circle, rgba(196,154,82,.8) 18%, transparent 20%)' }; });
  premoveQueue.forEach((move) => { customSquareStyles[move.to] = { backgroundColor: 'rgba(198,116,86,.68)' }; });

  const canInteract = !disabled;
  const submitMove = (from, to) => {
    if (!canInteract) return false;
    if (isPremove && !getPremoveTargets(fen, premoveQueue, myColor, from).includes(to)) return false;
    onMoveRequest({ from, to });
    setSelected(null);
    return true;
  };
  const handleSquareClick = (square) => {
    if (!canInteract) return;
    if (selected && legalTargets.includes(square)) return submitMove(selected, square);
    const piece = isPremove ? simulation.board.get(square) : chess.get(square);
    setSelected(piece && piece.color === (myColor === 'white' ? 'w' : 'b') ? square : null);
  };

  useEffect(() => setSelected(null), [fen, premoveQueue]);

  return <div className="board-wrap w-full overflow-hidden border-4 border-[#29251f] bg-[#29251f]"><Chessboard position={boardFen} boardOrientation={myColor} onPieceDrop={(from, to) => submitMove(from, to)} onSquareClick={handleSquareClick} onSquareRightClick={() => onClearPremoveQueue?.()} customSquareStyles={customSquareStyles} arePiecesDraggable={canInteract} animationDuration={180} /></div>;
}
