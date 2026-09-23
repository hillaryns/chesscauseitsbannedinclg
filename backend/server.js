import os from 'node:os';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import {
  createGame, disconnectPlayer, findRoomForSocket, joinGame, makeMove,
  removePlayer, requestRematch, resign, serializeRoom,
} from './gameManager.js';

const PORT = Number(process.env.PORT) || 5000;
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://172.18.239.181:5173',
];
const lanOriginPattern = /^http:\/\/(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+):5173$/;
const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin) || lanOriginPattern.test(origin);
const corsOptions = {
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
};
const app = express();
app.use(cors(corsOptions));
app.get('/health', (_request, response) => response.json({ ok: true, service: 'lan-chess' }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });

function emitState(room) {
  io.to(room.code).emit('gameState', serializeRoom(room));
}

io.on('connection', (socket) => {
  socket.on('createGame', ({ sessionId, name } = {}) => {
    if (!sessionId) return socket.emit('errorMessage', 'A session could not be created. Please refresh.');
    const room = createGame({ socketId: socket.id, sessionId, name });
    socket.join(room.code);
    socket.data.sessionId = sessionId;
    socket.emit('gameCreated', { roomCode: room.code, player: 'white', state: serializeRoom(room) });
  });

  socket.on('joinGame', ({ roomCode, sessionId, name } = {}) => {
    if (!sessionId) return socket.emit('errorMessage', 'A session could not be created. Please refresh.');
    const result = joinGame({ code: roomCode, socketId: socket.id, sessionId, name });
    if (result.error) return socket.emit('errorMessage', result.error);
    const { room, player, reconnected } = result;
    socket.join(room.code);
    socket.data.sessionId = sessionId;
    const state = serializeRoom(room);
    socket.emit('gameJoined', { roomCode: room.code, player: player.color, reconnected, state });
    socket.to(room.code).emit(reconnected ? 'playerReconnected' : 'playerJoined', state);
    emitState(room);
  });

  socket.on('reconnectGame', ({ roomCode, sessionId, name } = {}) => {
    const result = joinGame({ code: roomCode, socketId: socket.id, sessionId, name });
    if (result.error || !result.reconnected) return socket.emit('errorMessage', 'Your previous game is no longer available.');
    socket.join(result.room.code);
    socket.data.sessionId = sessionId;
    socket.emit('gameJoined', { roomCode: result.room.code, player: result.player.color, reconnected: true, state: serializeRoom(result.room) });
    socket.to(result.room.code).emit('playerReconnected', serializeRoom(result.room));
    emitState(result.room);
  });

  socket.on('makeMove', (moveInput = {}) => {
    const room = findRoomForSocket(socket.id);
    if (!room) return socket.emit('invalidMove', 'You are not currently in a game.');
    const result = makeMove(room, socket.id, moveInput);
    if (result.error) return socket.emit('invalidMove', result.error);
    io.to(room.code).emit('moveMade', { move: result.move, state: serializeRoom(room) });
  });

  socket.on('resign', () => {
    const room = findRoomForSocket(socket.id);
    if (!room) return socket.emit('errorMessage', 'You are not currently in a game.');
    const result = resign(room, socket.id);
    if (result.error) return socket.emit('errorMessage', result.error);
    io.to(room.code).emit('gameOver', serializeRoom(room));
  });

  socket.on('requestRematch', () => {
    const room = findRoomForSocket(socket.id);
    if (!room) return socket.emit('errorMessage', 'You are not currently in a game.');
    const result = requestRematch(room, socket.id);
    if (result.error) return socket.emit('errorMessage', result.error);
    io.to(room.code).emit('rematchAccepted', { started: result.started, state: serializeRoom(room) });
  });

  socket.on('disconnect', () => {
    const room = findRoomForSocket(socket.id);
    if (!room) return;
    const player = disconnectPlayer(room, socket.id, (sessionId) => removePlayer(room, sessionId));
    if (player) {
      socket.to(room.code).emit('playerDisconnected', { message: 'Opponent disconnected. Waiting for reconnection...', state: serializeRoom(room) });
    }
  });
});

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    }
  }
  return 'your-local-ip';
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('================================');
  console.log(' LAN CHESS SERVER');
  console.log('================================');
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://${getLanIp()}:${PORT}`);
});
