import { Chess } from 'chess.js';

const ROOM_CODE_LENGTH = 5;
const RECONNECT_GRACE_MS = 60_000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const TIME_CONTROLS = {
  '1+0': { id: '1+0', label: '1 + 0', baseMs: 60_000, incrementMs: 0 },
  '2+1': { id: '2+1', label: '2 + 1', baseMs: 120_000, incrementMs: 1_000 },
  '3+0': { id: '3+0', label: '3 + 0', baseMs: 180_000, incrementMs: 0 },
  '3+2': { id: '3+2', label: '3 + 2', baseMs: 180_000, incrementMs: 2_000 },
  '5+0': { id: '5+0', label: '5 + 0', baseMs: 300_000, incrementMs: 0 },
  '5+3': { id: '5+3', label: '5 + 3', baseMs: 300_000, incrementMs: 3_000 },
  '10+0': { id: '10+0', label: '10 + 0', baseMs: 600_000, incrementMs: 0 },
  '10+5': { id: '10+5', label: '10 + 5', baseMs: 600_000, incrementMs: 5_000 },
  '15+10': { id: '15+10', label: '15 + 10', baseMs: 900_000, incrementMs: 10_000 },
};

const DEFAULT_TIME_CONTROL = '5+0';
const rooms = new Map();

