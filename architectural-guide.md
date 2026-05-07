# Chess App — Architecture & Navigation Guide

## The Big Picture

This app has **two separate programs** that work together:

1. **`chess-client/`** — What the user sees in the browser (React app, runs on port 5173)
2. **`chess-server/`** — The backend that handles auth, real-time games, and the database (Fastify app, runs on port 3001)

They talk to each other in two ways:
- **HTTP requests** (login, register, fetching user data)
- **WebSockets via Socket.IO** (real-time move sync during online games)

There is also a **`shared/`** folder that is currently mostly empty — it is a placeholder for code that both the client and server might need someday (like shared TypeScript types).

---

## Folder Map — "Where Do I Find X?"

```
chess/
├── chess-client/          ← Everything the user sees
│   └── src/
│       ├── pages/         ← Contains multiple files, two of them are = 1. OnlineGame.tsx (layout, player bars, clocks, result strip, dialogs (abort/resign), promotion dialog).
|       |                                         2. OnlineGame.css — all styles for the game page (board sizing, responsive breakpoints, history panel, header).
│       ├── components/    ← Reusable UI pieces (board, move list, etc.)
│       ├── hooks/         ← Game logic (chess rules, socket events)
│       ├── stores/        ← Global app state (who is logged in)
│       ├── api/           ← Functions that call the server
│       ├── socket.ts      ← WebSocket connection setup
│       ├── App.tsx        ← Defines all routes
│       └── index.css      ← Global styles / CSS variables
│
└── chess-server/          ← Everything that runs on the server
    └── src/
        ├── modules/
        │   ├── auth/      ← Register, login, logout, refresh token
        │   └── game/      ← Real-time game logic (matchmaking, moves)
        ├── socket/        ← WebSocket server setup
        ├── db/            ← Database connection + migration runner
        └── index.ts       ← Server entry point (wires everything together)
```

---

## "I Want to Change..." — Quick Reference

| What you want to change | File to edit |
|---|---|
| The home page | `chess-client/src/pages/Home.tsx` |
| The login page | `chess-client/src/pages/auth/Login.tsx` |
| The register page | `chess-client/src/pages/auth/Register.tsx` |
| The local game screen | `chess-client/src/pages/LocalGame.tsx` |
| The online game screen | `chess-client/src/pages/OnlineGame.tsx` |
| Which routes exist / navigation | `chess-client/src/App.tsx` |
| Global colors / CSS variables | `chess-client/src/index.css` |
| The chess board component | `chess-client/src/components/Chessboard.tsx` |
| The move list component | `chess-client/src/components/MoveList.tsx` |
| Local game rules/logic | `chess-client/src/hooks/useChessGame.ts` |
| Online game logic (socket events) | `chess-client/src/hooks/useOnlineGame.ts` |
| What data "logged in user" holds | `chess-client/src/stores/authStore.ts` |
| How HTTP calls to server are made | `chess-client/src/api/client.ts` |
| Register/login/logout API functions | `chess-client/src/api/auth.ts` |
| Login/register/logout server logic | `chess-server/src/modules/auth/auth.service.ts` |
| Server HTTP routes | `chess-server/src/modules/auth/auth.routes.ts` |
| Matchmaking (pairing two players) | `chess-server/src/modules/game/game-manager.ts` |
| Server-side move validation + DB save | `chess-server/src/modules/game/game.ts` |
| WebSocket event names (constants) | `chess-server/src/modules/game/game.events.ts` |
| Database schema (all tables) | `chess-server/migrations/001_initial.sql` |
| Server startup / plugin setup | `chess-server/src/index.ts` |

---

## How Each Part Works

### 1. Routing — `App.tsx`

This file is the "map" of the app. It says: *"when the URL is `/`, show `Home.tsx`; when it's `/play/local`, show `LocalGame.tsx`"* etc.

Some routes are **protected** — if you are not logged in and you try to visit `/play/online`, you get redirected to `/login` automatically. That is the `ProtectedRoute` wrapper.

### 2. Pages — `src/pages/`

Each file is one full screen. They are mostly just layout + UI — they delegate the heavy logic to **hooks**.

- **`Home.tsx`** — Landing page with "Play online", "Play local", user stats
- **`LocalGame.tsx`** — Two players on the same computer. No server needed after page loads
- **`OnlineGame.tsx`** — Connects to server via WebSocket, syncs moves in real-time
- **`auth/Login.tsx`** and **`auth/Register.tsx`** — Forms, validation, call the server

### 3. Hooks — `src/hooks/`

Hooks are where the real logic lives. Think of them as "smart helpers" that a page can use.

**`useChessGame.ts`** — Powers the local game:
- Uses `chess.js` to validate moves and know when it is checkmate
- Tracks the full move history (so you can click back to replay)
- Returns everything `LocalGame.tsx` needs: the board position, whose turn it is, game status

**`useOnlineGame.ts`** — Powers the online game:
- Manages the WebSocket connection (connecting, disconnecting)
- Listens for events from the server (`game_init`, `move_made`, `game_over`)
- Sends events to the server (`init_game` to find a match, `move` when you play)
- Keeps track of status: `idle` → `waiting` → `playing` → `over`

### 4. Global State — `src/stores/authStore.ts`

This is powered by **Zustand** — a simple state manager. It holds:
- `user` (id, username, email, rating)
- `accessToken` (the JWT needed for protected API calls)
- `isAuthenticated` (true/false)

Critically, this **persists to `localStorage`** — so if you refresh the page, you are still logged in. Any component in the app can read from this store.

### 5. API Layer — `src/api/`

These are plain functions that make HTTP requests to the server.

