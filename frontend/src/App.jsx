import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import ChessBoard from './components/ChessBoard';
import DebugPanel from './components/DebugPanel';
import GameInfo from './components/GameInfo';
import Lobby from './components/Lobby';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
const sessionKey = 'rookroom-session';
const roomKey = 'rookroom-room';
const createSessionId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};
const getSessionId = () => {
  let id = localStorage.getItem(sessionKey);
  if (!id) { id = createSessionId(); localStorage.setItem(sessionKey, id); }
  return id;
};

export default function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
  const [socketId, setSocketId] = useState('');
  const [lastEvent, setLastEvent] = useState('socket initialization');
  const [lastError, setLastError] = useState('');
  const [screen, setScreen] = useState('lobby');
  const [myColor, setMyColor] = useState(null);
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rematchRequested, setRematchRequested] = useState(false);

  const logSocketEvent = (eventName, payload) => {
    console.log(`[Socket.IO] ${eventName}`, payload ?? '');
    setLastEvent(eventName);
  };

  const showSocketError = (message) => {
    const text = message || 'The connection to the chess server failed.';
    setLastError(text);
    setError(text);
  };

  useEffect(() => {
    const socket = io(SERVER_URL, { reconnection: true });
    socketRef.current = socket;
    socket.on('connect', () => {
      logSocketEvent('connect', { id: socket.id, url: SERVER_URL });
      setConnected(true);
      setConnectionStatus('CONNECTED');
      setSocketId(socket.id);
      const savedRoom = localStorage.getItem(roomKey);
      if (savedRoom) socket.emit('reconnectGame', { roomCode: savedRoom, sessionId: getSessionId() });
    });
    socket.on('connect_error', (error) => { logSocketEvent('connect_error', error.message); setConnected(false); setConnectionStatus('CONNECTION ERROR'); showSocketError(`Connection error: ${error.message}`); });
    socket.on('disconnect', (reason) => { logSocketEvent('disconnect', reason); setConnected(false); setSocketId(''); setConnectionStatus('DISCONNECTED'); showSocketError(`Disconnected: ${reason}`); });
    socket.on('error', (error) => { logSocketEvent('error', error); showSocketError(error?.message || String(error)); });
    socket.on('errorMessage', (message) => { logSocketEvent('errorMessage', message); showSocketError(message); });
    socket.on('gameError', (message) => { logSocketEvent('gameError', message); showSocketError(message); });
    socket.on('gameCreated', ({ roomCode, player, state: nextState }) => { logSocketEvent('gameCreated', { roomCode, player, state: nextState }); localStorage.setItem(roomKey, roomCode); setMyColor(player); setState(nextState); setScreen('game'); setError(''); });
    socket.on('gameJoined', ({ roomCode, player, state: nextState }) => { logSocketEvent('gameJoined', { roomCode, player, state: nextState }); localStorage.setItem(roomKey, roomCode); setMyColor(player); setState(nextState); setScreen('game'); setError(''); setNotice(''); });
    socket.on('playerJoined', (nextState) => { logSocketEvent('playerJoined', nextState); setState(nextState); setScreen('game'); });
    socket.on('gameState', (nextState) => { logSocketEvent('gameState', nextState); setState(nextState); setScreen('game'); });
    socket.on('moveMade', ({ state: nextState }) => { logSocketEvent('moveMade', nextState); setState(nextState); });
    socket.on('invalidMove', (message) => { logSocketEvent('invalidMove', message); setNotice(message); setTimeout(() => setNotice(''), 3000); });
    socket.on('gameOver', (nextState) => setState(nextState));
    socket.on('playerDisconnected', ({ message, state: nextState }) => { setState(nextState); setNotice(message); });
    socket.on('playerReconnected', (nextState) => { setState(nextState); setNotice('Opponent reconnected.'); setTimeout(() => setNotice(''), 2500); });
    socket.on('rematchAccepted', ({ started, state: nextState }) => { setState(nextState); setRematchRequested(!started); if (started) setNotice('Rematch started. Good luck.'); });
    return () => socket.disconnect();
  }, []);

  const emitIfConnected = (eventName, payload) => {
    const socket = socketRef.current;
    logSocketEvent(`${eventName} clicked`, payload);
    if (!socket || !socket.connected) {
      showSocketError(`Cannot ${eventName === 'createGame' ? 'create' : 'join'} a game because the server is not connected.`);
      return false;
    }
    setError('');
    logSocketEvent(eventName, payload);
    socket.emit(eventName, payload);
    return true;
  };
  const createGame = (name) => emitIfConnected('createGame', { sessionId: getSessionId(), name });
  const joinGame = (roomCode, name) => emitIfConnected('joinGame', { roomCode, sessionId: getSessionId(), name });
  const makeMove = (move) => socketRef.current?.emit('makeMove', move);
  const resign = () => socketRef.current?.emit('resign');
  const requestRematch = () => { setRematchRequested(true); socketRef.current?.emit('requestRematch'); };
  const returnToLobby = () => { localStorage.removeItem(roomKey); setState(null); setMyColor(null); setScreen('lobby'); setRematchRequested(false); setNotice(''); };

  if (screen === 'lobby' || !state) return <Lobby onCreate={createGame} onJoin={joinGame} error={error} connected={connected} debug={<DebugPanel status={connectionStatus} serverUrl={SERVER_URL} socketId={socketId} lastEvent={lastEvent} lastError={lastError} />} />;
  const finished = state.status?.type !== 'playing';
  const winnerText = state.status?.winner ? `${state.status.winner === 'white' ? 'White' : 'Black'} wins` : 'Draw game';
  return <main className="chess-shell min-h-screen px-4 py-5 text-[#f6f2e9] sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-[1320px] items-center justify-between border-b border-white/10 pb-5">
      <button onClick={returnToLobby} className="flex items-center gap-3 text-left"><span className="flex h-8 w-8 items-center justify-center bg-[#c49a52] text-lg text-[#171717]">♞</span><span><span className="block text-sm font-extrabold tracking-[0.08em]">ROOKROOM</span><span className="mono block text-[9px] uppercase tracking-[0.18em] text-[#706e68]">Private LAN chess</span></span></button>
      <div className="text-right"><div className="text-[10px] uppercase tracking-[0.18em] text-[#a9a59c]">Room</div><div className="mono text-lg font-medium tracking-[0.2em] text-[#c49a52]">{state.roomCode}</div></div>
    </header>
    {notice && <div className="mx-auto mt-4 max-w-[1320px] border border-[#c49a52]/40 bg-[#c49a52]/10 px-4 py-3 text-center text-xs text-[#e6bd73]">{notice}</div>}
    <div className="mx-auto mt-4 max-w-[1320px]"><DebugPanel status={connectionStatus} serverUrl={SERVER_URL} socketId={socketId} lastEvent={lastEvent} lastError={lastError} /></div>
    <div className="mx-auto grid max-w-[1320px] items-start gap-6 py-7 lg:grid-cols-[minmax(420px,760px)_340px] lg:justify-center lg:py-10">
      <section><div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[0.2em] text-[#a9a59c]">{myColor} side</div><h1 className="text-2xl font-extrabold tracking-[-.02em] sm:text-3xl">Your match</h1></div><div className="text-right text-[10px] uppercase tracking-[0.16em] text-[#706e68]">{state.history.length ? `Move ${Math.ceil(state.history.length / 2)}` : 'Opening position'}<br />{state.status.label}</div></div><ChessBoard fen={state.fen} myColor={myColor} turn={state.turn} lastMove={state.lastMove} onMove={makeMove} disabled={finished || !state.players?.every((player) => player.connected)} /></section>
      <GameInfo state={state} myColor={myColor} connected={connected} onResign={resign} onRequestRematch={requestRematch} rematchRequested={rematchRequested} />
    </div>
    {finished && <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 px-5"><div className="animate-rise w-full max-w-sm border border-[#c49a52]/50 bg-[#171717] p-8 text-center shadow-2xl"><div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c49a52]">Game complete</div><h2 className="mt-3 text-3xl font-extrabold uppercase tracking-[-.03em]">{state.status.label}</h2><p className="mt-3 text-sm text-[#a9a59c]">{winnerText}</p><div className="mt-8 grid gap-3"><button onClick={requestRematch} className="bg-[#c49a52] px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#171717]">{rematchRequested ? 'Waiting for opponent' : 'Request rematch'}</button><button onClick={returnToLobby} className="border border-white/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#f6f2e9]">Return to lobby</button></div></div></div>}
  </main>;
}
