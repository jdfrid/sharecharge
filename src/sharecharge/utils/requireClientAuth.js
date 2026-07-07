import { isPortalSessionReady } from '../auth/session';
import { buildAuthUrl, savePendingIntent } from './pendingIntent';

export function requireClientAuth(navigate, intent, returnTo) {
  if (isPortalSessionReady('client')) return true;
  savePendingIntent({ ...intent, returnTo: returnTo || window.location.pathname });
  navigate(buildAuthUrl(returnTo || window.location.pathname));
  return false;
}
