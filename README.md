# KMUTT Café Pre-Order

Pre-order food and drinks from the campus café and pick them up at the counter.
CPE 334 group project — Theme 4, E-Commerce or Ordering System.
Team: FAHS Rémy (69546000443) · DARWICHE Maxime (69540460044)

| Layer | Stack |
|---|---|
| UI | React 18 + TypeScript, Vite, Bootstrap 5 |
| API | Node.js 22, Express 4, TypeScript |
| Data | PostgreSQL 16, Prisma 5 |
| Tests | Vitest, Supertest, React Testing Library, Playwright |

Engineering documents: [docs/srs.md](docs/srs.md) · [docs/features.md](docs/features.md) · [docs/traceability.md](docs/traceability.md) · [docs/system-sds.md](docs/system-sds.md) · [docs/sprints/plan.md](docs/sprints/plan.md) · [Sprint 1 contracts](docs/sprints/sprint-1/README.md)

## Prerequisites

- Node.js 22 and npm
- PostgreSQL 16 running locally (port 5432)

## 1. Database

Create a database user and two databases (development and tests). With `psql` as the `postgres` superuser:

```sql
CREATE USER cafe WITH PASSWORD 'cafe' CREATEDB;
CREATE DATABASE cafe OWNER cafe;
CREATE DATABASE cafe_test OWNER cafe;
```

`CREATEDB` is needed because `prisma migrate dev` uses a temporary shadow database.

## 2. Server

```bash
cd server
npm install
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
cp .env.test.example .env.test  # Windows PowerShell: Copy-Item .env.test.example .env.test
npx prisma migrate dev          # applies the migrations
npx prisma db seed              # idempotent demo data
npm run dev                     # http://localhost:3000/api/health
```

| Command (in `server/`) | Purpose |
|---|---|
| `npx prisma migrate dev` | Apply migrations to the development database |
| `npx prisma db seed` | Insert or update the demo data (safe to repeat) |
| `npm run db:reset` | Drop and recreate the development database, then seed |
| `npm test` | Reset + seed the **test** database (`.env.test`), then run unit and API tests |
| `npm run build` | Type-check and compile to `dist/` |

## 3. Client

```bash
cd client
npm install
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
npm run dev                     # http://localhost:5173
npm test                        # UI component tests
```

## Demo accounts (local seed only)

All seeded accounts use the synthetic password printed by the seed (`Cafe1234!`). These are local demo accounts with fake data, not real credentials.

| Role | E-mail | Notes |
|---|---|---|
| Customer | alice@cafe.test | 3 sample orders |
| Customer | bob@cafe.test | 1 sample order |
| Customer | carol@cafe.test | no orders |
| Operator | olivia@cafe.test | active |
| Operator | oscar@cafe.test | inactive — login is refused |

## Configuration

Every setting is an environment variable; see `server/.env.example` and `client/.env.example`. Real `.env` files are git-ignored. `SESSION_SECRET` must be a long random value outside local development.
