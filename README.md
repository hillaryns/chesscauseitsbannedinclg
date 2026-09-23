# Rookroom LAN Chess

A real-time two-player chess application for devices on the same Wi-Fi network. The backend is authoritative: every move is validated by `chess.js` on the server before it is broadcast to both clients.

## Requirements

- Node.js 18 or newer
- Two devices connected to the same local network
- Windows Firewall access for Node.js on the host computer

## Installation

From the `chess-app` directory:

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

## Run the backend

Open a terminal in `chess-app/backend`:

```powershell
npm run dev
```

The server listens on `0.0.0.0:5000` and prints both URLs:

```text
================================
 LAN CHESS SERVER
================================
Local:   http://localhost:5000
Network: http://192.168.1.15:5000
```

The Network URL is the address other devices must use. The detected address depends on the host computer's active network adapter.

## Run the frontend

Open another terminal in `chess-app/frontend`:

```powershell
npm run dev
```

On the host computer, open the Vite URL shown in the terminal, usually `http://localhost:5173`.

For another device on the same Wi-Fi, use the host computer's LAN IP and Vite port, for example:

```text
http://192.168.1.15:5173
```

The frontend derives the Socket.IO server URL from the browser hostname and port `5000` by default. To set it explicitly, copy `.env.example` to `.env` and set:

```text
VITE_SERVER_URL=http://192.168.1.15:5000
```

Restart Vite after changing `.env`.

## Finding the host IP on Windows

Run this in PowerShell:

```powershell
ipconfig
```

Use the `IPv4 Address` for the Wi-Fi adapter, commonly an address beginning with `192.168.` or `10.`. Do not use `127.0.0.1` for the second device.

## Windows Firewall

When Windows asks whether Node.js can communicate on the network, allow it on Private networks. If the prompt was dismissed, create an inbound rule for TCP ports `5000` and `5173`, or allow Node.js through Windows Defender Firewall. Both devices must be on the same Wi-Fi network, and guest Wi-Fi isolation must be disabled by the router.

## Playing a game

1. Player one opens the frontend and chooses **Create game**.
2. Share the five-character room code with player two.
3. Player two opens the frontend on the LAN and chooses **Join game**.
4. White and Black are assigned automatically.
5. Drag a piece or click a piece and then its destination square. The server accepts only legal moves for the correct player and turn.
6. Use **Resign** to end the game. A rematch starts only after both players request one.

## Architecture

- `frontend/` is a Vite React application using Tailwind CSS, `react-chessboard`, and `socket.io-client`.
- `backend/server.js` exposes a small Express health endpoint and Socket.IO events.
- `backend/gameManager.js` owns rooms, player colors, sessions, disconnect grace periods, rematches, FEN, move history, and game results.
- The server stores active games in memory only. Restarting the backend ends all rooms.
- Clients send `makeMove` requests. The backend applies the request to its `chess.js` instance, then broadcasts `moveMade` and the complete serialized state to both players.
- Clients never decide whether a move is legal. Client-side chess logic is used only for move highlighting and interaction.

Important events include `createGame`, `joinGame`, `reconnectGame`, `makeMove`, `moveMade`, `invalidMove`, `gameState`, `resign`, `gameOver`, `requestRematch`, `rematchAccepted`, `playerDisconnected`, and `playerReconnected`.

## Game endings and reconnection

The server reports checkmate, stalemate, threefold repetition, the fifty-move rule, insufficient material, and resignation. A disconnected player has a 60-second grace period; returning with the same browser session restores their color, board, history, and game state.

## Production build

```powershell
cd frontend
npm run build
```

The generated static files are in `frontend/dist`. For LAN development, use `npm run dev` so Vite serves on all interfaces.
