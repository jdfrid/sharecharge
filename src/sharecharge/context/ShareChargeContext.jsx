import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { localStorageRepository } from '../data/localStorageRepository';
import { getPreferredRepositoryMode } from '../data/apiRepository.stub';
import { isApiMode, loadStateFromApi } from '../data/apiRepository';
import { formatShareChargeApiError, getStoredToken, sharechargeApi } from '../data/sharechargeApi';
import { getInitialAppState } from '../state/initialState';
import { STORAGE_KEY, SHARECHARGE_ROLE_KEYS } from '../constants';
import { createId, createOtp, currency } from '../utils';
import { clearAuthSession, loadAuthSessions } from '../auth/session';
import { resolveApiPortal } from '../auth/portal';
import { ensureDriverUserForEmail } from '../auth/identity';

const ShareChargeContext = createContext(null);

function addEvent(draft, text, type = 'activity') {
  draft.events.unshift({ id: createId('event'), text, type, time: Date.now() });
  draft.events = draft.events.slice(0, 20);
}

function portalUsesOfflineDemo(portal) {
  return !!loadAuthSessions()[portal]?.offlineDemo;
}

export function ShareChargeProvider({ children }) {
  const location = useLocation();
  const apiPortal = resolveApiPortal(location);
  const repositoryMode = getPreferredRepositoryMode();
  const useApi = repositoryMode === 'api' && !portalUsesOfflineDemo(apiPortal);

  const [state, setState] = useState(() => {
    if (repositoryMode === 'api' && !portalUsesOfflineDemo()) return getInitialAppState();
    try {
      const fromRepo = localStorageRepository.load();
      if (fromRepo && typeof fromRepo === 'object') return fromRepo;
    } catch (error) {
      console.error('Failed to load ShareCharge state', error);
    }
    return getInitialAppState();
  });
  const [loading, setLoading] = useState(useApi);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    if (useApi) return;
    try {
      const fromRepo = localStorageRepository.load();
      if (fromRepo && typeof fromRepo === 'object') {
        setState(fromRepo);
      } else {
        setState(getInitialAppState());
      }
    } catch (error) {
      console.error('Failed to load ShareCharge state', error);
      setState(getInitialAppState());
    }
    setLoading(false);
    setSyncError(null);
  }, [useApi]);

  const refreshFromApi = useCallback(async (portal = apiPortal) => {
    if (!useApi) return;
    try {
      setSyncError(null);
      const next = await loadStateFromApi(portal);
      setState(next);
    } catch (err) {
      console.error('ShareCharge API sync failed', err);
      if (err.status === 401) {
        clearAuthSession(portal);
        setSyncError('הסשן פג — התחברו שוב עם OTP');
      } else {
        setSyncError(formatShareChargeApiError(err) || 'סנכרון נכשל');
      }
    } finally {
      setLoading(false);
    }
  }, [useApi, apiPortal]);

  useEffect(() => {
    if (!useApi) return undefined;
    if (!getStoredToken(apiPortal)) {
      setLoading(false);
      setSyncError(null);
      return undefined;
    }
    setLoading(true);
    refreshFromApi(apiPortal);
    const id = setInterval(() => refreshFromApi(apiPortal), 5000);
    return () => clearInterval(id);
  }, [useApi, apiPortal, refreshFromApi]);

  useEffect(() => {
    if (useApi) return undefined;
    localStorageRepository.save(state);
    return undefined;
  }, [state, useApi]);

  useEffect(() => {
    if (useApi) return undefined;
    const syncFromStorage = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setState(JSON.parse(event.newValue));
      } catch (error) {
        console.error('Failed to sync ShareCharge state', error);
      }
    };
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, [useApi]);

  const update = (producer) => {
    setState((current) => {
      const next = JSON.parse(JSON.stringify(current));
      producer(next);
      return next;
    });
  };

  const afterApi = async (portal, fn) => {
    await fn();
    await refreshFromApi(portal);
  };

  const value = useMemo(
    () => ({
      repositoryMode,
      loading,
      syncError,
      refreshFromApi,
      state,
      reset: async () => {
        if (useApi) {
          await sharechargeApi.reset(SHARECHARGE_ROLE_KEYS.system);
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.system);
        } else {
          setState(getInitialAppState());
        }
      },
      syncSessionProfiles: () => {
        if (useApi) {
          refreshFromApi(apiPortal);
          return;
        }
        update((draft) => {
          const s = loadAuthSessions();
          if (s.client?.verified && s.client?.email) {
            ensureDriverUserForEmail(draft, s.client.email);
          }
        });
      },
      createBooking: async ({ stationId, startTime, durationHours }) => {
        if (useApi) {
          const { booking } = await sharechargeApi.createBooking(SHARECHARGE_ROLE_KEYS.client, {
            stationId,
            startTime,
            durationHours,
          });
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.client);
          return booking?.id || '';
        }
        let bookingId = '';
        update((draft) => {
          const station = draft.stations.find((item) => item.id === stationId);
          if (!station) return;
          const sessionEmail = loadAuthSessions().client?.email;
          const driver = ensureDriverUserForEmail(draft, sessionEmail);
          bookingId = createId('booking');
          draft.bookings.unshift({
            id: bookingId,
            stationId,
            driverId: driver.id,
            driverEmailSnapshot: driver.email || '',
            hostId: station.hostId,
            startTime,
            durationHours,
            status: 'pending',
            createdAt: Date.now(),
            otp: '',
            kwh: 0,
            amount: 0,
            hostShare: 0,
            platformFee: 0,
            driverConfirmedStart: false,
            hostConfirmedConnection: false,
            notes: [],
          });
          addEvent(draft, `הזמנה מ${driver.name} (${driver.email || 'ללא מייל'}) → ${station.name}`);
        });
        return bookingId;
      },
      approveBooking: async (bookingId) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.provider, () => sharechargeApi.approveBooking(SHARECHARGE_ROLE_KEYS.provider, bookingId));
        return update((draft) => {
          const booking = draft.bookings.find((item) => item.id === bookingId);
          if (!booking) return;
          booking.status = 'approved';
          booking.approvedAt = Date.now();
          addEvent(draft, 'הספק אישר בקשת טעינה');
        });
      },
      rejectBooking: async (bookingId) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.provider, () => sharechargeApi.rejectBooking(SHARECHARGE_ROLE_KEYS.provider, bookingId));
        return update((draft) => {
          const booking = draft.bookings.find((item) => item.id === bookingId);
          if (!booking) return;
          booking.status = 'rejected';
          booking.rejectedAt = Date.now();
          addEvent(draft, 'הספק דחה בקשת טעינה', 'warning');
        });
      },
      markOnWay: async (bookingId) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.client, () => sharechargeApi.markOnWay(SHARECHARGE_ROLE_KEYS.client, bookingId));
        return update((draft) => {
          const booking = draft.bookings.find((item) => item.id === bookingId);
          if (!booking) return;
          booking.status = 'on_way';
          booking.otp = createOtp();
          booking.onWayAt = Date.now();
          booking.otpExpiresAt = Date.now() + draft.settings.otpWindowMinutes * 60 * 1000;
          addEvent(draft, `הנהג בדרך. נוצר קוד OTP ${booking.otp}`);
        });
      },
      verifyOtp: async (bookingId, otp) => {
        if (useApi) {
          try {
            const { ok } = await sharechargeApi.verifyOtpBooking(SHARECHARGE_ROLE_KEYS.provider, bookingId, otp);
            await refreshFromApi(SHARECHARGE_ROLE_KEYS.provider);
            return ok;
          } catch {
            return false;
          }
        }
        let ok = false;
        update((draft) => {
          const booking = draft.bookings.find((item) => item.id === bookingId);
          if (!booking || booking.otp !== otp || Date.now() > booking.otpExpiresAt) return;
          booking.status = 'otp_verified';
          booking.hostConfirmedConnection = true;
          booking.otpVerifiedAt = Date.now();
          ok = true;
          addEvent(draft, 'הספק אימת OTP וחיבור העמדה מוכן');
        });
        return ok;
      },
      driverStartCharge: async (bookingId) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.client, () => sharechargeApi.driverStartCharge(SHARECHARGE_ROLE_KEYS.client, bookingId));
        return update((draft) => {
          const booking = draft.bookings.find((item) => item.id === bookingId);
          if (!booking || booking.status !== 'otp_verified') return;
          booking.status = 'charging';
          booking.driverConfirmedStart = true;
          booking.startedAt = Date.now();
          addEvent(draft, 'הנהג אישר התחלת טעינה');
        });
      },
      finishCharge: async (bookingId, kwh) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.provider, () => sharechargeApi.finishCharge(SHARECHARGE_ROLE_KEYS.provider, bookingId, kwh));
        return update((draft) => {
          const booking = draft.bookings.find((item) => item.id === bookingId);
          if (!booking || booking.status !== 'charging') return;
          const station = draft.stations.find((item) => item.id === booking.stationId);
          const amount = Number((kwh * station.pricePerKwh).toFixed(2));
          const platformFee = Number((amount * draft.settings.commission / 100).toFixed(2));
          const hostShare = Number((amount - platformFee).toFixed(2));
          booking.status = 'completed';
          booking.completedAt = Date.now();
          booking.kwh = kwh;
          booking.amount = amount;
          booking.platformFee = platformFee;
          booking.hostShare = hostShare;
          draft.transactions.unshift({
            id: createId('tx'),
            bookingId,
            stationId: station.id,
            driverId: booking.driverId,
            hostId: booking.hostId,
            amount,
            hostShare,
            platformFee,
            kwh,
            status: 'paid_mock',
            createdAt: Date.now(),
          });
          addEvent(draft, `טעינה הסתיימה · חויב סך ${currency(amount)}`);
        });
      },
      updateStation: async (stationId, patch) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.provider, () => sharechargeApi.updateStation(SHARECHARGE_ROLE_KEYS.provider, stationId, patch));
        return update((draft) => {
          const station = draft.stations.find((item) => item.id === stationId);
          if (!station) return;
          Object.assign(station, patch);
          addEvent(draft, 'הספק עדכן פרטי עמדה');
        });
      },
      addStation: async (stationData) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.system, () => sharechargeApi.addStation(SHARECHARGE_ROLE_KEYS.system, stationData));
        return update((draft) => {
          const host = draft.users.find((user) => user.id === stationData.hostId);
          draft.stations.unshift({
            id: createId('station'),
            hostId: stationData.hostId,
            name: stationData.name,
            address: stationData.address,
            lat: stationData.lat != null ? Number(stationData.lat) : 32.08,
            lng: stationData.lng != null ? Number(stationData.lng) : 34.78,
            distance: Number(stationData.distance || 1),
            power: Number(stationData.power || 11),
            plug: stationData.plug || 'Type 2',
            pricePerKwh: Number(stationData.pricePerKwh || 1.25),
            available: true,
            rating: 5,
            photos: 0,
            termsText: stationData.termsText || '',
            createdAt: Date.now(),
          });
          addEvent(draft, `מנהל הוסיף עמדה חדשה${host ? ` עבור ${host.name}` : ''}`);
        });
      },
      addHost: async (hostData) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.system, () => sharechargeApi.addHost(SHARECHARGE_ROLE_KEYS.system, hostData));
        return update((draft) => {
          draft.users.unshift({
            id: createId('host'),
            name: hostData.name,
            email: hostData.email,
            role: 'host',
            verified: true,
            blocked: false,
            revenue: 0,
            createdAt: Date.now(),
          });
          addEvent(draft, `מנהל הוסיף ספק חדש: ${hostData.name}`);
        });
      },
      addDriver: async (driverData) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.system, () => sharechargeApi.addDriver(SHARECHARGE_ROLE_KEYS.system, driverData));
        return update((draft) => {
          draft.users.unshift({
            id: createId('driver'),
            name: driverData.name,
            email: driverData.email,
            role: 'driver',
            verified: true,
            blocked: false,
            spend: 0,
            createdAt: Date.now(),
          });
          addEvent(draft, `מנהל הוסיף לקוח: ${driverData.name}`);
        });
      },
      openDispute: async (bookingId, reason) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.client, () => sharechargeApi.openDispute(SHARECHARGE_ROLE_KEYS.client, bookingId, reason));
        return update((draft) => {
          if (draft.disputes.some((item) => item.bookingId === bookingId && item.status === 'open')) return;
          draft.disputes.unshift({ id: createId('dispute'), bookingId, reason, status: 'open', createdAt: Date.now() });
          addEvent(draft, 'נפתחה מחלוקת לטיפול מנהל', 'warning');
        });
      },
      resolveDispute: async (disputeId) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.system, () => sharechargeApi.resolveDispute(SHARECHARGE_ROLE_KEYS.system, disputeId));
        return update((draft) => {
          const dispute = draft.disputes.find((item) => item.id === disputeId);
          if (!dispute) return;
          dispute.status = 'resolved';
          dispute.resolvedAt = Date.now();
          addEvent(draft, 'מנהל סגר מחלוקת');
        });
      },
      toggleBlockUser: async (userId) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.system, () => sharechargeApi.toggleBlockUser(SHARECHARGE_ROLE_KEYS.system, userId));
        return update((draft) => {
          const user = draft.users.find((item) => item.id === userId);
          if (!user) return;
          user.blocked = !user.blocked;
          addEvent(draft, `${user.name} ${user.blocked ? 'נחסם' : 'שוחרר מחסימה'}`, 'security');
        });
      },
      setCommission: async (commission) => {
        if (useApi) return afterApi(SHARECHARGE_ROLE_KEYS.system, () => sharechargeApi.setCommission(SHARECHARGE_ROLE_KEYS.system, commission));
        return update((draft) => {
          draft.settings.commission = Number(commission);
          addEvent(draft, `עמלת המיזם עודכנה ל-${commission}%`);
        });
      },
    }),
    [state, loading, syncError, refreshFromApi, repositoryMode, useApi, apiPortal],
  );

  return <ShareChargeContext.Provider value={value}>{children}</ShareChargeContext.Provider>;
}

export function useShareCharge() {
  const ctx = useContext(ShareChargeContext);
  if (!ctx) throw new Error('useShareCharge must be used within ShareChargeProvider');
  return ctx;
}
