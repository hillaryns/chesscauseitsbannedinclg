export default function MoveHistory({ history = [] }) {
  const pairs = [];
  for (let index = 0; index < history.length; index += 2) {
    pairs.push({ number: index / 2 + 1, white: history[index], black: history[index + 1] });
  }
  return (
    <section className="min-h-0 border-t border-white/10 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-[#a9a59c]">Moves</h3>
        <span className="mono text-[10px] text-[#706e68]">{history.length} total</span>
      </div>
      <div className="max-h-44 overflow-y-auto pr-1">
        {pairs.length === 0 ? <p className="text-sm text-[#706e68]">The board is ready.</p> : pairs.map((pair) => (
          <div key={pair.number} className="grid grid-cols-[2rem_1fr_1fr] gap-2 py-1 text-sm">
            <span className="mono text-[#706e68]">{pair.number}.</span>
            <span className="text-[#f6f2e9]">{pair.white?.san}</span>
            <span className="text-[#b9b5ac]">{pair.black?.san || ''}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
