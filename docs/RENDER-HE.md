# ShareCharge על Render (מומלץ לטלפון)

## URL אחד

```
https://sharecharge.onrender.com
https://sharecharge.onrender.com/api/health   ← חייב JSON, לא מסך האפליקציה
```

## אם /api/health מחזיר 404 או את האתר

Render עדיין מריץ **Static Site** (אתר בלבד) — **אין API**.

### תיקון (פעם אחת)

1. [dashboard.render.com](https://dashboard.render.com) → **Blueprints** → הפרויקט → **Sync/Apply**  
   (או מחק את שירות `sharecharge` מסוג Static ו-**Apply** מחדש על `render.yaml`)
2. ודא ש-**sharecharge** הוא **Web Service → Docker** (לא Static Site)
3. **Manual Deploy** → המתן ~5–10 דק'
4. בדוק בדפדפן: `/api/health` → `{"ok":true,"service":"sharecharge-api",...}`

רק **אחרי** JSON תקין — בנה והתקן APK:

```powershell
npm run build:android:render
```

## OTP

- `ALLOW_DEV_OTP=true` — קוד אוטומטי + ב-Logs: `[OTP] ...`

## חשבונות (seed)

| תפקיד | מייל |
|--------|------|
| לקוח | driver@sharecharge.app |
| ספק | host@sharecharge.app |
| מנהל | admin@sharecharge.app |

## Free tier

השרver «נרדם» אחרי ~15 דק' — פתיחה ראשונה ~30 שנ'. לחצו «נסה שוב» באפליקציה.
