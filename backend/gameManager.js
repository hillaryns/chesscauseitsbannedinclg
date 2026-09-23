import { Chess } from 'chess.js';

const ROOM_CODE_LENGTH = 5;
const RECONNECT_GRACE_MS = 60_000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

export function serializeRoom(room) {
  const status = gameStatus(room);
  return {
    roomCode: room.code,
    fen: room.chess.fen(),
    history: room.chess.history({ verbose: true }),
    turn: room.chess.turn() === 'w' ? 'white' : 'black',
    status,
    players: [...room.players.values()].map(playerView),
    rematch: [...room.rematch],
    lastMove: room.lastMove,
  };
}

export function createGame({ socketId, sessionId, name }) {
  const room = {
    code: createRoomCode(),
    chess: new Chess(),
    players: new Map([[sessionId, { socketId, sessionId, name: name || 'Player 1', color: 'white' }]]),
    rematch: new Set(),
    lastMove: null,
    result: null,
    disconnectTimers: new Map(),
  };
  rooms.set(room.code, room);
  return room;
}

export function joinGame({ code, socketId, sessionId, name }) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  const room = getRoom(normalizedCode);
  if (!room) return { error: 'That room code does not exist.' };

  const returningPlayer = getPlayerBySession(room, sessionId);
  if (returningPlayer) {
    clearTimeout(room.disconnectTimers.get(sessionId));
    room.disconnectTimers.delete(sessionId);
    returningPlayer.socketId = socketId;
    if (name) returningPlayer.name = name;
    return { room, reconnected: true, player: returningPlayer };
  }

  if (room.players.size >= 2) return { error: 'That game already has two players.' };
  const player = { socketId, sessionId, name: name || 'Player 2', color: 'black' };
  room.players.set(sessionId, player);
  return { room, reconnected: false, player };
}

export function findRoomForSocket(socketId) {
  return [...rooms.values()].find((room) => getPlayerBySocket(room, socketId));
}

export function makeMove(room, socketId, moveInput) {
  const player = getPlayerBySocket(room, socketId);
  if (!player) return { error: 'You are not part of this game.' };
  if (gameStatus(room).type !== 'playing') return { error: 'This game has already finished.' };
  if ((room.chess.turn() === 'w' ? 'white' : 'black') !== player.color) return { error: 'It is not your turn.' };

  try {
    const move = room.chess.move({ from: moveInput.from, to: moveInput.to, promotion: moveInput.promotion || 'q' });
    room.lastMove = { from: move.from, to: move.to };
    return { move, room };
  } catch {
    return { error: 'That move is not legal.' };
  }
}

export function resign(room, socketId) {
  const player = getPlayerBySocket(room, socketId);
  if (!player) return { error: 'You are not part of this game.' };
  if (gameStatus(room).type !== 'playing') return { error: 'This game has already finished.' };
  room.result = { type: 'resignation', winner: player.color === 'white' ? 'black' : 'white', label: `${player.color === 'white' ? 'White' : 'Black'} resigned` };
  return { room };
}

export function requestRematch(room, socketId) {
  const player = getPlayerBySocket(room, socketId);
  if (!player) return { error: 'You are not part of this game.' };
  room.rematch.add(player.sessionId);
  if (room.rematch.size === room.players.size && room.players.size === 2) {
    room.chess = new Chess();
    room.result = null;
    room.lastMove = null;
    room.rematch.clear();
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
  if (room.players.size === 0) rooms.delete(room.code);
}
