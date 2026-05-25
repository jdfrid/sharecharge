# ShareCharge — התחלה מהירה

## 1. התקנה (פעם אחת)

```powershell
cd c:\Users\jdfri\sharecharge\sharecharge
npm install
npm run server:install
```

## 2. הרצת API + אפליקציה (ללא Docker)

**טרמינל 1 — API (PostgreSQL בזיכרון):**
```powershell
npm run start:api
```

**טרמינל 2 — Web / PWA:**
```powershell
npm run start:web
```

פתח: **http://localhost:5173/#/sharecharge**

### חשבונות בדיקה

| תפקיד | מייל |
|--------|------|
| לקוח | `driver@sharecharge.app` |
| ספק | `host@sharecharge.app` |
| מנהל | `admin@sharecharge.app` |

OTP מופיע בטרמינל של ה-API (שורה `[OTP] ...`).

## 3. בניית APK (3 אפליקציות)

**דרישות:** JDK 17+, Android SDK (`ANDROID_HOME`)

```powershell
# מגדיר כתובת API לפי IP של המחשבר (לטלפון באותה WiFi)
npm run setup:apk-env

# בונה את כל 3 ה-APK
npm run build:android:all
```

**קבצים (אחרי build):**
```
release/apk/ShareCharge-client.apk
release/apk/ShareCharge-provider.apk
release/apk/ShareCharge-ops.apk
```

או ישירות (Gradle, חתום):
```
android\app\build\outputs\apk\client\release\app-client-release.apk
```

> Release builds חתומים עם debug keystore — מתאים להתקנה ידנית (sideload).

העתק לטלפון והתקן.

> **חשוב:** הטלפון והמחשב באותה רשת WiFi, וה-API רץ (`npm run start:api`).

## 4. עם Docker (PostgreSQL קבוע)

```powershell
docker compose up --build
npm run dev:api
npm run test:e2e
```

## 5. עיצוב

- ממשק glassmorphism (כחול `#007BFF` + טורקיז `#00D1C1`)
- Splash בכניסה · סרגל סנכרון API
- 3 ערכות צבע לפי תפקיד (לקוח / ספק / ניהול)

## 6. אין JDK? — GitHub Actions

Push ל-GitHub → Actions → **ShareCharge Android** → Run workflow → הורד Artifacts.
