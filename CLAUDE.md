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
