/**
 * עתידי: מימוש מול REST / Supabase — להחליף את localStorageRepository
 * כאשר קיים `VITE_SHARECHARGE_API_URL` ואסימון משתמש.
 */
export function createApiRepository() {
  return {
    load: async () => {
      throw new Error('ShareCharge API repository not implemented — use local demo storage.');
    },
    save: async () => {
      throw new Error('ShareCharge API repository not implemented.');
    },
  };
}

/** @param {string|undefined} mode */
export function getPreferredRepositoryMode(mode) {
  const m = (mode || import.meta.env.VITE_SHARECHARGE_DATA_MODE || 'local').toLowerCase();
  return m === 'api' ? 'api' : 'local';
}
