import { STORAGE_KEY } from '../constants';
import { getInitialAppState } from '../state/initialState';

export const localStorageRepository = {
  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Failed to load ShareCharge state', error);
    }
    return getInitialAppState();
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist ShareCharge state', error);
    }
  },
};
