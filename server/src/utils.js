export function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export const PORTAL_TO_ROLE = {
  client: 'driver',
  provider: 'host',
  system: 'admin',
};

export function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    verified: row.verified,
    blocked: row.blocked,
    revenue: Number(row.revenue),
    spend: Number(row.spend),
    createdAt: Number(row.created_at),
  };
}

export function rowToStation(row) {
  return {
    id: row.id,
    hostId: row.host_id,
    name: row.name,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    distance: Number(row.distance),
    power: Number(row.power),
    plug: row.plug,
    pricePerKwh: Number(row.price_per_kwh),
    available: row.available,
    rating: Number(row.rating),
    photos: row.photos,
    termsText: row.terms_text,
    createdAt: row.created_at ? Number(row.created_at) : undefined,
  };
}

export function rowToBooking(row) {
  return {
    id: row.id,
    stationId: row.station_id,
    driverId: row.driver_id,
    driverEmailSnapshot: row.driver_email_snapshot,
    hostId: row.host_id,
    startTime: row.start_time,
    durationHours: row.duration_hours,
    status: row.status,
    otp: row.otp || '',
    otpExpiresAt: row.otp_expires_at ? Number(row.otp_expires_at) : undefined,
    kwh: Number(row.kwh),
    amount: Number(row.amount),
    hostShare: Number(row.host_share),
    platformFee: Number(row.platform_fee),
    driverConfirmedStart: row.driver_confirmed_start,
    hostConfirmedConnection: row.host_confirmed_connection,
    notes: row.notes || [],
    createdAt: Number(row.created_at),
    approvedAt: row.approved_at ? Number(row.approved_at) : undefined,
    rejectedAt: row.rejected_at ? Number(row.rejected_at) : undefined,
    onWayAt: row.on_way_at ? Number(row.on_way_at) : undefined,
    otpVerifiedAt: row.otp_verified_at ? Number(row.otp_verified_at) : undefined,
    startedAt: row.started_at ? Number(row.started_at) : undefined,
    completedAt: row.completed_at ? Number(row.completed_at) : undefined,
  };
}

export function rowToTransaction(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    stationId: row.station_id,
    driverId: row.driver_id,
    hostId: row.host_id,
    amount: Number(row.amount),
    hostShare: Number(row.host_share),
    platformFee: Number(row.platform_fee),
    kwh: Number(row.kwh),
    status: row.status,
    createdAt: Number(row.created_at),
  };
}

export function rowToDispute(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    reason: row.reason,
    status: row.status,
    createdAt: Number(row.created_at),
    resolvedAt: row.resolved_at ? Number(row.resolved_at) : undefined,
  };
}
