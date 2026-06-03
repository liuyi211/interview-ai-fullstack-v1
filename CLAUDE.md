# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend dev server (Express, port 3000)
pnpm dev

# Frontend dev server (Next.js 14 Pages Router, port 3001)
cd frontend && pnpm dev

# Run tests (Jest, single run)
pnpm test

# Run a single test file
pnpm test -- tests/integration/auth.test.js

# Run tests in watch mode
pnpm test:watch

# Lint / fix
pnpm lint
pnpm lint:fix

# Full stack (MongoDB + Redis + backend + frontend)
docker compose up -d
```

## Architecture

This is an AI full-stack engineer interview skeleton: a production-grade Express boilerplate extended with Redis billing, BullMQ job pipeline, and WebSocket real-time progress. It has **many `TODO` placeholders** that the candidate must implement.

### Monorepo Layout

- **Root**: Express 4 backend (Node.js 20, Mongoose 8, BullMQ 5, `ws`)
- **`frontend/`**: Next.js 14 (Pages Router, React 18) with two pages: `login.jsx` and `dashboard.jsx`
- **Workers**: `workers/jobWorker.js` is a separate BullMQ worker process imported by `src/index.js`

### Backend Layer Flow

`routes/v1/` → `controllers/` → `services/` → `models/` / `lib/`

- **`src/routes/v1/index.js`**: Aggregates all API routes under `/v1`
- **`src/config/config.js`**: Centralized config via `dotenv` + `joi` validation. Test DB auto-suffixed with `-test`
- **`src/config/passport.js`**: JWT strategy extracts `tenantId` and `role` from claims; no DB lookup
- **`src/middlewares/auth.js`**: Passport JWT verifier + role-based access (`roleRights`)
- **`src/middlewares/requireTenant.js`**: Extracts `tenantId` from `req.user.tenantId` (JWT claim). **Must NOT read from body/header/query**

### Billing (Redis + Lua)

- `src/services/billingService.js` manages per-tenant balances
- Redis key format: `billing:${tenantId}`
- Deduction must use a **Lua script** for atomic `DECRBY`. `GET-then-SET` is forbidden
- Startup seeding (`src/index.js`) calls `billingService.seed(tenants)` using `SET ... NX` from `seed/tenants.json`

### Jobs (BullMQ)

- `src/services/jobService.js`: `submit()` deducts balance → generates `uuidv4()` jobId → enqueues to BullMQ queue `job-pipeline` → creates MongoDB `Job` document
- `workers/jobWorker.js`: Processes jobs through 4 phases (`preprocess` → `transform` → `build` → `package`), each with a 3s delay. Updates MongoDB `Job.phases` and emits progress events

### Real-time Progress (WebSocket)

- `src/lib/eventBus.js`: Node.js `EventEmitter` bridging worker → WS server
- `src/lib/wsServer.js`: Attaches `WebSocket.Server` to the existing HTTP server (from `src/index.js`)
- WS connection path: `/ws/job/:jobId?token=<jwt>`
- Server validates token via `jwt.verify()`, then checks MongoDB `job.tenantId` matches the token payload before subscribing to `eventBus`

### Entry Point Orchestration (`src/index.js`)

On startup, it sequentially: connects MongoDB → seeds tenant balances → starts HTTP server → attaches WS → starts BullMQ worker.

## Key Constraints

- `tenantId` must be read from **JWT claims only** (`req.user.tenantId`). Never from `req.body`, `req.query`, or `req.headers['x-tenant-id']`
- Redis balance deduction must be **atomic via Lua script**
- WebSocket auth passes token via **query parameter**: `?token=<jwt>`
- Inter-container communication in Docker must use **service names** (`mongodb`, `redis`), not `localhost`
- Browser accesses backend at `localhost:3000` and frontend at `localhost:3001`
