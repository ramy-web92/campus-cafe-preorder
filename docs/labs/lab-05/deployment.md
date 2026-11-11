# Lab 5 — Deployment of KMUTT Café Pre-Order

> Version 1 (Episode 2, cloud-ready). Completed in later Lab 5 Issues: Docker (Ep. 3), CI (Ep. 4), GCP resources (Ep. 5), release procedure (Ep. 7).

## 1. Stack and changes from the reference

| Layer | Our project | Reference (Starter Kit) | Change |
|---|---|---|---|
| UI | React 18 + Vite, built and served by Express | same | none |
| API | Node.js, Express 4, TypeScript | Node.js 24, Express | Node 22 locally; the image uses `node:24-alpine` |
| Data | PostgreSQL + Prisma 5, sessions in PostgreSQL (`connect-pg-simple`) | same | none |
| Runtime | one container: API + built SPA on port 3000 | same | none |
| Cloud | Cloud Run, Cloud SQL for PostgreSQL, Secret Manager, Artifact Registry, GitHub Actions | same | none |

Cloud-ready checklist (Student Guide Episode 2):

| # | Point | Status in our app |
|---|---|---|
| 1 | Uploaded files not stored in a local folder | Already OK: the app has no file upload in Sprint 1. |
| 2 | Seed safe for production | Fixed: the demo password comes from `DEMO_USER_PASSWORD`, is never in the code and never printed; demo data only when `SEED_DEMO_DATA=true`; the seed is idempotent (TEST-D01). |
| 3 | No dev shortcuts in production | Already OK: no user selector, sign-in only with a password; no password shown on the login page. |
| 4 | Sessions in the database | Already OK: `connect-pg-simple`, table `session` (init migration). |
| 5 | Port from `PORT` | Already OK: `config.port`; Express listens on all interfaces. |
| 6 | `/api/ready` | Added: `SELECT 1` through Prisma, 503 when the database is unreachable. |

Also fixed: `npm start` pointed to `dist/src/index.js`; the build writes `dist/index.js`.

## 2. Environment variables

No real value is committed. Local values live in `server/.env`, `server/.env.test` and `client/.env` (git-ignored); the templates are the `*.env.example` files.

| Variable | Read by | Purpose | Secret? | Local value from | Cloud value from |
|---|---|---|---|---|---|
| `DATABASE_URL` | server, seed, Prisma | PostgreSQL connection | **Yes** | `server/.env` | Secret Manager (created in Ep. 5) |
| `SESSION_SECRET` | server | Signs the session cookie; required in production | **Yes** | `server/.env` | Secret Manager |
| `DEMO_USER_PASSWORD` | seed, tests | Password of every demo account (UAT in Lab 6) | **Yes** | `server/.env`, `server/.env.test` | Secret Manager |
| `SEED_DEMO_DATA` | seed | Seed demo accounts and sample orders | No | `true` | migration job setting (`true` for Lab 6 UAT) |
| `NODE_ENV` | server, seed | `development` / `test` / `production` | No | `.env` | `production` (Dockerfile) |
| `PORT` | server | Listening port | No | `3000` | set by Cloud Run (3000) |
| `CORS_ORIGIN` | server | Allowed origins when the client runs elsewhere (Vite dev) | No | default `http://localhost:5173` | empty (same origin) |
| `STATIC_DIR` | server | Folder of the built SPA | No | not set (Vite dev server) | default `../client/dist` in the image |
| `VITE_API_URL` | client build | API base URL | No | `http://localhost:3000` | empty at image build (same origin) |

## 3. Commands

| Task | Command |
|---|---|
| Install | `cd server && npm ci` · `cd client && npm ci` · root: `npm ci` |
| Migrate (dev) | `cd server && npx prisma migrate dev` |
| Migrate (cloud) | `npx prisma migrate deploy` (migration job, Ep. 5) |
| Seed | `cd server && npx prisma db seed` (idempotent) |
| Run (dev) | `cd server && npm run dev` · `cd client && npm run dev` |
| Build | `cd server && npm run build` · `cd client && npm run build` |
| Test | `cd server && npm test` · `cd client && npm test` · root: `npm run test:e2e` |
| Health / readiness | `GET /api/health` · `GET /api/ready` |

## 4. GCP project and resources (planned, created in Ep. 5)

| Item | Value |
|---|---|
| Project ID | `cpe334-sec31-cafe` (final ID written here once the project exists) |
| Region | `asia-southeast1` |
| Artifact Registry repository | `cafe` |
| Cloud SQL instance / database / user | `cafe-pg` / `cafe` / `cafe` |
| Cloud Run service / migration job | `cafe` / `cafe-migrate` |
| Runtime service account | `cafe-runner` |
| Secrets | `cafe-database-url`, `cafe-session-secret`, `cafe-demo-password` |

## 5. Release procedure

Written in Episode 7 (deploy workflow, commit SHA of the running revision, rollback).
