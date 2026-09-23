const statusStyles = {
  CONNECTING: 'text-[#e6bd73]',
  CONNECTED: 'text-[#96b995]',
  DISCONNECTED: 'text-[#c8816d]',
  'CONNECTION ERROR': 'text-[#c8816d]',
};

export default function DebugPanel({ status, serverUrl, socketId, lastEvent, lastError }) {
  return (
    <section className="border border-white/10 bg-[#101010] px-4 py-3 text-[10px] leading-5 text-[#a9a59c]">
      <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
        <span className="font-bold uppercase tracking-[0.18em] text-[#c49a52]">Socket debug</span>
        <span className={`font-bold uppercase tracking-[0.14em] ${statusStyles[status] || 'text-[#a9a59c]'}`}>{status}</span>
      </div>
      <div className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-3">
        <span>Socket URL:</span><span className="mono break-all text-[#f6f2e9]">{serverUrl}</span>
        <span>Socket connected:</span><span className="mono text-[#f6f2e9]">{status === 'CONNECTED' ? 'true' : 'false'}</span>
        <span>Socket ID:</span><span className="mono break-all text-[#f6f2e9]">{socketId || 'none'}</span>
        <span>Last event:</span><span className="mono break-all text-[#f6f2e9]">{lastEvent || 'none'}</span>
        <span>Last error:</span><span className="break-all text-[#e3a08e]">{lastError || 'none'}</span>
      </div>
    </section>
  );
}