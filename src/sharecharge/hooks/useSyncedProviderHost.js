import { useEffect, useState } from 'react';
import { getSessionProviderEmail, normalizeEmail } from '../auth/identity';

export function useSyncedProviderHost(state) {
  const hosts = state.users.filter((u) => u.role === 'host');
  const hostKey = hosts.map((h) => `${h.id}:${h.email || ''}`).join('|');
  const sessionEmail = getSessionProviderEmail();
  const [activeHostId, setActiveHostId] = useState(() => hosts[0]?.id || '');

  useEffect(() => {
    const list = state.users.filter((u) => u.role === 'host');
    if (!list.length) return;
    const match = list.find((h) => normalizeEmail(h.email) === sessionEmail);
    if (match) {
      setActiveHostId(match.id);
      return;
    }
    setActiveHostId((prev) => (list.some((h) => h.id === prev) ? prev : list[0].id));
  }, [sessionEmail, hostKey]);

  const activeHost = hosts.find((h) => h.id === activeHostId) || hosts[0];

  return { hosts, activeHostId, setActiveHostId, activeHost };
}
