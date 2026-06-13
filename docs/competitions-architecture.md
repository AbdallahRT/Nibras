# Competitions architecture

Nibras competitions are split across two backends during migration:

## External contests (Fastify / Prisma)

Canonical routes under `/v1`:

- `/v1/contests` — calendar and listings
- `/v1/user-contests/*` — bookmarks, reminders, history
- `/v1/problems`, `/v1/ranking` — practice and rankings
- `/v1/practice/*` — Codeforces/LeetCode practice, Nibras 75, CP Roadmap
- `/v1/daily-problem/*` — daily problem assignments
- `/v1/contests/accounts/*` — linked account verify/resync

The gateway rewrites legacy root paths (`/contests`, `/practice`, `/daily-problem`, etc.) to `/v1/*`.

## Internal contests (NestJS / MongoDB bridge)

Until ported to Prisma, internal contest runtime stays on NestJS `/api`:

- `POST /api/contests` — create internal contest
- `POST /api/contests/:id/register` — register
- `POST /api/contests/:id/submissions` — submit solutions
- `POST /api/contests/:id/teams` — contest-scoped teams (2–3 members)
- Socket.io namespace `/contests` — live standings

The frontend uses `requestInternalContest()` in `Frontend/client/services/api.js` for these endpoints via the gateway `/api` proxy.

## Local development

- Gateway: `http://localhost:8080`
- Community + external competitions clients default to gateway root
- Admin auth: `http://localhost:8080/api/auth/*` (Fastify platform auth)
