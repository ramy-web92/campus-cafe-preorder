# Sprint 1 Release — v0.1.0

> Release of the Sprint 1 increment from `sprint-1` into `main`. Tag: **`v0.1.0`** (the tag points at the release merge commit on `main`).

## Delivered features

| Feature | Issue | PR into `sprint-1` | Author | Reviewer |
|---|---|---|---|---|
| Product baseline (SRS, features, traceability, SDS, plan) | #2 | #1 | Rémy + Maxime (pair) | both |
| Sprint 1 contracts and STS | #3 | #10 | Rémy + Maxime (pair) | Maxime |
| F-16 Setup, schema, migration, seed | #4 | #11 | Rémy | Maxime |
| F-01/F-02 Authentication and access control | #5 | #12 | Maxime | Rémy |
| F-03/F-04 Menu and place order | #6 | #13 | Rémy | Maxime |
| F-05 My orders and order detail | #7 | #15 | Maxime | Rémy |
| F-06 Operator queue and accept | #8 | #16 | Maxime | Rémy |
| E2E tests, docs v1.1, release | #9 | release PRs | Rémy + Maxime (pair) | both |

## Build and test results (release run)

Run on the release branch after `sprint-1` contained every feature, on Windows 11, Node 22, PostgreSQL 18.

| Suite | Command | Files | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Server unit + API/DB integration | `cd server && npm test` | 8 | 77 | 0 | 0 |
| Client UI components | `cd client && npm test` | 4 | 17 | 0 | 0 |
| End-to-end (browser → API → DB) | `npm run test:e2e` | 2 | 6 | 0 | 0 |

No test was skipped, disabled or weakened. The full AC → test mapping with results is in [sts.md](sts.md).

## TDD evidence

| Feature | Red commit | Green commit |
|---|---|---|
| F-03/F-04 Place order | `1b7b6c8` | `d273644` |
| F-06 Accept | `65d94fd` | `7ddee00` |

## Known limitations and incidents

- **PR #14** was opened against `main` by mistake and contained no F-05 code; it was merged and therefore also auto-closed issue #7. `main` was reset to its initial commit (`b0692cf`) before the release, issue #7 was reopened with an explanation, and F-05 was delivered in PR #15 into `sprint-1`. The GitHub page of PR #14 still shows "merged".
- Docker, CI/CD and GCP deployment are planned for Lab 5 (see `docs/system-sds.md` §6); this release runs locally.
- Sprint 1 implements only the Submitted → Accepted transition; reject, cancel, preparation, menu management and payment are Sprint 2 (see `docs/sprints/plan.md`).
- Seeded accounts only (no registration or password recovery), as allowed for Sprint 1.

## Contribution

| Student | Main contributions |
|---|---|
| FAHS Rémy (69546000443) | Repository and Kanban setup; F-16 setup/schema/seed; F-03/F-04 menu and order placement (TDD); reviews of #12, #15, #16; E2E tests and release; report |
| DARWICHE Maxime (69540460044) | F-01/F-02 authentication and access control; F-05 my orders; F-06 operator queue and accept (TDD); reviews of #1, #10, #11, #13 |
| Pair work | SRS, features, traceability, System SDS, sprint plan (#2); Sprint 1 contracts and STS (#3); release verification (#9) |

## AI use

An LLM (Claude, Anthropic) was used as a specification and coding assistant: drafting the baseline documents, contracts and STS, proposing implementations and tests. Both students reviewed every document and PR, ran all tests locally, inspected failures and are responsible for the submitted design and code.
