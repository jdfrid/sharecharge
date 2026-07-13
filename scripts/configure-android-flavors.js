/**
 * Patches Capacitor Android: flavors, permissions, cleartext for dev API.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const buildGradlePath = path.join(root, 'android', 'app', 'build.gradle');
const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const xmlDir = path.join(root, 'android', 'app', 'src', 'main', 'res', 'xml');
const networkConfigPath = path.join(xmlDir, 'network_security_config.xml');

const FLAVOR_BLOCK = `
    flavorDimensions "role"
    productFlavors {
        client {
            dimension "role"
            applicationId "com.sharecharge.client"
            resValue "string", "app_name", "ShareCharge לקוח"
        }
        provider {
            dimension "role"
            applicationId "com.sharecharge.provider"
            resValue "string", "app_name", "ShareCharge ספק"
        }
        ops {
            dimension "role"
            applicationId "com.sharecharge.ops"
            resValue "string", "app_name", "ShareCharge ניהול"
        }
        dual {
            dimension "role"
            applicationId "com.sharecharge.dual"
            resValue "string", "app_name", "ShareCharge לקוח+ספק"
        }
    }
`;

const PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
];

const NETWORK_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

function patchBuildGradle() {
  if (!fs.existsSync(buildGradlePath)) {
    console.error('Missing android/app/build.gradle — run `npx cap add android` first.');
    process.exit(1);
  }
  let content = fs.readFileSync(buildGradlePath, 'utf8');
  if (!content.includes('productFlavors')) {
    const marker = 'buildTypes {';
    if (!content.includes(marker)) {
      console.error('Could not find buildTypes block in build.gradle');
      process.exit(1);
    }
    content = content.replace(marker, `${FLAVOR_BLOCK}\n    ${marker}`);
    fs.writeFileSync(buildGradlePath, content);
    console.log('Added Gradle productFlavors (client, provider, ops).');
  } else {
    console.log('Gradle productFlavors already configured.');
  }
}

function patchManifest() {
  if (!fs.existsSync(manifestPath)) {
    console.error('Missing AndroidManifest.xml');
    process.exit(1);
  }
  let content = fs.readFileSync(manifestPath, 'utf8');
  content = content.replace(/\s+xmlns:android="[^"]+"/g, '');
  if (!content.includes('xmlns:android')) {
    content = content.replace(
      '<manifest',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
    );
  }
  for (const perm of PERMISSIONS) {
    const tag = `<uses-permission android:name="${perm}" />`;
    if (!content.includes(tag)) {
      content = content.replace('<application', `    ${tag}\n\n    <application`);
    }
  }
  if (!content.includes('networkSecurityConfig')) {
    content = content.replace(
      '<application',
      '<application\n        android:networkSecurityConfig="@xml/network_security_config"',
    );
  }
  if (!content.includes('usesCleartextTraffic')) {
    content = content.replace(
      '<application',
      '<application\n        android:usesCleartextTraffic="true"',
    );
  }
  fs.writeFileSync(manifestPath, content);
  console.log('Ensured permissions and network security in AndroidManifest.xml.');
}

function writeNetworkConfig() {
  fs.mkdirSync(xmlDir, { recursive: true });
  fs.writeFileSync(networkConfigPath, NETWORK_CONFIG);
  console.log('Wrote network_security_config.xml (cleartext for dev LAN API).');
}

function patchSigning() {
  if (!fs.existsSync(buildGradlePath)) return;
  let content = fs.readFileSync(buildGradlePath, 'utf8');
  if (content.includes('signingConfig signingConfigs.debug')) {
    console.log('Release signing already configured.');
    return;
  }
  content = content.replace(
    /proguardFiles getDefaultProguardFile\('proguard-android\.txt'\), 'proguard-rules\.pro'/,
    "proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'\n            signingConfig signingConfigs.debug",
  );
  fs.writeFileSync(buildGradlePath, content);
  console.log('Release builds will use debug signing (installable sideload APK).');
}

patchBuildGradle();
writeNetworkConfig();
patchManifest();
patchSigning();
