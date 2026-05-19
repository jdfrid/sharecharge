import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { localStorageRepository } from '../data/localStorageRepository';
import { getPreferredRepositoryMode } from '../data/apiRepository.stub';
import { getInitialAppState } from '../state/initialState';
import { STORAGE_KEY } from '../constants';
import { createId, createOtp, currency } from '../utils';
import { loadAuthSessions } from '../auth/session';
import { ensureDriverUserForEmail } from '../auth/identity';

const ShareChargeContext = createContext(null);

function addEvent(draft, text, type = 'activity') {
  draft.events.unshift({ id: createId('event'), text, type, time: Date.now() });
  draft.events = draft.events.slice(0, 20);
}

function getInitialState() {
  try {
    const fromRepo = localStorageRepository.load();
    if (fromRepo && typeof fromRepo === 'object') return fromRepo;
  } catch (error) {
    console.error('Failed to load ShareCharge state', error);
  }
  return getInitialAppState();
}

export function ShareChargeProvider({ children }) {
  const repositoryMode = getPreferredRepositoryMode();

  const [state, setState] = useState(() => getInitialState());

  useEffect(() => {
    localStorageRepository.save(state);
  }, [state]);

  useEffect(() => {
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
  }, []);

  const update = (producer) => {
    setState((current) => {
      const next = structuredClone(current);
      producer(next);
      return next;
    });
  };

  const value = useMemo(
    () => ({
      repositoryMode,
      state,
      reset: () => setState(getInitialAppState()),
      syncSessionProfiles: () => update((draft) => {
        const s = loadAuthSessions();
        if (s.client?.verified && s.client?.email) {
          ensureDriverUserForEmail(draft, s.client.email);
        }
      }),
      createBooking: ({ stationId, startTime, durationHours }) => {
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
      approveBooking: (bookingId) => update((draft) => {
        const booking = draft.bookings.find((item) => item.id === bookingId);
        if (!booking) return;
        booking.status = 'approved';
        booking.approvedAt = Date.now();
        addEvent(draft, 'הספק אישר בקשת טעינה');
      }),
      rejectBooking: (bookingId) => update((draft) => {
        const booking = draft.bookings.find((item) => item.id === bookingId);
        if (!booking) return;
        booking.status = 'rejected';
        booking.rejectedAt = Date.now();
        addEvent(draft, 'הספק דחה בקשת טעינה', 'warning');
      }),
      markOnWay: (bookingId) => update((draft) => {
        const booking = draft.bookings.find((item) => item.id === bookingId);
        if (!booking) return;
        booking.status = 'on_way';
        booking.otp = createOtp();
        booking.onWayAt = Date.now();
        booking.otpExpiresAt = Date.now() + draft.settings.otpWindowMinutes * 60 * 1000;
        addEvent(draft, `הנהג בדרך. נוצר קוד OTP ${booking.otp}`);
      }),
      verifyOtp: (bookingId, otp) => {
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
      driverStartCharge: (bookingId) => update((draft) => {
        const booking = draft.bookings.find((item) => item.id === bookingId);
        if (!booking || booking.status !== 'otp_verified') return;
        booking.status = 'charging';
        booking.driverConfirmedStart = true;
        booking.startedAt = Date.now();
        addEvent(draft, 'הנהג אישר התחלת טעינה');
      }),
      finishCharge: (bookingId, kwh) => update((draft) => {
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
      }),
      updateStation: (stationId, patch) => update((draft) => {
        const station = draft.stations.find((item) => item.id === stationId);
        if (!station) return;
        Object.assign(station, patch);
        addEvent(draft, 'הספק עדכן פרטי עמדה');
      }),
      addStation: (stationData) => update((draft) => {
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
      }),
      addHost: (hostData) => update((draft) => {
        const hostId = createId('host');
        draft.users.unshift({
          id: hostId,
          name: hostData.name,
          email: hostData.email,
          role: 'host',
          verified: true,
          blocked: false,
          revenue: 0,
          createdAt: Date.now(),
        });
        addEvent(draft, `מנהל הוסיף ספק חדש: ${hostData.name}`);
      }),
      addDriver: (driverData) => update((draft) => {
        const id = createId('driver');
        draft.users.unshift({
          id,
          name: driverData.name,
          email: driverData.email,
          role: 'driver',
          verified: true,
          blocked: false,
          spend: 0,
          createdAt: Date.now(),
        });
        addEvent(draft, `מנהל הוסיף לקוח: ${driverData.name}`);
      }),
      openDispute: (bookingId, reason) => update((draft) => {
        if (draft.disputes.some((item) => item.bookingId === bookingId && item.status === 'open')) return;
        draft.disputes.unshift({ id: createId('dispute'), bookingId, reason, status: 'open', createdAt: Date.now() });
        addEvent(draft, 'נפתחה מחלוקת לטיפול מנהל', 'warning');
      }),
      resolveDispute: (disputeId) => update((draft) => {
        const dispute = draft.disputes.find((item) => item.id === disputeId);
        if (!dispute) return;
        dispute.status = 'resolved';
        dispute.resolvedAt = Date.now();
        addEvent(draft, 'מנהל סגר מחלוקת');
      }),
      toggleBlockUser: (userId) => update((draft) => {
        const user = draft.users.find((item) => item.id === userId);
        if (!user) return;
        user.blocked = !user.blocked;
        addEvent(draft, `${user.name} ${user.blocked ? 'נחסם' : 'שוחרר מחסימה'}`, 'security');
      }),
      setCommission: (commission) => update((draft) => {
        draft.settings.commission = Number(commission);
        addEvent(draft, `עמלת המיזם עודכנה ל-${commission}%`);
      }),
    }),
    [state],
  );

  return <ShareChargeContext.Provider value={value}>{children}</ShareChargeContext.Provider>;
}

export function useShareCharge() {
  const ctx = useContext(ShareChargeContext);
  if (!ctx) throw new Error('useShareCharge must be used within ShareChargeProvider');
  return ctx;
}
