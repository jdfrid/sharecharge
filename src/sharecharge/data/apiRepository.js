import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { getPreferredRepositoryMode } from './apiRepository.stub';
import { sharechargeApi } from './sharechargeApi';

export function isApiMode() {  return getPreferredRepositoryMode() === 'api';
}

const APP_TO_PORTAL = {
  client: SHARECHARGE_ROLE_KEYS.client,
  provider: SHARECHARGE_ROLE_KEYS.provider,
  ops: SHARECHARGE_ROLE_KEYS.system,
};

export function portalForContext() {
  const app = import.meta.env.VITE_SHARECHARGE_APP;
  if (app && app !== 'all' && APP_TO_PORTAL[app]) return APP_TO_PORTAL[app];
  return null;
}

export async function loadStateFromApi(portal) {
  return sharechargeApi.fetchState(portal);
}

export async function refreshAfter(portal, fn) {
  await fn();
  return loadStateFromApi(portal);
}
