import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ShareChargeProvider } from '../context/ShareChargeContext';
import { ShareChargeSplash } from '../components/ShareChargeSplash';
import { SyncStatusBar } from '../components/SyncStatusBar';

export function ShareChargeLayout() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <ShareChargeProvider>
      {!splashDone && <ShareChargeSplash onDone={() => setSplashDone(true)} />}
      <SyncStatusBar />
      <Outlet />
    </ShareChargeProvider>
  );
}
