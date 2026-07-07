export const ACTIVE_BOOKING_STATUSES = ['pending', 'approved', 'on_way', 'otp_verified', 'charging'];

export function findActiveBookingForStation(stationId, bookings = []) {
  return bookings.find(
    (booking) => booking.stationId === stationId && ACTIVE_BOOKING_STATUSES.includes(booking.status),
  );
}

export function getStationAvailability(station, bookings = []) {
  if (!station?.available) {
    return {
      canBook: false,
      status: 'unavailable',
      label: 'לא זמינה',
      reason: 'הספק סימן את העמדה כלא זמינה — ניתן לשחרר מלוח הבקרה של הספק',
    };
  }

  const activeBooking = findActiveBookingForStation(station.id, bookings);
  if (activeBooking) {
    return {
      canBook: false,
      status: 'occupied',
      label: 'תפוסה',
      reason: 'יש הזמנה פעילה על עמדה זו — תשוחרר אוטומטית בסיום או בדחייה',
      activeBookingId: activeBooking.id,
      activeBookingStatus: activeBooking.status,
    };
  }

  return {
    canBook: true,
    status: 'available',
    label: 'זמינה',
    reason: '',
  };
}

export function enrichStationWithAvailability(station, bookings = []) {
  const availability = getStationAvailability(station, bookings);
  return { ...station, availability };
}
