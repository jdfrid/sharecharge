# ShareCharge Android builds

Three APK flavors share one React codebase; Gradle `productFlavors` set `applicationId` and app name.

| Flavor | applicationId | App name |
|--------|---------------|----------|
| client | com.sharecharge.client | ShareCharge לקוח |
| provider | com.sharecharge.provider | ShareCharge ספק |
| ops | com.sharecharge.ops | ShareCharge ניהול |

## First-time setup

```bash
npm install
npx cap add android
node scripts/configure-android-flavors.js
```

## Build APK (Windows)

```bash
npm run build:android:client
npm run build:android:provider
npm run build:android:ops
```

Output: `android/app/build/outputs/apk/<flavor>/release/*.apk`

Requires JDK 17+ and Android SDK (`ANDROID_HOME`).

## Permissions

`INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` — configured in `AndroidManifest.xml` by `scripts/configure-android-flavors.js`.
