# ShareCharge על Render (מומלץ לטלפון)

כשה-API המקומי לא נגיש מהטלפון (Wi‑Fi / חומת אש), העלה ל-**Render** — HTTPS ציבורי, בלי IP מקומי.

## חשוב: URL אחד ל-API + אתר

ה-APK והאתר משתמשים ב:

```
https://sharecharge.onrender.com
```

(לא `sharecharge-api` — השירות הזה החזיר 404.)

Render מריץ **Docker אחד**: אתר + API + PostgreSQL.

## 1. Deploy / עדכון Render

1. **דחוף ל-GitHub** (כולל `Dockerfile` + `render.yaml` המעודכנים)
2. Render Dashboard → **sharecharge** → **Manual Deploy** (או Blueprint → Apply)
3. המתן ~5–10 דקות (build Docker + DB)

בדיקה:

```
https://sharecharge.onrender.com/api/health
```

אמור: `{"ok":true,"service":"sharecharge-api",...}`

## 2. Deploy (פעם אחת) — ישן

### עמוד ריק ב-`sharecharge.onrender.com`

אם האתר נטען אבל המסך **לבן/ריק** — בדרך כלל Render מריץ **גרסה ישנה** מה-GitHub (באג React Router). הפתרון:

1. `git push` של כל התיקונים המקומיים
2. ב-Render → שירות **sharecharge** → **Manual Deploy → Deploy latest commit**
3. Build Command: `npm install && npm run build`
4. Publish directory: `dist`
5. Env (ב-build): `VITE_SHARECHARGE_API_URL=https://sharecharge-api.onrender.com`

## 2. בדיקה

פתח בדפדפן (גם מהטלפון):

```
https://sharecharge-api.onrender.com/api/health
```

> אם השם שונה — העתק מה-Dashboard של Render.

אמור להופיע: `{"ok":true,"service":"sharecharge-api",...}`

## 3. בנה APK מחובר ל-Render

```powershell
cd c:\Users\jdfri\sharecharge\sharecharge

# אם ה-URL שונה:
# node scripts/setup-render-env.js https://YOUR-SERVICE.onrender.com

npm run build:android:render
```

התקן מחדש מ-`release\apk\`:
- ShareCharge-client.apk
- ShareCharge-provider.apk

## 4. OTP ב-Render

- `ALLOW_DEV_OTP=true` — הקוד מוזן **אוטומטית** באפליקציה (לבדיקות)
- גם ב-**Logs** של Render: שורה `[OTP] client email → 1234`

## חשבונות (seed)

| תפקיד | מייל |
|--------|------|
| לקוח | driver@sharecharge.app |
| ספק | host@sharecharge.app |
| מנהל | admin@sharecharge.app |

## הערות

- **Free tier** — השרת "נרדם" אחרי ~15 דקות; הפתיחה הראשונה לוקחת ~30 שניות
- אחרי deploy ראשון: ב-Render הגדר `AUTO_SEED=false` (אופציונלי)
