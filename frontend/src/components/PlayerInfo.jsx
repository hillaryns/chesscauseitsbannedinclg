export default function PlayerInfo({ player, color, active }) {
  return (
    <div className={`flex items-center justify-between border-b px-4 py-3 ${active ? 'border-[#c49a52] bg-[#c49a52]/10' : 'border-white/10'}`}>
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${color === 'white' ? 'bg-[#f2eee3]' : 'bg-[#292929]'}`} />
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#a9a59c]">{color}</div>
          <div className="font-semibold text-[#f6f2e9]">{player?.name || 'Waiting...'}</div>
        </div>
      </div>
      <span className={`text-[10px] uppercase tracking-[0.18em] ${player?.connected ? 'text-[#96b995]' : 'text-[#c8816d]'}`}>
        {player?.connected ? 'Online' : 'Away'}
      </span>
    </div>
  );
}