- `client.ts` — the base: adds the auth header, handles errors, returns JSON
- `auth.ts` — specific functions: `login()`, `register()`, `logout()`, `me()`

When you call `authApi.login(email, password)`, it does `POST http://localhost:3001/auth/login` and returns the result.

### 6. WebSocket — `src/socket.ts`

A singleton (only one instance ever created). When `useOnlineGame` needs to connect, it calls `getSocket(token)` which either creates a new Socket.IO connection or returns the existing one. The JWT token is sent during the handshake so the server knows who you are.

---

## How the Server Works

### Entry Point — `chess-server/src/index.ts`

This is where the server starts. It:
1. Creates a Fastify app
2. Registers plugins (CORS, cookies, JWT, rate limiting)
3. Registers auth routes
4. Starts listening on port 3001
5. **After** listening, attaches Socket.IO (this order matters — Socket.IO needs the server to be running first)

### Auth Module — `modules/auth/`

Three files with a clear split of responsibilities:

- **`auth.routes.ts`** — *"These URLs exist and map to these handlers"*
- **`auth.controller.ts`** — *"When a request comes in, parse it, call the service, send the response"*
- **`auth.service.ts`** — *"The actual logic: hash passwords, create users, issue tokens"*

The **refresh token** system works like this: your JWT access token lasts only 15 minutes (security). But you have a separate long-lived "refresh token" (7 days) stored in an httpOnly cookie (JavaScript cannot read it — more secure). When the access token expires, the client silently hits `/auth/refresh` to get a new one without making you log in again.

### Game Module — `modules/game/`

- **`game-manager.ts`** — Matchmaking. Keeps a `pendingUser` slot. When a player hits "Find a game", they either become the pending user (and wait), or they get paired with the existing pending user and a game starts.
- **`game.ts`** — One instance per active game. Holds the Chess.js board, the two players' sockets, and handles moves: validate → write to DB → notify opponent.
- **`game.events.ts`** — Just constants for event names (e.g. `'init_game'`, `'move_made'`) so you do not have magic strings all over the code.

### Database — `db/`

- **`client.ts`** — Sets up the PostgreSQL connection pool. Also exports a `sql` helper for writing safe parameterized queries (prevents SQL injection).
- **`migrate.ts`** — Runs the SQL migration files to create/update tables. You run this with `pnpm migrate` in `chess-server/`.

---

## Data Flow: What Happens When You Make a Move Online

```
You click a square on the board
       ↓
Chessground fires an event → handleMove() in OnlineGame.tsx
       ↓
useOnlineGame.makeMove(from, to) is called
       ↓
chess.js validates the move locally (instant feedback)
       ↓
socket.emit('move', { from, to }) → sent to server
       ↓
chess-server/src/socket/index.ts receives the event
       ↓
gameManager.handleMove(socket, from, to)
       ↓
game.ts: validates it is your turn + validates the move
       ↓
Writes the move to the `moves` table in PostgreSQL
       ↓
Emits 'move_made' only to your opponent's socket
       ↓
Opponent's useOnlineGame receives 'move_made'
       ↓
Opponent's board updates + it is now their turn
```

---

## Data Flow: Login

```
User fills login form (email + password)
       ↓
Login.tsx calls authApi.login(email, password)
       ↓
api/auth.ts sends POST http://localhost:3001/auth/login
       ↓
auth.controller.ts receives the request
       ↓
auth.service.ts checks email, compares bcrypt hash
       ↓
Server returns { user, accessToken } + sets refreshToken cookie
       ↓
authStore.setAuth(user, accessToken) — saved to localStorage
       ↓
App.tsx ProtectedRoute now allows access to /play/online
```

---

## The CSS System

All colors and spacing are defined as **CSS variables** in `chess-client/src/index.css`:

```css
--text         /* main text color */
--bg           /* background */
--bg-panel     /* card/panel background */
--border       /* border color */
--accent       /* highlight/button color */
--shadow       /* box shadow */
```

Components use these variables (e.g. `color: var(--text)`). Change a variable in `index.css` and it updates everywhere on the site.

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| UI Framework | React 19 | Building the interface |
| Language | TypeScript | Type-safe JavaScript |
| Build Tool | Vite | Fast dev server + bundler |
| Routing | React Router 7 | URL → component mapping |
| Global State | Zustand | Auth state (who is logged in) |
| HTTP Client | Fetch API | API calls to the server |
| WebSocket | Socket.IO Client | Real-time game sync |
| Chess Logic | chess.js | Move validation, FEN, PGN |
| Chess UI | Chessground | Board rendering (from Lichess) |
| Styling | CSS variables + inline styles | Theming and layout |
| Web Framework | Fastify 5 | HTTP server + routing |
| Real-time | Socket.IO Server | WebSocket events |
| Database | PostgreSQL (Neon) | Persistent storage |
| Auth | JWT + bcrypt | Secure login system |
| Package Manager | pnpm | Dependency management |

---

## Starting the App

```bash
# 1. Start the database (only needed first time or after restart)
docker-compose up -d

# 2. Run database migrations (only needed once, ever)
cd chess-server && pnpm migrate && cd ..

# 3. Start everything
pnpm dev
# Client runs at http://localhost:5173
# Server runs at http://localhost:3001
```

---

## Future Features (Roadmap)

The database schema already has tables ready for these, but the code is not built yet:

1. **Game history page** — see all your past games
2. **Engine analysis** — analyze a game with Stockfish (via BullMQ job queue + Redis)
3. **Ratings system** — Glicko ratings update after each game
4. **Snapfen** — upload a photo of a real board and get the FEN (board_image_uploads table)
