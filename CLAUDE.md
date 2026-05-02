# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack chess platform built as a monorepo with three packages:
- **chess-client**: React 19 + TypeScript + Vite frontend
- **chess-server**: Fastify 5 + TypeScript + PostgreSQL backend
- **shared**: Placeholder for shared types/utilities (currently minimal)

## Commands

### Root (run both services)
```bash
pnpm dev           # Start client + server concurrently
```

### Client (`chess-client/`)
```bash
pnpm dev           # Vite dev server (http://localhost:5173)
pnpm build         # tsc -b && vite build
pnpm lint          # ESLint
pnpm preview       # Preview production build
```

### Server (`chess-server/`)
```bash
pnpm dev           # tsx watch src/index.ts (http://localhost:3001)
pnpm build         # tsc
pnpm start         # node dist/index.js
pnpm migrate       # Run database migrations
```

### Infrastructure
```bash
docker-compose up -d   # Start PostgreSQL 16 (port 5432) and Redis 7 (port 6379)
```

**First-time setup**: `docker-compose up -d` → `cd chess-server && pnpm migrate` → `pnpm dev` from root.

## Architecture

### Backend (`chess-server/src/`)

**Fastify plugin-based API** on port 3001:
- Helmet, CORS (whitelists `http://localhost:5173`), rate limiting (100 req/min), JWT, cookies
- Routes registered under `src/routes/` — currently only `auth.ts`
- `src/db/client.ts`: pg connection pool (max 10 connections), SSL for Neon/production
- `src/db/migrate.ts`: reads SQL files from `migrations/` and executes them

**Authentication flow**: JWT access tokens (15m expiry, in-memory on client) + refresh tokens (7-day, HttpOnly cookie). Refresh tokens are hashed with SHA-256 before storage and rotated on each use (one-time-use).

**Installed but not yet wired**: Socket.io (real-time), BullMQ (job queues for engine analysis / image-to-FEN).

### Frontend (`chess-client/src/`)

**State**: Zustand `useAuthStore` persists `{user, accessToken, isAuthenticated}` to localStorage under key `chess-auth`.

**Server state**: TanStack React Query (installed, not yet used in auth flows).

**API client**: `src/api/client.ts` — custom `apiRequest` wrapping Fetch, attaches Bearer token, sends cookies. Base URL hardcoded to `http://localhost:3001`.

**Routing**: React Router DOM 7. Public routes: `/login`, `/register`. Protected routes wrapped in `ProtectedRoute` (redirects to `/login` if not authenticated). Current routes: `/dashboard`, `/play/local`.

**Chess logic**:
- `chess.js`: move validation, FEN generation, PGN export
- `chessground`: board rendering
- `useChessGame` hook: encapsulates game state (FEN, turn, move list, captured pieces, move seeking)

**Styling**: Tailwind CSS 4 (via Vite plugin) + custom CSS variables (`--text`, `--bg`, `--border`, `--accent`, `--shadow`) defined in `index.css`.

### Database Schema (`migrations/001_initial.sql`)

Key tables: `users` (UUID PK, Glicko rating with `rating_rd`), `user_profiles`, `refresh_tokens`, `games`, `moves`, `game_rooms`, `game_events`, `analysis_requests`, `engine_evaluations`, `time_controls`, `board_image_uploads`.

Custom enums: `game_status`, `game_mode`, `game_result`, `game_termination`, `room_status`.

### Environment

Server requires `chess-server/.env` (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: signing secret
- `CLIENT_URL`: frontend origin for CORS (default `http://localhost:5173`)
- `PORT`: server port (default `3001`)

### Package Manager

**pnpm** (v10+) is required. Do not use npm or yarn.

### Summary from my claude web chat for context

---

## Database
Full schema migrated to Neon PostgreSQL. Tables:
- `users`, `user_profiles`, `refresh_tokens`
- `time_controls` (seeded with standard controls)
- `games`, `moves`, `game_rooms`, `game_events`
- `analysis_requests`, `engine_evaluations`
- `board_image_uploads` (Snapfen placeholder)

---

## Key Decisions & Conventions
- `"type": "module"` in chess-server/package.json — all imports use ESM
- Import paths in server use `.js` extension (e.g. `./auth.service.js`) even for `.ts` files — required for ESM
- Tailwind v4: uses `@tailwindcss/vite` plugin, single `@import "tailwindcss"` in index.css, no tailwind.config.js
- Chessground CSS imported at top of index.css before Tailwind
- Refresh tokens stored hashed (SHA-256) in DB, raw token sent to client as httpOnly cookie on path `/auth/refresh`
- JWT access token returned in response body, stored in Zustand + localStorage
- Server allows empty JSON bodies via custom content type parser (fixes logout 400 error)
- All inline styles used on frontend (no Tailwind classes yet in components)
- Neon connection string includes `?sslmode=require` — SSL enabled in pg pool

---

## Online Game Architecture (Next Major Feature)

### Overview
Real-time games use Socket.IO (already installed, not yet wired). The core pattern is:
- **GameManager** — singleton that holds all active in-memory games, one `pendingUser` slot (not a queue — at most one user waits at a time), routes incoming socket events to the right game
- **Game** — per-game class holding player1 socket, player2 socket, a `chess.js` Chess instance for server-side validation, moves array, startTime, gameId (FK to `games` table)

### Socket.IO Event Protocol
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `init_game` | `{}` (authenticated user wants to play) |
| Server → Client | `game_init` | `{ color: 'white'|'black', gameId }` |
| Client → Server | `move` | `{ from: string, to: string }` |
| Server → Client | `move` | `{ from, to, fen }` (opponent's move) |
| Server → Client | `game_over` | `{ winner: 'white'|'black'|'draw', reason }` |

### Implementation Plan
```
chess-server/src/modules/game/
  game.ts           # Game class — chess.js board, players, moves, DB persistence
  game-manager.ts   # GameManager — Map<gameId, Game>, pendingUser slot
  game.events.ts    # Event name constants (avoid magic strings)
  game.socket.ts    # Socket.IO namespace setup + event handler registration
```

- Use Socket.IO rooms (`socket.join(gameId)`) so moves are broadcast to both players without manual filtering
- Install `chess.js` in `chess-server` (same package already used on the client) for server-side move validation
- After each valid move: persist to `moves` table immediately, then emit to opponent — DB write happens synchronously before emitting so recovery is always possible
- On `game_over`: update `games.status` and `games.result` in DB

### In-Memory + DB Recovery Pattern
- In-memory `Game` objects allow instant move validation without a DB round-trip per move
- Every valid move is written to `moves` table before the opponent is notified
- If the server restarts: on reconnect the client sends its `gameId`, server reloads moves from DB and reconstructs the `chess.js` board state
- Stateful servers are unavoidable for chess (validation needs current board); DB is the recovery source of truth

### Scaling (Future — do not build yet)
- **Phase 1 (sharding)**: Route both players in the same game to the same server instance. Sufficient for < ~5k spectators per room.
- **Phase 2 (Redis pub/sub)**: Multiple Socket.IO servers all subscribe to a Redis channel per game room. Any server can receive a move and publish it; all other servers relay it to their connected clients. Works for 100k+ spectators. Redis is already in the stack (BullMQ uses it).

---

## Next Steps (in order)
1. **Online games** — Wire Socket.IO, implement GameManager + Game classes, `init_game` matchmaking, real-time move sync, game persistence to DB
2. Save games to DB — already handled as part of step 1
3. Game history page
4. Engine analysis — BullMQ + Stockfish worker
5. Ratings system
6. Snapfen integration