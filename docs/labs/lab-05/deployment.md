# Lab 5 — Deployment of KMUTT Café Pre-Order

> Version 2 (end of Lab 5). Live service: https://cafe-rgydhkolpq-as.a.run.app (Cloud Run `cafe`, region `asia-southeast1`, project `cpe334-sec31-cafe`).

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
| `COOKIE_SECURE` | server | HTTPS-only session cookie | No | default `false` outside production | default `true` (production); `false` only in docker-compose |
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

### Docker (Episode 3)

| File | Role |
|---|---|
| `Dockerfile` (root) | Production image used by CI and Cloud Run: builds the client, builds the API, runtime stage as the non-root `node` user, serves API + SPA on port 3000 |
| `.dockerignore` | Keeps `node_modules`, builds, `.env` files, Git data and test output out of the build context |
| `docker-compose.yml` | Local stack: `db` (PostgreSQL 16 with a volume), `migrate` (migrations + seed, runs once), `server` (API, :3000), `client` (nginx, :5173) |
| `server/Dockerfile`, `client/Dockerfile`, `client/nginx.conf` | Images used only by docker-compose |
| `server/docker-entrypoint.sh` | Starts the server only (`exec "$@"`) |
| `.env.example` (root) | Local values for docker-compose (placeholders only) |
| `.gitattributes` | Forces LF endings for `*.sh` so the scripts run in Linux containers when cloned on Windows |

```bash
cp .env.example .env              # PowerShell: Copy-Item .env.example .env — then replace the placeholders
docker compose up --build -d
docker compose ps -a              # db, server, client running; migrate "exited (0)"
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready
docker compose down               # stop, keep the data
docker compose up -d              # data is still there (volume postgres_data)
docker compose down -v            # stop and delete the data
docker build -t cafe .            # the production image alone (what CI and Cloud Run use)
```

PostgreSQL is published on host port **5433** so it does not clash with a PostgreSQL already installed on the laptop.

### Continuous integration (Episode 4)

Workflow `.github/workflows/ci-docker.yml` ("CI & Docker Build"), job **`test-and-docker`** (the required check for the `main` ruleset in Episode 6). It runs on every Pull Request into `staging` and `main`, by hand, and is reused by the deploy workflow (Episode 7):

1. syntax check and offline tests of `deploy/` scripts (no GCP access);
2. server: `npm ci`, then `npm test` (migrations + seed on a temporary PostgreSQL service, then unit and API/DB tests);
3. client: `npm ci`, `npm test`, `npm run build`;
4. end-to-end: Playwright against the real client, API and database;
5. `docker build` of the production image (not pushed).

The CI database credentials and the CI demo password are throw-away values for the temporary database of the job, not real secrets.

## 4. GCP project and resources (created in Episode 5 with `deploy/deploy.sh --demo`)

| Item | Value |
|---|---|
| Project ID | `cpe334-sec31-cafe` (Free Trial billing account, alerts-only budget `CPE334-Alert`: 50 €, 50% and 100%, credits excluded) |
| Region | `asia-southeast1` |
| Public URL | https://cafe-rgydhkolpq-as.a.run.app |
| Cloud Run service | `cafe`: public, port 3000, 0 to 3 instances, 512 MiB, runs as `cafe-runner` |
| Migration job | `cafe-migrate`: `npx prisma migrate deploy && npx prisma db seed` (`SEED_DEMO_DATA=true` for Lab 6 UAT) |
| Cloud SQL | instance `cafe-pg` (PostgreSQL 16, `db-f1-micro`, 10 GB, storage auto-increase off, daily backup 03:00), database `cafe`, user `cafe` |
| Artifact Registry | repository `cafe`, image `cafe`, tagged with the full commit SHA |
| Secret Manager | `cafe-database-url`, `cafe-session-secret`, `cafe-demo-password` (values never printed; each readable only by `cafe-runner`) |
| Runtime service account | `cafe-runner`: Cloud SQL Client on the project, Secret Accessor on the three secrets only |
| Deployer service account | `cafe-deployer`: Cloud Run Developer, Artifact Registry Writer on `cafe` only, Service Account User on `cafe-runner` only; **no key** |
| GitHub → GCP sign-in | Workload Identity Federation: pool `github-actions`, provider `github-main`, accepted only for this repository (id 1447054111, owner 308529506), branch `main`, workflow `deploy.yml`, environment `demo` |
| GitHub environment `demo` | deployments from `main` only; variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` (no secret needed) |
| Ruleset `protect-main` | active, no bypass: PR required with 1 approval, required check `test-and-docker`, branch up to date, no force push or deletion |

Data that must survive (orders, order lines, status history, users, sessions) is stored in Cloud SQL. Nothing is written to the container disk, so data survives restarts, redeploys and rollbacks (checked in Episode 8).

## 5. Release procedure

Only `main` deploys, so every merge into `main` is a release. Nobody types a deploy command.

1. **Issue**: create an Issue with the label `lab5`, assign the author, add it to the board.
2. **Feature branch from `staging`**: `git checkout staging && git pull && git checkout -b <type>/<name>`. If `staging` is behind `main` (after a release merge commit), first run `git merge origin/main` on `staging` and push.
3. **Pull Request into `staging`**: `Part of #<issue>`, label `lab5`. CI `test-and-docker` must be green. The **other** student reviews with a specific comment and approves; then merge.
4. **Release Pull Request `staging` → `main`**: CI must be green and the other student must approve (enforced by `protect-main`). Merge with a merge commit.
5. **Automatic deployment** (`.github/workflows/deploy.yml`, "Deploy demo"): reuses CI (`test-and-docker`) → signs in to GCP without a key → builds and pushes `cafe/cafe:<full commit SHA>` → `deploy/release.sh` (resolves the image digest, runs `cafe-migrate`, then updates the service and sends 100% of traffic to the new revision; a failed migration stops the release before the service changes) → `deploy/smoke_test.py` on the public URL → run summary.
6. **Check which commit is running**: the run summary shows "Commit image tag" (the full SHA of the merge commit on `main`) and the image digest. The same tag is listed by
   `gcloud artifacts docker tags list asia-southeast1-docker.pkg.dev/cpe334-sec31-cafe/cafe/cafe`
   and the Cloud Run revision uses that digest (Cloud Run → `cafe` → Revisions).
7. **Close the Issue** with the PR links, the run link and the URL.

### Rollback and roll-forward

Actions → Deploy demo → **Run workflow** → branch `main`, `image_tag` = the full 40-character commit SHA of an image that already exists (copy it from the "Commit image tag" of an earlier successful run). Tests, build and migration are skipped; the service is pointed back to that image and the smoke test runs. A rollback changes only the application image; it never rolls back the database. To roll forward, run it again with the newer SHA (or merge a new release).

Releases deployed during Lab 5:

| Release | Commit | How | Result |
|---|---|---|---|
| A: deploy workflow | `917adbb5ad04d49e5ea25927d53c4e6d139069d4` | release PR #33 → Deploy demo run #1 | first keyless automatic deploy, smoke test passed |
| B: footer with opening hours | `68eb45876841d12522b92daae40ca9abb7e7d535` | release PR #35 → Deploy demo run #2 | footer visible online |
| Rollback to A, then roll-forward to B | same SHAs | Run workflow with `image_tag` | data unchanged (Episode 8) |

### Cost control

Cloud SQL is billed per hour even with no traffic; Cloud Run scales to zero. Budget alert `CPE334-Alert`. Never click Upgrade. Pause or tear down only when the instructor announces the end of grading (Student Guide Episodes 9–10).
