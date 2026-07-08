import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ShareChargeProvider } from '../context/ShareChargeContext';
import { ShareChargeSplash } from '../components/ShareChargeSplash';
import { ClientIntroVideo } from '../components/ClientIntroVideo';
import { ClientIntroSplash, wasIntroSeen } from '../components/ClientIntroSplash';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { SessionExpiryRedirect } from './gates';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { getShareChargeApp, isSingleAppBuild } from '../config/appConfig';
import { SHARECHARGE_ROLE_KEYS } from '../constants';

function portalForNativeApp() {
  const app = getShareChargeApp();
  if (app === 'client') return SHARECHARGE_ROLE_KEYS.client;
  if (app === 'provider') return SHARECHARGE_ROLE_KEYS.provider;
  if (app === 'ops') return SHARECHARGE_ROLE_KEYS.system;
  return null;
}

export function ShareChargeLayout() {
  const isClient = getShareChargeApp() === 'client';
  const [bootDone, setBootDone] = useState(false);
  const [videoDone, setVideoDone] = useState(!isClient);
  const [introDone, setIntroDone] = useState(() => wasIntroSeen() || !isClient);

  const showVideo = bootDone && !videoDone && isClient;
  const showIntro = bootDone && videoDone && !introDone && isClient;
  const appReady = bootDone && videoDone && introDone;

  usePushNotifications(isClient && appReady);

  return (
    <ShareChargeProvider>
      {!bootDone && <ShareChargeSplash onDone={() => setBootDone(true)} />}
      {showVideo && <ClientIntroVideo onDone={() => setVideoDone(true)} />}
      {showIntro && <ClientIntroSplash onDone={() => setIntroDone(true)} />}
      {appReady && (
        <>
          <SyncStatusBar />
          {isSingleAppBuild() && portalForNativeApp() ? (
            <SessionExpiryRedirect portal={portalForNativeApp()} />
          ) : null}
          <Outlet />
        </>
      )}
    </ShareChargeProvider>
  );
}
