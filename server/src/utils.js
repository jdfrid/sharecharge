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
    phone: row.phone || null,
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
    serviceCategory: row.service_category || 'charging',
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
    checkInAt: row.check_in_at ? Number(row.check_in_at) : undefined,
    lastDriverLat: row.last_driver_lat != null ? Number(row.last_driver_lat) : undefined,
    lastDriverLng: row.last_driver_lng != null ? Number(row.last_driver_lng) : undefined,
    lastLocationAt: row.last_location_at ? Number(row.last_location_at) : undefined,
    dwellExceeded: row.dwell_exceeded === true,
  };
}

export function rowToPayment(row) {
  return {
    id: row.id,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    payerId: row.payer_id,
    hostId: row.host_id,
    title: row.title,
    amount: Number(row.amount),
    platformFee: Number(row.platform_fee),
    hostShare: Number(row.host_share),
    currency: row.currency || 'ILS',
    status: row.status,
    gateway: row.gateway,
    gatewayTxnId: row.gateway_txn_id || null,
    createdAt: Number(row.created_at),
    paidAt: row.paid_at ? Number(row.paid_at) : undefined,
    splits: row.splits || [],
  };
}

export function rowToPaymentSplit(row) {
  return {
    id: row.id,
    paymentId: row.payment_id,
    splitType: row.split_type,
    recipientId: row.recipient_id,
    cardLast4: row.card_last4,
    cardBrand: row.card_brand,
    amount: Number(row.amount),
    status: row.status,
    gatewayTxnId: row.gateway_txn_id || null,
    createdAt: Number(row.created_at),
  };
}

export function rowToPaymentMethod(row) {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    token: row.token,
    cardLast4: row.card_last4,
    cardBrand: row.card_brand,
    isDefault: row.is_default,
    createdAt: Number(row.created_at),
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

export function rowToServiceRequest(row) {
  return {
    id: row.id,
    driverId: row.driver_id,
    category: row.category,
    lat: Number(row.lat),
    lng: Number(row.lng),
    addressText: row.address_text || '',
    problemDescription: row.problem_description || '',
    phone: row.phone || '',
    notifyRadiusKm: row.notify_radius_km != null ? Number(row.notify_radius_km) : 50,
    vehicleProfile: row.vehicle_profile || {},
    status: row.status,
    acceptedBidId: row.accepted_bid_id || null,
    hostId: row.host_id || null,
    amount: Number(row.amount || 0),
    providerLat: row.provider_lat != null ? Number(row.provider_lat) : undefined,
    providerLng: row.provider_lng != null ? Number(row.provider_lng) : undefined,
    expiresAt: row.expires_at ? Number(row.expires_at) : undefined,
    createdAt: Number(row.created_at),
    completedAt: row.completed_at ? Number(row.completed_at) : undefined,
  };
}

export function rowToServiceBid(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    hostId: row.host_id,
    lineItems: row.line_items || [],
    total: Number(row.total),
    etaMinutes: Number(row.eta_minutes),
    status: row.status,
    driverCounterTotal: row.driver_counter_total != null ? Number(row.driver_counter_total) : null,
    driverCounterEtaMinutes: row.driver_counter_eta_minutes != null ? Number(row.driver_counter_eta_minutes) : null,
    driverCounterMessage: row.driver_counter_message || '',
    driverCounterAt: row.driver_counter_at ? Number(row.driver_counter_at) : null,
    createdAt: Number(row.created_at),
  };
}
