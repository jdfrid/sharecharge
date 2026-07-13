import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ShareChargeProvider } from '../context/ShareChargeContext';
import { ShareChargeSplash } from '../components/ShareChargeSplash';
import { ClientIntroVideo } from '../components/ClientIntroVideo';
import { ClientIntroSplash, wasIntroSeen } from '../components/ClientIntroSplash';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { SessionExpiryRedirect } from './gates';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { getShareChargeApp, isDualAppBuild, isSingleAppBuild } from '../config/appConfig';
import { portalFromPath } from '../auth/portal';
import { SHARECHARGE_ROLE_KEYS } from '../constants';

function portalForNativeApp(pathname) {
  const app = getShareChargeApp();
  if (app === 'dual') {
    return portalFromPath(pathname) || SHARECHARGE_ROLE_KEYS.client;
  }
  if (app === 'client') return SHARECHARGE_ROLE_KEYS.client;
  if (app === 'provider') return SHARECHARGE_ROLE_KEYS.provider;
  if (app === 'ops') return SHARECHARGE_ROLE_KEYS.system;
  return null;
}

export function ShareChargeLayout() {
  const location = useLocation();
  const isConsole = location.pathname.startsWith('/ops/console');
  const app = getShareChargeApp();
  const isClientFlow = app === 'client' || isDualAppBuild();
  const [bootDone, setBootDone] = useState(isConsole);
  const [videoDone, setVideoDone] = useState(!isClientFlow || isConsole);
  const [introDone, setIntroDone] = useState(() => wasIntroSeen() || !isClientFlow || isConsole);

  const showVideo = bootDone && !videoDone && isClientFlow;
  const showIntro = bootDone && videoDone && !introDone && isClientFlow;
  const appReady = bootDone && videoDone && introDone;
  const nativePortal = portalForNativeApp(location.pathname);

  usePushNotifications((app === 'client' || isDualAppBuild()) && appReady);

  return (
    <ShareChargeProvider>
      {!bootDone && <ShareChargeSplash onDone={() => setBootDone(true)} />}
      {showVideo && <ClientIntroVideo onDone={() => setVideoDone(true)} />}
      {showIntro && <ClientIntroSplash onDone={() => setIntroDone(true)} />}
      {appReady && (
        <>
          <SyncStatusBar />
          {isSingleAppBuild() && nativePortal ? (
            <SessionExpiryRedirect portal={nativePortal} />
          ) : null}
          <Outlet />
        </>
      )}
    </ShareChargeProvider>
  );
}
