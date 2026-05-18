import { Outlet } from 'react-router-dom';
import { ShareChargeProvider } from '../context/ShareChargeContext';

export function ShareChargeLayout() {
  return (
    <ShareChargeProvider>
      <Outlet />
    </ShareChargeProvider>
  );
}
