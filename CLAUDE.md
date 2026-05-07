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

**Wired**: Socket.IO for real-time online games (see Online Game Architecture below). **Not yet wired**: BullMQ (job queues for engine analysis / image-to-FEN).

### Frontend (`chess-client/src/`)

**State**: Zustand `useAuthStore` persists `{user, accessToken, isAuthenticated}` to localStorage under key `chess-auth`.

**Server state**: TanStack React Query (installed, not yet used in auth flows).

**API client**: `src/api/client.ts` — custom `apiRequest` wrapping Fetch, attaches Bearer token, sends cookies. Base URL hardcoded to `http://localhost:3001`.

**Routing**: React Router DOM 7. Public routes: `/login`, `/register`. Protected routes wrapped in `ProtectedRoute` (redirects to `/login` if not authenticated). Current routes: `/dashboard`, `/play/local`, `/play/online`.

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

## Online Game Architecture (Implemented)

### Overview
Real-time games use Socket.IO. The pattern:
- **GameManager** (`src/modules/game/game-manager.ts`) — singleton, one `pendingUser` slot, routes socket events to the right game
- **Game** (`src/modules/game/game.ts`) — per-game class with player sockets, chess.js board, per-player timers (10 min default), DB persistence

### Socket.IO Event Protocol
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `init_game` | `{}` |
| Server → Client | `waiting` | `{}` |
| Server → Client | `game_init` | `{ color, gameId, whiteUsername, blackUsername, whiteMs, blackMs }` |
| Client → Server | `move` | `{ from, to, promotion? }` |
| Server → Client | `move_made` | `{ from, to, san, fen, whiteMs, blackMs }` (sent to both players) |
| Client → Server | `resign` | `{}` |
| Client → Server | `flag` | `{}` (emit when own clock hits 0) |
| Server → Client | `game_over` | `{ winner: 'white'|'black'|'draw', reason }` |

### Key Implementation Details
- Socket auth: JWT token verified in middleware, `socket.data.userId` + `socket.data.username` set
- `move_made` is sent to **both** players (not just opponent) so the mover also gets authoritative time sync
- Server deducts elapsed time from the mover's clock after each move; flags if time ≤ 0
- Every valid move is written to `moves` table before emitting; DB is the recovery source of truth
- Client-side timer: 100ms interval decrements active player's clock; overridden by server time on each `move_made`

### Scaling (Future — do not build yet)
- **Phase 1 (sharding)**: Route both players in the same game to the same server instance.
- **Phase 2 (Redis pub/sub)**: Multiple Socket.IO servers subscribe to a Redis channel per game room. Redis is already in the stack.

---

## Next Steps (in order)
1. ~~**Online games**~~ — Done. Socket.IO wired, matchmaking, real-time moves, DB persistence, timers, usernames, pawn promotion dialog.
2. Game history page
3. **Play vs engine** — Stockfish.js (WASM) loaded in browser via Web Worker; no server involvement. Lichess approach.
4. Engine analysis — BullMQ + Stockfish worker (server-side, deeper analysis)
5. Ratings system (Glicko-2 update after each online game)
6. Snapfen integration