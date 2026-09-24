import { useEffect, useRef, useState } from 'react';
import MoveHistory from './MoveHistory';
import PlayerInfo from './PlayerInfo';

function formatClock(milliseconds = 0) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function useClockValues(clock) {
  const [now, setNow] = useState(() => Date.now());
  const receivedAtRef = useRef(now);

  useEffect(() => {
    receivedAtRef.current = Date.now();
    setNow(receivedAtRef.current);
    if (!clock?.running) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [clock?.serverNow, clock?.running]);

  if (!clock) return { whiteMs: 0, blackMs: 0 };
  const elapsed = clock.running ? Math.max(0, now - receivedAtRef.current) : 0;
  return {
    whiteMs: Math.max(0, clock.whiteMs - (clock.running && clock.activeColor === 'white' ? elapsed : 0)),
    blackMs: Math.max(0, clock.blackMs - (clock.running && clock.activeColor === 'black' ? elapsed : 0)),
  };
}

function Clock({ color, milliseconds, active }) {
  return <div className={`border px-3 py-2 ${active ? 'border-[#c49a52] bg-[#c49a52]/10' : 'border-white/10 bg-[#101010]'}`}>
    <div className="text-[9px] uppercase tracking-[0.18em] text-[#a9a59c]">{color}</div>
    <div className={`mono mt-1 text-2xl font-medium tracking-[0.08em] ${milliseconds === 0 ? 'text-[#c8816d]' : 'text-[#f6f2e9]'}`}>{formatClock(milliseconds)}</div>
  </div>;
}

export default function GameInfo({ state, myColor, connected, premoveQueue, onClearPremoveQueue, onResign, onRequestRematch, rematchRequested }) {
  const currentPlayer = state.players?.find((player) => player.color === state.turn);
  const finished = state.status?.type !== 'playing';
  const clocks = useClockValues(state.clock);
  return (
    <aside className="flex min-h-[28rem] flex-col border border-white/10 bg-[#171717]">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#a9a59c]">Players</span>
          <span className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] ${connected ? 'text-[#96b995]' : 'text-[#c8816d]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-[#96b995]' : 'bg-[#c8816d]'}`} /> {connected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
      <PlayerInfo player={state.players?.find((player) => player.color === 'white')} color="white" active={!finished && state.turn === 'white'} />
      <PlayerInfo player={state.players?.find((player) => player.color === 'black')} color="black" active={!finished && state.turn === 'black'} />
      <div className="border-b border-white/10 px-4 py-4">
        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#a9a59c]"><span>Clocks</span><span className="mono text-[#c49a52]">{state.timeControl?.label || '5 + 0'}</span></div>
        <div className="grid grid-cols-2 gap-2">
          <Clock color="White" milliseconds={clocks.whiteMs} active={!finished && state.clock?.running && state.clock.activeColor === 'white'} />
          <Clock color="Black" milliseconds={clocks.blackMs} active={!finished && state.clock?.running && state.clock.activeColor === 'black'} />
        </div>
      </div>
      <div className="border-b border-white/10 px-4 py-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#a9a59c]">{finished ? 'Game status' : 'Current turn'}</div>
        <div className="mt-1 text-xl font-extrabold uppercase tracking-[0.12em] text-[#c49a52]">{finished ? state.status.label : `${currentPlayer?.name || state.turn} / ${state.turn}`}</div>
        {state.status?.type === 'playing' && state.status?.label === 'Check' && <div className="mt-1 text-xs text-[#c8816d]">Check</div>}
      </div>
      {premoveQueue.length > 0 && <div className="border-b border-white/10 px-4 py-4">
        <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3a08e]">Premove queue</span><button onClick={onClearPremoveQueue} className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#e3a08e] hover:text-white">Clear</button></div>
        <div className="space-y-1">{premoveQueue.map((move, index) => <div key={`${move.from}-${move.to}-${index}`} className="mono flex items-center justify-between bg-[#c67656]/10 px-2 py-1.5 text-xs text-[#e3a08e]"><span>{index + 1}. {move.from} → {move.to}</span><span>{move.promotion ? `=${move.promotion.toUpperCase()}` : ''}</span></div>)}</div>
      </div>}
      <div className="flex-1 px-4 py-4"><MoveHistory history={state.history} /></div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <span className="mono text-[10px] uppercase tracking-[0.12em] text-[#706e68]">You: {myColor}</span>
        {!finished && <button onClick={onResign} className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c8816d] transition hover:text-[#e3a08e]">Resign</button>}
        {finished && <button onClick={onRequestRematch} className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c49a52] transition hover:text-[#e6bd73]">{rematchRequested ? 'Waiting...' : 'Request rematch'}</button>}
      </div>
    </aside>
  );
}
