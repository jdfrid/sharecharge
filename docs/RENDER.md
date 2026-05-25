# Deploy ShareCharge API + PostgreSQL on Render

## 1. Push to GitHub

The repo must include `server/`, `render.yaml`, and `server/db/migrations/`.

## 2. Create on Render (Blueprint)

1. Open [Render Dashboard](https://dashboard.render.com/)
2. **New → Blueprint**
3. Connect repository: `jdfrid/sharecharge`
4. Render reads `render.yaml` and creates:
   - **sharecharge-api** — Docker web service (Node API)
   - **sharecharge-db** — PostgreSQL (free tier)
5. Click **Apply**

First deploy runs migrations + seed (`AUTO_SEED=true`).

## 3. After deploy

- API health: `https://sharecharge-api.onrender.com/api/health`  
  (exact URL appears in Render dashboard — service name may vary)

- Update **CORS_ORIGINS** in Render env if your web/APK uses another domain.

- Set **AUTO_SEED** to `false` after first successful deploy (optional, avoids re-seeding on restarts).

## 4. Frontend / APK

Build with:

```
VITE_SHARECHARGE_DATA_MODE=api
VITE_SHARECHARGE_API_URL=https://YOUR-API.onrender.com
```

## 5. Test accounts (seed)

| Role | Email |
|------|-------|
| Driver | driver@sharecharge.app |
| Host | host@sharecharge.app |
| Admin | admin@sharecharge.app |

OTP: in production only via future SMTP/SMS — for now use Render logs or temporary dev endpoint.

## Local alternative

```bash
docker compose up --build
# or
npm run start:api
```
