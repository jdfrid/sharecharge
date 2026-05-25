# ShareCharge deployment

## Local stack (API + PostgreSQL)

```bash
docker compose up --build
```

API: `http://localhost:3001/api/health`  
ShareCharge state (after auth): `GET /api/sharecharge/ops/state`

## Frontend (web, API mode)

```bash
npm run dev:api
```

Uses `.env.development` with `VITE_SHARECHARGE_DATA_MODE=api` and Vite proxy to `:3001`.

## Android APK builds

Requires JDK 17+ and Android SDK.

```bash
npm run build:android:client
npm run build:android:provider
npm run build:android:ops
```

APK output: `android/app/build/outputs/apk/<flavor>/release/`

## Production env (Render / VPS)

See [`render.yaml`](../render.yaml) for Render Blueprint (API + PostgreSQL).

Set on API service:

- `DATABASE_URL` — managed PostgreSQL connection string
- `JWT_SECRET` — long random string
- `CORS_ORIGINS` — your web origin and `capacitor://localhost`
- `AUTO_MIGRATE=true`, `AUTO_SEED=false` (after first deploy)

Build frontend with:

- `VITE_SHARECHARGE_DATA_MODE=api`
- `VITE_SHARECHARGE_API_URL=https://your-api-host`
- `VITE_SHARECHARGE_APP=client|provider|ops` per APK flavor

## Test accounts (seed)

| Role | Email |
|------|-------|
| Driver | driver@sharecharge.app |
| Host | host@sharecharge.app |
| Admin | admin@sharecharge.app |

## End-to-end API test

With Docker stack running:

```bash
docker compose up --build -d
npm run test:e2e
```

Covers OTP login (driver/host/admin), full booking lifecycle, and ops station CRUD visibility.
