import MoveHistory from './MoveHistory';
import PlayerInfo from './PlayerInfo';

export default function GameInfo({ state, myColor, connected, onResign, onRequestRematch, rematchRequested }) {
  const currentPlayer = state.players?.find((player) => player.color === state.turn);
  const finished = state.status?.type !== 'playing';
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
      <div className="border-b border-white/10 px-4 py-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#a9a59c]">{finished ? 'Game status' : 'Current turn'}</div>
        <div className="mt-1 text-xl font-extrabold uppercase tracking-[0.12em] text-[#c49a52]">{finished ? state.status.label : `${currentPlayer?.name || state.turn} / ${state.turn}`}</div>
        {state.status?.type === 'playing' && state.status?.label === 'Check' && <div className="mt-1 text-xs text-[#c8816d]">Check</div>}
      </div>
      <div className="flex-1 px-4 py-4"><MoveHistory history={state.history} /></div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <span className="mono text-[10px] uppercase tracking-[0.12em] text-[#706e68]">You: {myColor}</span>
        {!finished && <button onClick={onResign} className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c8816d] transition hover:text-[#e3a08e]">Resign</button>}
        {finished && <button onClick={onRequestRematch} className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c49a52] transition hover:text-[#e6bd73]">{rematchRequested ? 'Waiting...' : 'Request rematch'}</button>}
      </div>
    </aside>
  );
}
