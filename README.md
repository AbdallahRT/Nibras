# Nibras Backend

NestJS backend services for the [Nibras](https://github.com/NibrasPlatform/Nibras) educational platform — collaborative learning, competitive programming, and project-based assessment.

[![CI](https://github.com/NibrasPlatform/Nibras/actions/workflows/ci.yml/badge.svg)](https://github.com/NibrasPlatform/Nibras/actions/workflows/ci.yml)

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Docker** and Docker Compose (optional, for local MongoDB + Redis)

## Quick start

```bash
cp .env.example .env
npm ci
npm run start:dev
```

The API listens on [http://localhost:3000](http://localhost:3000).

## Docker

Start the API with MongoDB and Redis:

```bash
docker compose up --build
```

Compose overrides `MONGO_URI` and `REDIS_HOST` with container DNS names, so `.env` can keep localhost values for non-Docker development.

## Scripts

| Script                 | Description                                 |
| ---------------------- | ------------------------------------------- |
| `npm run start:dev`    | Start with hot reload                       |
| `npm run start:prod`   | Run compiled output (`dist/main.js`)        |
| `npm run build`        | Compile TypeScript and resolve path aliases |
| `npm run lint`         | ESLint + Prettier                           |
| `npm test`             | Unit tests (Jest)                           |
| `npm run test:e2e`     | E2E tests (in-memory Mongo + Redis)         |
| `npm run dev:session`  | Create a local instructor session token     |
| `npm run smoke:local`  | HTTP smoke test against a running API       |
| `npm run smoke:socket` | Listen for `contest-standings` (Socket.io)  |
| Bruno collection       | See [`bruno/README.md`](bruno/README.md)    |
| `npm run format`       | Format source and test files                |

## API

| Endpoint        | Description                                                     |
| --------------- | --------------------------------------------------------------- |
| `GET /api/ping` | Health check — MongoDB and Redis status (503 if either is down) |
| `GET /api/docs` | Swagger UI (OpenAPI)                                            |

Example:

```bash
curl -s http://localhost:3000/api/ping | jq .
```

## Environment

Copy [`.env.example`](.env.example) to `.env`. All variables are validated at boot via Joi (`src/config/validation.ts`).

Required for local development without Docker:

- `MONGO_URI` — e.g. `mongodb://localhost:27017/nibras`
- `REDIS_HOST` — e.g. `localhost`
- `AUTH_SECRET` — non-empty string (see `.env.example`)

## Bruno API collection

Open the [`bruno/`](bruno/) folder in [Bruno](https://www.usebruno.com/) (File → Open Collection).

1. Select the **local** environment.
2. Run `npm run dev:session` and paste the `web_…` token into `token`.
3. Run requests by folder, or follow the ordered flow in [`bruno/flows/README.md`](bruno/flows/README.md).

Optional CLI: `npx @usebruno/cli run bruno --env local` (API must be running).

## Local full-system test

End-to-end check of the running API (health, auth, users, competitions, integrations, ranking).

**1. Infrastructure**

```bash
docker compose up mongodb redis -d   # or ensure local Mongo + Redis are running
cp .env.example .env                 # COMPETITIONS_SYNC_ENABLED=false recommended
npm ci
```

**2. Start API** (terminal 1)

```bash
npm run start:dev
```

Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

**3. Automated tests** (optional)

```bash
npm test
npm run test:e2e
```

**4. HTTP smoke** (terminal 2 — API must be running)

```bash
npm run smoke:local
```

Optional live HackerRank (network + public handle):

```bash
HR_HANDLE=your_hackerrank_username npm run smoke:local
```

**5. Socket.io** (terminal 3 — use `CONTEST_ID` printed by smoke)

```bash
CONTEST_ID=<contestId> npm run smoke:socket
```

Submit again in another terminal to see `contest-standings` events.

**Troubleshooting**

- `Config validation error: AUTH_SECRET` — set a non-empty secret in `.env`
- `EACCES` on `dist/` — `sudo chown -R "$USER:$USER" dist` or `rm -rf dist && npm run build`
- Smoke fails on `/api/ping` — start Mongo/Redis and ensure `npm run start:dev` is up

## Project layout

```
src/
  config/     # Typed configuration + Joi validation
  database/   # MongoDB (Mongoose) and Redis (cache) modules
  modules/    # Feature modules (health, …)
  common/     # Shared utilities
test/         # Unit and e2e tests
```

## License

MIT — see [LICENSE](LICENSE).
