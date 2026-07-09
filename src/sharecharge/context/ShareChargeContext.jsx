import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { localStorageRepository } from '../data/localStorageRepository';
import { getPreferredRepositoryMode } from '../data/apiRepository.stub';
import { isApiMode, loadStateFromApi } from '../data/apiRepository';
import { formatShareChargeApiError, getAuthToken, getStoredToken, sharechargeApi } from '../data/sharechargeApi';
import { getInitialAppState } from '../state/initialState';
import { STORAGE_KEY, SHARECHARGE_ROLE_KEYS } from '../constants';
import { createId, createOtp, currency } from '../utils';
import { buildDefaultSplits } from '../utils/paymentUtils';
import { findActiveBookingForStation } from '../utils/stationAvailability';
import { clearAuthSession, loadAuthSessions } from '../auth/session';
import { resolveApiPortal } from '../auth/portal';
import { ensureDriverUserForEmail, resolveHostIdForSession } from '../auth/identity';

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
    if (!getAuthToken(apiPortal)) {
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

  const syncTenderSnapshot = useCallback(({ request, bids } = {}) => {
    if (!request?.id && !(bids?.length)) return;
    update((draft) => {
      if (!draft.serviceRequests) draft.serviceRequests = [];
      if (!draft.serviceBids) draft.serviceBids = [];
      if (request?.id) {
        const requestIdx = draft.serviceRequests.findIndex((item) => item.id === request.id);
        if (requestIdx >= 0) draft.serviceRequests[requestIdx] = request;
        else draft.serviceRequests.unshift(request);
      }
      for (const bid of bids || []) {
        const bidIdx = draft.serviceBids.findIndex((item) => item.id === bid.id);
        if (bidIdx >= 0) draft.serviceBids[bidIdx] = bid;
        else draft.serviceBids.unshift(bid);
      }
    });
  }, []);

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
      resetTestingData: async () => {
        if (useApi) {
          const data = await sharechargeApi.resetTestingData(SHARECHARGE_ROLE_KEYS.system);
          if (data?.state) setState(data.state);
          else await refreshFromApi(SHARECHARGE_ROLE_KEYS.system);
          return data;
        }
        update((draft) => {
          draft.bookings = [];
          draft.transactions = [];
          draft.disputes = [];
          draft.serviceRequests = [];
          draft.serviceBids = [];
          draft.payments = [];
          draft.paymentMethods = [];
          draft.events = [];
          addEvent(draft, 'איפוס נתוני בדיקות (מקומי)', 'system');
        });
        return { ok: true };
      },
      clearEvents: async () => {
        if (useApi) {
          const data = await sharechargeApi.clearEvents(SHARECHARGE_ROLE_KEYS.system);
          if (data?.state) setState(data.state);
          else await refreshFromApi(SHARECHARGE_ROLE_KEYS.system);
          return data;
        }
        update((draft) => {
          draft.events = [];
        });
        return { ok: true };
      },
      updateAdminEntity: async (type, id, patch, extraId) => {
        const portal = SHARECHARGE_ROLE_KEYS.system;
        const apiMap = {
          user: (entityId, body) => sharechargeApi.updateAdminUser(portal, entityId, body),
          station: (entityId, body) => sharechargeApi.updateAdminStation(portal, entityId, body),
          booking: (entityId, body) => sharechargeApi.updateAdminBooking(portal, entityId, body),
          tender: (entityId, body) => sharechargeApi.updateAdminTender(portal, entityId, body),
          bid: (entityId, body) => sharechargeApi.updateAdminBid(portal, extraId, entityId, body),
          dispute: (entityId, body) => sharechargeApi.updateAdminDispute(portal, entityId, body),
          payment: (entityId, body) => sharechargeApi.updateAdminPayment(portal, entityId, body),
        };
        if (useApi) {
          const fn = apiMap[type];
          if (!fn) throw new Error('Unknown entity type');
          const data = await fn(id, patch);
          if (data?.state) setState(data.state);
          else await refreshFromApi(portal);
          return data;
        }
        update((draft) => {
          const apply = (list, entityId, fields) => {
            const item = list?.find((row) => row.id === entityId);
            if (!item) return;
            Object.assign(item, fields);
          };
          if (type === 'user') apply(draft.users, id, patch);
          else if (type === 'station') apply(draft.stations, id, patch);
          else if (type === 'booking') apply(draft.bookings, id, patch);
          else if (type === 'tender') apply(draft.serviceRequests, id, patch);
          else if (type === 'bid') apply(draft.serviceBids, id, patch);
          else if (type === 'dispute') apply(draft.disputes, id, patch);
          else if (type === 'payment') apply(draft.payments, id, patch);
          addEvent(draft, `עודכן ${type}`, 'system');
        });
        return { ok: true };
      },
      createAdminEntity: async (type, payload) => {
        const portal = SHARECHARGE_ROLE_KEYS.system;
        if (useApi) {
          let data;
          if (type === 'host') data = await sharechargeApi.addHost(portal, payload);
          else if (type === 'driver') data = await sharechargeApi.addDriver(portal, payload);
          else if (type === 'station') data = await sharechargeApi.addStation(portal, payload);
          else throw new Error('Unknown create type');
          await refreshFromApi(portal);
          return data;
        }
        update((draft) => {
          if (type === 'host') {
            draft.users.unshift({
              id: createId('host'),
              name: payload.name,
              email: payload.email,
              role: 'host',
              verified: true,
              blocked: false,
              revenue: 0,
              createdAt: Date.now(),
            });
            addEvent(draft, `מנהל הוסיף ספק חדש: ${payload.name}`);
          } else if (type === 'driver') {
            draft.users.unshift({
              id: createId('driver'),
              name: payload.name,
              email: payload.email,
              role: 'driver',
              verified: true,
              blocked: false,
              spend: 0,
              createdAt: Date.now(),
            });
            addEvent(draft, `מנהל הוסיף לקוח: ${payload.name}`);
          } else if (type === 'station') {
            const host = draft.users.find((user) => user.id === payload.hostId);
            const serviceCategory = payload.serviceCategory || 'charging';
            const isSos = serviceCategory !== 'charging';
            draft.stations.unshift({
              id: createId('station'),
              hostId: payload.hostId,
              name: payload.name,
              address: payload.address,
              lat: payload.lat != null ? Number(payload.lat) : 32.08,
              lng: payload.lng != null ? Number(payload.lng) : 34.78,
              distance: Number(payload.distance || 1),
              power: isSos ? 0 : Number(payload.power || 11),
              plug: isSos ? '—' : payload.plug || 'Type 2',
              pricePerKwh: isSos ? 0 : Number(payload.pricePerKwh || 1.25),
              available: true,
              rating: 5,
              photos: 0,
              termsText: payload.termsText || (isSos ? 'שירות חירום · נוסף על ידי מנהל' : ''),
              serviceCategory,
              createdAt: Date.now(),
            });
            addEvent(draft, `מנהל הוסיף ${isSos ? 'נקודת SOS' : 'עמדה חדשה'}${host ? ` עבור ${host.name}` : ''}`);
          }
        });
        return { ok: true };
      },
      deleteAdminEntity: async (type, id, extraId) => {
        const portal = SHARECHARGE_ROLE_KEYS.system;
        const apiMap = {
          user: sharechargeApi.deleteUser,
          station: sharechargeApi.deleteStation,
          booking: sharechargeApi.deleteBooking,
          tender: sharechargeApi.deleteTender,
          bid: (p, bidId, requestId) => sharechargeApi.deleteAdminBid(p, requestId, bidId),
          dispute: sharechargeApi.deleteDispute,
          payment: sharechargeApi.deletePayment,
        };
        if (useApi) {
          const fn = apiMap[type];
          if (!fn) throw new Error('Unknown entity type');
          const data = type === 'bid' ? await fn(portal, id, extraId) : await fn(portal, id);
          if (data?.state) setState(data.state);
          else await refreshFromApi(portal);
          return data;
        }
        update((draft) => {
          const removeBooking = (bookingId) => {
            draft.transactions = (draft.transactions || []).filter((tx) => tx.bookingId !== bookingId);
            draft.disputes = (draft.disputes || []).filter((d) => d.bookingId !== bookingId);
            draft.bookings = (draft.bookings || []).filter((b) => b.id !== bookingId);
          };
          if (type === 'user') {
            const user = draft.users?.find((u) => u.id === id);
            if (!user || user.role === 'admin') return;
            (draft.bookings || []).filter((b) => b.driverId === id || b.hostId === id).forEach((b) => removeBooking(b.id));
            draft.serviceRequests = (draft.serviceRequests || []).filter((r) => r.driverId !== id);
            draft.serviceBids = (draft.serviceBids || []).filter((b) =>
              (draft.serviceRequests || []).some((r) => r.id === b.requestId),
            );
            draft.payments = (draft.payments || []).filter((p) => p.payerId !== id && p.hostId !== id);
            draft.paymentMethods = (draft.paymentMethods || []).filter((m) => m.userId !== id);
            (draft.stations || []).filter((s) => s.hostId === id).forEach((s) => {
              (draft.bookings || []).filter((b) => b.stationId === s.id).forEach((b) => removeBooking(b.id));
            });
            draft.stations = (draft.stations || []).filter((s) => s.hostId !== id);
            draft.users = (draft.users || []).filter((u) => u.id !== id);
            addEvent(draft, `נמחק משתמש: ${user.name}`, 'system');
          } else if (type === 'station') {
            const station = draft.stations?.find((s) => s.id === id);
            (draft.bookings || []).filter((b) => b.stationId === id).forEach((b) => removeBooking(b.id));
            draft.stations = (draft.stations || []).filter((s) => s.id !== id);
            if (station) addEvent(draft, `נמחקה עמדה: ${station.name}`, 'system');
          } else if (type === 'booking') {
            removeBooking(id);
            addEvent(draft, 'נמחקה הזמנה', 'system');
          } else if (type === 'tender') {
            draft.serviceBids = (draft.serviceBids || []).filter((b) => b.requestId !== id);
            draft.serviceRequests = (draft.serviceRequests || []).filter((r) => r.id !== id);
            addEvent(draft, 'נמחקה קריאת חירום', 'system');
          } else if (type === 'bid') {
            draft.serviceBids = (draft.serviceBids || []).filter((b) => b.id !== id);
            addEvent(draft, 'נמחקה הצעת מחיר', 'system');
          } else if (type === 'dispute') {
            draft.disputes = (draft.disputes || []).filter((d) => d.id !== id);
          } else if (type === 'payment') {
            draft.payments = (draft.payments || []).filter((p) => p.id !== id);
          }
        });
        return { ok: true };
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
      syncTenderSnapshot,
      createBooking: async ({ stationId, startTime, durationHours }) => {
        if (useApi) {
          try {
            const { booking } = await sharechargeApi.createBooking(SHARECHARGE_ROLE_KEYS.client, {
              stationId,
              startTime,
              durationHours,
            });
            await refreshFromApi(SHARECHARGE_ROLE_KEYS.client);
            return booking?.id || '';
          } catch (err) {
            if (err.status === 401) {
              clearAuthSession(SHARECHARGE_ROLE_KEYS.client);
            }
            throw new Error(formatShareChargeApiError(err, 'booking'));
          }
        }
        let bookingId = '';
        let localError = '';
        update((draft) => {
          const station = draft.stations.find((item) => item.id === stationId);
          if (!station) {
            localError = 'station_not_found';
            return;
          }
          if (!station.available) {
            localError = 'station_unavailable';
            return;
          }
          if (findActiveBookingForStation(stationId, draft.bookings)) {
            localError = 'station_occupied';
            return;
          }
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
        if (localError) {
          const messages = {
            station_not_found: 'עמדה לא נמצאה — רעננו את הרשימה',
            station_unavailable: 'העמדה לא זמינה — הספק יכול לשחרר מלוח הבקרה',
            station_occupied: 'העמדה תפוסה בהזמנה פעילה — נסו עמדה אחרת',
          };
          throw new Error(messages[localError] || 'שליחת ההזמנה נכשלה');
        }
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
          const serviceCategory = stationData.serviceCategory || 'charging';
          const isSos = serviceCategory !== 'charging';
          draft.stations.unshift({
            id: createId('station'),
            hostId: stationData.hostId,
            name: stationData.name,
            address: stationData.address,
            lat: stationData.lat != null ? Number(stationData.lat) : 32.08,
            lng: stationData.lng != null ? Number(stationData.lng) : 34.78,
            distance: Number(stationData.distance || 1),
            power: isSos ? 0 : Number(stationData.power || 11),
            plug: isSos ? '—' : stationData.plug || 'Type 2',
            pricePerKwh: isSos ? 0 : Number(stationData.pricePerKwh || 1.25),
            available: true,
            rating: 5,
            photos: 0,
            termsText: stationData.termsText || (isSos ? 'שירות חירום · נוסף על ידי מנהל' : ''),
            serviceCategory,
            createdAt: Date.now(),
          });
          addEvent(draft, `מנהל הוסיף ${isSos ? 'נקודת SOS' : 'עמדה חדשה'}${host ? ` עבור ${host.name}` : ''}`);
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
      createTender: async ({
        category,
        lat,
        lng,
        addressText,
        vehicleProfile,
        problemDescription,
        phone,
        notifyRadiusKm,
      }) => {
        if (useApi) {
          try {
            const data = await sharechargeApi.createTender(SHARECHARGE_ROLE_KEYS.client, {
              category,
              lat,
              lng,
              addressText,
              vehicleProfile,
              problemDescription,
              phone,
              notifyRadiusKm,
            });
            await refreshFromApi(SHARECHARGE_ROLE_KEYS.client);
            return data.request;
          } catch (err) {
            throw new Error(formatShareChargeApiError(err, 'booking'));
          }
        }
        let created = null;
        update((draft) => {
          if (!draft.serviceRequests) draft.serviceRequests = [];
          if (!draft.serviceBids) draft.serviceBids = [];
          const sessionEmail = loadAuthSessions().client?.email;
          const driver = ensureDriverUserForEmail(draft, sessionEmail);
          const id = createId('tender');
          created = {
            id,
            driverId: driver.id,
            category,
            lat,
            lng,
            addressText: addressText || '',
            vehicleProfile: vehicleProfile || {},
            status: 'open',
            amount: 0,
            createdAt: Date.now(),
          };
          draft.serviceRequests.unshift(created);
          const demoBids = [
            { hostId: 'host-1', eta: 10, lines: [{ label: 'נסיעה', amount: 60 }, { label: 'שירות', amount: 60 }] },
            { hostId: 'host-2', eta: 12, lines: [{ label: 'נסיעה', amount: 70 }, { label: 'תיקון', amount: 50 }] },
          ];
          for (const tpl of demoBids) {
            draft.serviceBids.unshift({
              id: createId('bid'),
              requestId: id,
              hostId: tpl.hostId,
              lineItems: tpl.lines,
              total: tpl.lines.reduce((s, l) => s + l.amount, 0),
              etaMinutes: tpl.eta,
              status: 'pending',
              createdAt: Date.now(),
            });
          }
          addEvent(draft, `קריאת חירום: ${category}`);
        });
        return created;
      },
      acceptTenderBid: async (requestId, bidId) => {
        if (useApi) {
          const data = await sharechargeApi.acceptTenderBid(SHARECHARGE_ROLE_KEYS.client, requestId, bidId);
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.client);
          return data;
        }
        update((draft) => {
          const request = draft.serviceRequests?.find((item) => item.id === requestId);
          const bid = draft.serviceBids?.find((item) => item.id === bidId);
          if (!request || !bid) return;
          request.status = 'pending_provider';
          request.acceptedBidId = bidId;
          request.hostId = bid.hostId;
          request.amount = bid.total;
          bid.status = 'accepted';
        });
      },
      confirmTenderAssignment: async (requestId) => {
        if (useApi) {
          const data = await sharechargeApi.confirmTenderAssignment(SHARECHARGE_ROLE_KEYS.provider, requestId);
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.provider);
          return data;
        }
        update((draft) => {
          const request = draft.serviceRequests?.find((item) => item.id === requestId);
          if (!request || request.status !== 'pending_provider') return;
          request.status = 'assigned';
        });
      },
      declineTenderAssignment: async (requestId) => {
        if (useApi) {
          const data = await sharechargeApi.declineTenderAssignment(SHARECHARGE_ROLE_KEYS.provider, requestId);
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.provider);
          return data;
        }
        update((draft) => {
          const request = draft.serviceRequests?.find((item) => item.id === requestId);
          const bid = draft.serviceBids?.find((item) => item.id === request?.acceptedBidId);
          if (!request || request.status !== 'pending_provider') return;
          request.status = 'open';
          request.acceptedBidId = null;
          request.hostId = null;
          request.amount = 0;
          if (bid) bid.status = 'pending';
        });
      },
      counterTenderBid: async (requestId, bidId, payload) => {
        if (useApi) {
          const data = await sharechargeApi.counterTenderBid(
            SHARECHARGE_ROLE_KEYS.client,
            requestId,
            bidId,
            payload,
          );
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.client);
          return data;
        }
        update((draft) => {
          const bid = draft.serviceBids?.find((item) => item.id === bidId);
          if (!bid) return;
          bid.driverCounterTotal = Number(payload.total);
          bid.driverCounterEtaMinutes = Number(payload.etaMinutes || 15);
          bid.driverCounterMessage = payload.message || '';
          bid.driverCounterAt = Date.now();
        });
      },
      reviseTenderBid: async (requestId, bidId, payload) => {
        if (useApi) {
          const data = await sharechargeApi.reviseTenderBid(
            SHARECHARGE_ROLE_KEYS.provider,
            requestId,
            bidId,
            payload,
          );
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.provider);
          return data;
        }
        update((draft) => {
          const bid = draft.serviceBids?.find((item) => item.id === bidId);
          if (!bid) return;
          bid.total = Number(payload.total);
          bid.etaMinutes = Number(payload.etaMinutes || 15);
          bid.driverCounterTotal = null;
          bid.driverCounterEtaMinutes = null;
          bid.driverCounterMessage = null;
        });
      },
      submitTenderBid: async (requestId, payload) => {
        if (useApi) {
          const data = await sharechargeApi.submitTenderBid(SHARECHARGE_ROLE_KEYS.provider, requestId, payload);
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.provider);
          return data;
        }
        let bid = null;
        update((draft) => {
          if (!draft.serviceBids) draft.serviceBids = [];
          const hostId = resolveHostIdForSession(draft);
          const existing = draft.serviceBids.find(
            (item) => item.requestId === requestId && item.hostId === hostId && item.status === 'pending',
          );
          if (existing) {
            existing.lineItems = payload.lineItems || [];
            existing.total = Number(payload.total || 0);
            existing.etaMinutes = Number(payload.etaMinutes || 15);
            bid = existing;
            return;
          }
          bid = {
            id: createId('bid'),
            requestId,
            hostId,
            lineItems: payload.lineItems || [],
            total: Number(payload.total || 0),
            etaMinutes: Number(payload.etaMinutes || 15),
            status: 'pending',
            createdAt: Date.now(),
          };
          draft.serviceBids.unshift(bid);
        });
        return { bid };
      },
      completeTender: async (requestId) => {
        if (useApi) {
          const data = await sharechargeApi.completeTender(SHARECHARGE_ROLE_KEYS.provider, requestId);
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.provider);
          return data;
        }
        update((draft) => {
          const request = draft.serviceRequests?.find((item) => item.id === requestId);
          if (!request) return;
          request.status = 'completed';
          request.completedAt = Date.now();
        });
      },
      fetchPaymentSummary: async (portal = apiPortal) => {
        if (useApi) {
          const data = await sharechargeApi.fetchPaymentSummary(portal);
          return data.summary;
        }
        const paid = (state.payments || []).filter((p) => p.status === 'paid');
        if (portal === SHARECHARGE_ROLE_KEYS.system) {
          return {
            count: paid.length,
            volume: paid.reduce((s, p) => s + p.amount, 0),
            platformFees: paid.reduce((s, p) => s + p.platformFee, 0),
            hostPayouts: paid.reduce((s, p) => s + p.hostShare, 0),
            pendingPayouts: 0,
          };
        }
        if (portal === SHARECHARGE_ROLE_KEYS.provider) {
          const hostPaid = paid.filter((p) => p.hostId);
          return {
            count: hostPaid.length,
            earned: hostPaid.reduce((s, p) => s + p.hostShare, 0),
            settled: hostPaid.reduce((s, p) => s + p.hostShare, 0),
            pendingPayouts: 0,
          };
        }
        return { count: paid.length, spent: paid.reduce((s, p) => s + p.amount, 0) };
      },
      createPaymentCheckout: async (payload) => {
        if (useApi) {
          const data = await sharechargeApi.createPaymentCheckout(SHARECHARGE_ROLE_KEYS.client, payload);
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.client);
          return data.payment;
        }
        let created = null;
        update((draft) => {
          if (!draft.payments) draft.payments = [];
          const sessionEmail = loadAuthSessions().client?.email;
          const driver = ensureDriverUserForEmail(draft, sessionEmail);
          const id = createId('pay');
          const splits = buildDefaultSplits(payload).map((split, index) => ({
            id: createId(`split-${index}`),
            paymentId: id,
            ...split,
            status: 'pending',
            createdAt: Date.now(),
          }));
          created = {
            id,
            referenceType: payload.referenceType,
            referenceId: payload.referenceId,
            payerId: driver.id,
            hostId: payload.hostId,
            title: payload.title,
            amount: payload.amount,
            platformFee: payload.platformFee,
            hostShare: payload.hostShare,
            currency: 'ILS',
            status: 'pending',
            gateway: 'tranzila',
            createdAt: Date.now(),
            splits,
          };
          draft.payments.unshift(created);
        });
        return created;
      },
      updatePaymentSplits: async (paymentId, cardSplits) => {
        if (useApi) {
          const data = await sharechargeApi.updatePaymentSplits(SHARECHARGE_ROLE_KEYS.client, paymentId, cardSplits);
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.client);
          return data.payment;
        }
        let updated = null;
        update((draft) => {
          const payment = draft.payments?.find((item) => item.id === paymentId);
          if (!payment) return;
          payment.splits = [
            ...cardSplits.map((item, index) => ({
              id: createId(`split-${index}`),
              paymentId,
              splitType: 'card_charge',
              cardLast4: item.cardLast4,
              cardBrand: item.cardBrand,
              amount: Number(item.amount),
              status: 'pending',
              createdAt: Date.now(),
            })),
            ...(payment.splits || []).filter((s) => s.splitType !== 'card_charge'),
          ];
          updated = payment;
        });
        return updated;
      },
      chargePayment: async (paymentId, cardPayload) => {
        if (useApi) {
          const data = await sharechargeApi.chargePayment(SHARECHARGE_ROLE_KEYS.client, paymentId, cardPayload);
          await refreshFromApi(SHARECHARGE_ROLE_KEYS.client);
          return data;
        }
        let result = null;
        update((draft) => {
          const payment = draft.payments?.find((item) => item.id === paymentId);
          if (!payment) return;
          payment.status = 'paid';
          payment.gatewayTxnId = `tz-mock-${createId('tx')}`;
          payment.paidAt = Date.now();
          payment.splits.forEach((split) => {
            split.status = split.splitType === 'card_charge' ? 'paid' : 'settled';
            if (split.splitType === 'card_charge') split.gatewayTxnId = payment.gatewayTxnId;
          });
          result = { ok: true, payment };
          addEvent(draft, `תשלום ${currency(payment.amount)} בוצע · Tranzila`);
        });
        return result;
      },
      createTranzilaSession: async (paymentId, splitIndex = 0) => {
        if (useApi) {
          const data = await sharechargeApi.createTranzilaSession(SHARECHARGE_ROLE_KEYS.client, paymentId, splitIndex);
          return data.session;
        }
        let session = null;
        update((draft) => {
          const payment = draft.payments?.find((item) => item.id === paymentId);
          const chargeSplits = payment?.splits?.filter((s) => s.splitType === 'card_charge') || [];
          const split = chargeSplits[splitIndex];
          session = {
            iframeUrl: '',
            fields: {},
            mock: true,
            paymentId,
            splitIndex,
            splitAmount: split?.amount || payment?.amount || 0,
            totalSplits: chargeSplits.length || 1,
            supplier: 'mock',
          };
        });
        return session;
      },
      fetchTranzilaConfig: async () => {
        if (useApi) {
          const data = await sharechargeApi.fetchTranzilaConfig(SHARECHARGE_ROLE_KEYS.client);
          return data.config;
        }
        return { mock: true, ready: false, terminal: '', iframeBase: 'https://directng.tranzila.com' };
      },
    }),
    [state, loading, syncError, refreshFromApi, syncTenderSnapshot, repositoryMode, useApi, apiPortal],
  );

  return <ShareChargeContext.Provider value={value}>{children}</ShareChargeContext.Provider>;
}

export function useShareCharge() {
  const ctx = useContext(ShareChargeContext);
  if (!ctx) throw new Error('useShareCharge must be used within ShareChargeProvider');
  return ctx;
}
