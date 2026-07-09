import { useEffect, useMemo, useState } from 'react';
import { getSessionProviderEmail, jwtSubForPortal, normalizeEmail } from '../auth/identity';
import { getShareChargeApp } from '../config/appConfig';
import { SHARECHARGE_ROLE_KEYS } from '../constants';
export function useSyncedProviderHost(state) {
  const sessionEmail = getSessionProviderEmail();
  const allHosts = useMemo(() => state.users.filter((u) => u.role === 'host'), [state.users]);
  const hosts = useMemo(() => {
    if (!sessionEmail) return allHosts;
    const ownHosts = allHosts.filter((h) => normalizeEmail(h.email) === sessionEmail);
    if (getShareChargeApp() === 'provider') return ownHosts;
    return ownHosts.length ? ownHosts : allHosts;
  }, [allHosts, sessionEmail]);
  const hostKey = hosts.map((h) => `${h.id}:${h.email || ''}`).join('|');
  const [activeHostId, setActiveHostId] = useState(() => hosts[0]?.id || '');

  useEffect(() => {
    if (!hosts.length) {
      setActiveHostId('');
      return;
    }
    const fromJwt = jwtSubForPortal(SHARECHARGE_ROLE_KEYS.provider);
    if (fromJwt && hosts.some((h) => h.id === fromJwt)) {
      setActiveHostId(fromJwt);
      return;
    }
    const match = sessionEmail
      ? hosts.find((h) => normalizeEmail(h.email) === sessionEmail)
      : null;
    if (match) {
      setActiveHostId(match.id);
      return;
    }
    setActiveHostId((prev) => (hosts.some((h) => h.id === prev) ? prev : hosts[0].id));
  }, [sessionEmail, hostKey, hosts]);

  const activeHost = hosts.find((h) => h.id === activeHostId) || hosts[0];

  return { hosts, activeHostId, setActiveHostId, activeHost, sessionEmail };
}