function createRoomCode() {
  let code;
  do {
    code = Array.from({ length: ROOM_CODE_LENGTH }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function getRoom(code) {
  return rooms.get(String(code || '').trim().toUpperCase());
}

function getPlayerBySocket(room, socketId) {
  return [...room.players.values()].find((player) => player.socketId === socketId);
}

function getPlayerBySession(room, sessionId) {
  return room.players.get(sessionId);
}

function colorToMove(room) {
  return room.chess.turn() === 'w' ? 'white' : 'black';
}

function getTimeControl(timeControl) {
  const id = typeof timeControl === 'string' ? timeControl : timeControl?.id;
  return TIME_CONTROLS[id] || TIME_CONTROLS[DEFAULT_TIME_CONTROL];
}

function createClock(timeControl) {
  return {
    whiteMs: timeControl.baseMs,
    blackMs: timeControl.baseMs,
    activeColor: 'white',
    startedAt: null,
    timer: null,
  };
}

function clearClockTimer(room) {
  if (room.clock.timer) clearTimeout(room.clock.timer);
  room.clock.timer = null;
}

function stopClock(room) {
  clearClockTimer(room);
  room.clock.startedAt = null;
}

function canRunClock(room) {
  return !room.result && room.players.size === 2 && gameStatus(room).type === 'playing';
}

function clockKey(color) {
  return color === 'white' ? 'whiteMs' : 'blackMs';
}

function finishOnTime(room, color) {
  room.clock[clockKey(color)] = 0;
  room.result = {
    type: 'timeout',
    winner: color === 'white' ? 'black' : 'white',
    label: `${color === 'white' ? 'White' : 'Black'} ran out of time`,
  };
  stopClock(room);
}

function settleActiveClock(room, now = Date.now()) {
  if (room.clock.startedAt === null || !canRunClock(room)) return { expired: false };

  const color = room.clock.activeColor;
  const key = clockKey(color);
  const elapsed = Math.max(0, now - room.clock.startedAt);
  room.clock[key] = Math.max(0, room.clock[key] - elapsed);
  room.clock.startedAt = now;

  if (room.clock[key] === 0) {
    finishOnTime(room, color);
    return { expired: true, color };
  }

  return { expired: false };
}

function armClock(room) {
  clearClockTimer(room);
  if (room.clock.startedAt === null || !canRunClock(room)) return;

  const key = clockKey(room.clock.activeColor);
  const remaining = room.clock[key];
  room.clock.timer = setTimeout(() => {
    room.clock.timer = null;
    const result = settleActiveClock(room);
    if (result.expired) room.onClockExpired?.(room);
    else armClock(room);
  }, Math.max(1, remaining + 1));
}

function startClock(room, now = Date.now()) {
  clearClockTimer(room);
  if (!canRunClock(room)) {
    room.clock.startedAt = null;
    return;
  }

  room.clock.activeColor = colorToMove(room);
  room.clock.startedAt = now;
  armClock(room);
}

function clockView(room, now = Date.now()) {
  const clock = room.clock;
  let whiteMs = clock.whiteMs;
  let blackMs = clock.blackMs;
  const running = clock.startedAt !== null && !room.result && gameStatus(room).type === 'playing';

  if (running) {
    const elapsed = Math.max(0, now - clock.startedAt);
    if (clock.activeColor === 'white') whiteMs = Math.max(0, whiteMs - elapsed);
    else blackMs = Math.max(0, blackMs - elapsed);
  }

  return {
    whiteMs,
    blackMs,
    activeColor: clock.activeColor,
    running,
    serverNow: now,
  };
}

function gameStatus(room) {
  const chess = room.chess;
  const halfmoveClock = Number(chess.fen().split(' ')[4]);
  if (room.result) return room.result;
  if (chess.isCheckmate()) return { type: 'checkmate', winner: chess.turn() === 'w' ? 'black' : 'white', label: 'Checkmate' };
  if (chess.isStalemate()) return { type: 'stalemate', winner: null, label: 'Stalemate' };
  if (chess.isThreefoldRepetition()) return { type: 'threefold', winner: null, label: 'Draw by repetition' };
  if (halfmoveClock >= 100) return { type: 'fifty-move', winner: null, label: 'Draw by fifty-move rule' };
  if (chess.isInsufficientMaterial()) return { type: 'insufficient-material', winner: null, label: 'Draw by insufficient material' };
  return { type: 'playing', winner: null, label: chess.isCheck() ? 'Check' : 'In progress' };
}

function playerView(player) {
  return player ? {
    name: player.name,
    color: player.color,
    connected: Boolean(player.socketId),
    sessionId: player.sessionId,
  } : null;
}

export function serializeRoom(room, now = Date.now()) {
  const status = gameStatus(room);
  return {
    roomCode: room.code,
    fen: room.chess.fen(),
    history: room.chess.history({ verbose: true }),
    turn: colorToMove(room),
    status,
    players: [...room.players.values()].map(playerView),
    rematch: [...room.rematch],
    lastMove: room.lastMove,
    timeControl: {
      id: room.timeControl.id,
      label: room.timeControl.label,
      baseMs: room.timeControl.baseMs,
      incrementMs: room.timeControl.incrementMs,
    },
    clock: clockView(room, now),
  };
}

export function createGame({ socketId, sessionId, name, timeControl, onClockExpired }) {
  const resolvedTimeControl = getTimeControl(timeControl);
  const room = {
    code: createRoomCode(),
    chess: new Chess(),
    players: new Map([[sessionId, { socketId, sessionId, name: name || 'Player 1', color: 'white' }]]),
    rematch: new Set(),
    lastMove: null,
    result: null,
    disconnectTimers: new Map(),
    timeControl: resolvedTimeControl,
    clock: createClock(resolvedTimeControl),
    onClockExpired,
  };
  rooms.set(room.code, room);
  return room;
}

export function joinGame({ code, socketId, sessionId, name }, now = Date.now()) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  const room = getRoom(normalizedCode);
  if (!room) return { error: 'That room code does not exist.' };

  const returningPlayer = getPlayerBySession(room, sessionId);
  if (returningPlayer) {
    clearTimeout(room.disconnectTimers.get(sessionId));
    room.disconnectTimers.delete(sessionId);
    returningPlayer.socketId = socketId;
    if (name) returningPlayer.name = name;
    const clockResult = settleActiveClock(room, now);
    if (!clockResult.expired && room.clock.startedAt === null) startClock(room, now);
    return { room, reconnected: true, player: returningPlayer, timedOut: clockResult.expired };
  }

  if (room.players.size >= 2) return { error: 'That game already has two players.' };
  const player = { socketId, sessionId, name: name || 'Player 2', color: 'black' };
  room.players.set(sessionId, player);
  startClock(room, now);
  return { room, reconnected: false, player, timedOut: Boolean(room.result?.type === 'timeout') };
}

export function findRoomForSocket(socketId) {
  return [...rooms.values()].find((room) => getPlayerBySocket(room, socketId));
}

export function makeMove(room, socketId, moveInput, now = Date.now()) {
  const player = getPlayerBySocket(room, socketId);
  if (!player) return { error: 'You are not part of this game.' };
  if (gameStatus(room).type !== 'playing') return { error: 'This game has already finished.' };
  if (colorToMove(room) !== player.color) return { error: 'It is not your turn.' };

  const clockResult = settleActiveClock(room, now);
  if (clockResult.expired) return { error: 'Your time has expired.', timeout: true, room };

  try {
    const move = room.chess.move({ from: moveInput.from, to: moveInput.to, ...(moveInput.promotion ? { promotion: moveInput.promotion } : {}) });
    room.lastMove = { from: move.from, to: move.to };
    room.clock[clockKey(player.color)] += room.timeControl.incrementMs;

    if (gameStatus(room).type === 'playing') startClock(room, now);
    else stopClock(room);

    return { move, room };
  } catch {
    armClock(room);
    return { error: 'That move is not legal.' };
  }
}

export function resign(room, socketId) {
  const player = getPlayerBySocket(room, socketId);
  if (!player) return { error: 'You are not part of this game.' };
  if (gameStatus(room).type !== 'playing') return { error: 'This game has already finished.' };
  room.result = { type: 'resignation', winner: player.color === 'white' ? 'black' : 'white', label: `${player.color === 'white' ? 'White' : 'Black'} resigned` };
  stopClock(room);
  return { room };
}

export function requestRematch(room, socketId, now = Date.now()) {
  const player = getPlayerBySocket(room, socketId);
  if (!player) return { error: 'You are not part of this game.' };
  room.rematch.add(player.sessionId);
  if (room.rematch.size === room.players.size && room.players.size === 2) {
    stopClock(room);
    room.chess = new Chess();
    room.result = null;
    room.lastMove = null;
    room.clock = createClock(room.timeControl);
    room.rematch.clear();
    startClock(room, now);
    return { room, started: true };
  }
  return { room, started: false };
}

export function disconnectPlayer(room, socketId, onExpired) {
  const player = getPlayerBySocket(room, socketId);
  if (!player) return null;
  player.socketId = null;
  const timer = setTimeout(() => {
    room.disconnectTimers.delete(player.sessionId);
    onExpired(player.sessionId);
  }, RECONNECT_GRACE_MS);
  room.disconnectTimers.set(player.sessionId, timer);
  return player;
}

export function removePlayer(room, sessionId) {
  room.players.delete(sessionId);
  if (room.players.size < 2) stopClock(room);
  if (room.players.size === 0) rooms.delete(room.code);
}
