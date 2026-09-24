import { useState } from 'react';

const TIME_CONTROL_GROUPS = [
  { label: 'Bullet', options: ['1+0', '2+1'] },
  { label: 'Blitz', options: ['3+0', '3+2', '5+0', '5+3'] },
  { label: 'Rapid', options: ['10+0', '10+5', '15+10'] },
];

export default function Lobby({ onCreate, onJoin, error, connected, debug }) {
  const [mode, setMode] = useState('home');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [timeControl, setTimeControl] = useState('5+0');
  const submit = (event) => {
    event.preventDefault();
    if (mode === 'create') onCreate(name.trim() || 'Player 1', timeControl);
    if (mode === 'join') onJoin(roomCode.trim().toUpperCase(), name.trim() || 'Player 2');
  };
  return (
    <main className="chess-shell flex min-h-screen items-center justify-center px-5 py-10">
      <div className="animate-rise w-full max-w-5xl border border-white/10 bg-[#151515] shadow-2xl">
        <div className="grid md:grid-cols-[1.05fr_.95fr]">
          <div className="relative overflow-hidden border-b border-white/10 px-7 py-10 md:border-b-0 md:border-r md:px-12 md:py-16">
            <div className="absolute -right-10 -top-16 select-none text-[19rem] font-black leading-none text-[#c49a52]/[.07]">♞</div>
            <div className="relative">
              <div className="mb-14 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-[#c49a52]"><span className="h-2 w-2 bg-[#c49a52]" /> Rookroom / LAN</div>
              <h1 className="max-w-md text-5xl font-extrabold leading-[.95] tracking-[-.04em] text-[#f6f2e9] md:text-7xl">Chess,<br /><span className="text-[#c49a52]">side by side.</span></h1>
              <p className="mt-7 max-w-sm text-sm leading-7 text-[#a9a59c]">A private chess room for your local network. No accounts. No internet. Just two boards, one match.</p>
              <div className="mt-12 flex items-center gap-5 text-[10px] uppercase tracking-[0.17em] text-[#706e68]"><span>Server authoritative</span><span className="h-px w-8 bg-[#c49a52]/50" /><span>{connected ? 'Ready to connect' : 'Connecting...'}</span></div>
            </div>
          </div>
          <div className="px-7 py-10 md:px-12 md:py-16">
            {mode === 'home' ? <>
              <div className="mb-10"><div className="text-xs uppercase tracking-[0.22em] text-[#a9a59c]">Start a match</div><h2 className="mt-2 text-2xl font-bold">Choose your seat.</h2></div>
              <div className="space-y-3">
                <button onClick={() => setMode('create')} className="group flex w-full items-center justify-between border border-[#c49a52] bg-[#c49a52] px-5 py-4 text-left text-sm font-bold uppercase tracking-[0.14em] text-[#171717] transition hover:bg-[#e0b96f]"><span>Create game</span><span className="text-xl transition group-hover:translate-x-1">→</span></button>
                <button onClick={() => setMode('join')} className="group flex w-full items-center justify-between border border-white/15 px-5 py-4 text-left text-sm font-bold uppercase tracking-[0.14em] text-[#f6f2e9] transition hover:border-[#c49a52] hover:text-[#c49a52]"><span>Join game</span><span className="text-xl transition group-hover:translate-x-1">→</span></button>
              </div>
              <div className="mt-6">{debug}</div>
            </> : <form onSubmit={submit}>
              <button type="button" onClick={() => setMode('home')} className="mb-10 text-[10px] uppercase tracking-[0.18em] text-[#a9a59c] hover:text-[#f6f2e9]">← Back</button>
              <div className="mb-8"><div className="text-xs uppercase tracking-[0.22em] text-[#a9a59c]">{mode === 'create' ? 'New room' : 'Existing room'}</div><h2 className="mt-2 text-2xl font-bold">{mode === 'create' ? 'Open the board.' : 'Enter the room.'}</h2></div>
              <label className="mb-5 block"><span className="mb-2 block text-[10px] uppercase tracking-[0.17em] text-[#a9a59c]">Your name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} placeholder="Player" className="w-full border border-white/15 bg-[#101010] px-4 py-3 text-sm text-[#f6f2e9] outline-none transition placeholder:text-[#706e68] focus:border-[#c49a52]" /></label>
              {mode === 'create' && <label className="mb-5 block"><span className="mb-2 block text-[10px] uppercase tracking-[0.17em] text-[#a9a59c]">Time control</span><select value={timeControl} onChange={(event) => setTimeControl(event.target.value)} className="w-full border border-white/15 bg-[#101010] px-4 py-3 text-sm text-[#f6f2e9] outline-none transition focus:border-[#c49a52]">{TIME_CONTROL_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.options.map((option) => <option key={option} value={option}>{option}</option>)}</optgroup>)}</select></label>}
              {mode === 'join' && <label className="mb-5 block"><span className="mb-2 block text-[10px] uppercase tracking-[0.17em] text-[#a9a59c]">Room code</span><input value={roomCode} onChange={(event) => setRoomCode(event.target.value)} maxLength={5} required placeholder="A7K92" className="mono w-full border border-white/15 bg-[#101010] px-4 py-3 text-sm uppercase tracking-[0.25em] text-[#f6f2e9] outline-none transition placeholder:text-[#706e68] focus:border-[#c49a52]" /></label>}
              {error && <p className="mb-5 border border-[#c8816d]/40 bg-[#c8816d]/10 px-3 py-3 text-xs leading-5 text-[#e3a08e]">{error}</p>}
              <button type="submit" className="w-full bg-[#c49a52] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-[#171717] transition hover:bg-[#e0b96f]">{mode === 'create' ? 'Create game' : 'Join game'}</button>
              <div className="mt-6">{debug}</div>
            </form>}
          </div>
        </div>
      </div>
    </main>
  );
}
