const choices = [
  { code: 'q', label: 'Queen', symbol: '♛' },
  { code: 'r', label: 'Rook', symbol: '♜' },
  { code: 'b', label: 'Bishop', symbol: '♝' },
  { code: 'n', label: 'Knight', symbol: '♞' },
];

export default function PromotionModal({ color, onSelect, onCancel }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/65 px-5">
      <div className="w-full max-w-md border border-[#c49a52]/60 bg-[#171717] p-6 text-center shadow-2xl">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c49a52]">Promote to</div>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {choices.map((choice) => (
            <button key={choice.code} onClick={() => onSelect(choice.code)} className="border border-white/10 px-2 py-3 transition hover:border-[#c49a52] hover:bg-[#c49a52]/10">
              <span className={`block text-4xl leading-none ${color === 'white' ? 'text-[#f6f2e9]' : 'text-[#706e68]'}`}>{choice.symbol}</span>
              <span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-[#a9a59c]">{choice.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-5 text-[10px] uppercase tracking-[0.16em] text-[#a9a59c] hover:text-[#f6f2e9]">Cancel</button>
      </div>
    </div>
  );
}