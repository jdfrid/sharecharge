import { clearPendingIntent, loadPendingIntent } from './pendingIntent';

export async function resumePendingIntent(navigate, ctx, fallback = '/client/home') {
  const intent = loadPendingIntent();
  clearPendingIntent();

  if (!intent?.type) {
    navigate(fallback, { replace: true });
    return;
  }

  try {
    if (intent.type === 'booking') {
      const bookingId = await ctx.createBooking({
        stationId: intent.stationId,
        startTime: intent.startTime,
        durationHours: intent.durationHours,
      });
      navigate(`/client/navigate/${bookingId || 'latest'}`, { replace: true });
      return;
    }

    if (intent.type === 'tender') {
      const request = await ctx.createTender({
        category: intent.category,
        lat: intent.lat,
        lng: intent.lng,
        addressText: intent.addressText,
        vehicleProfile: intent.vehicleProfile,
        problemDescription: intent.problemDescription,
        phone: intent.phone,
        notifyRadiusKm: intent.notifyRadiusKm,
      });
      navigate(`/client/tender/${request.id}/offers`, { replace: true });
      return;
    }

    if (intent.type === 'accept_bid') {
      await ctx.acceptTenderBid(intent.requestId, intent.bidId);
      navigate(`/client/track/${intent.requestId}`, { replace: true });
      return;
    }

    navigate(intent.returnTo || fallback, { replace: true });
  } catch (err) {
    navigate(`/client/auth?return=${encodeURIComponent(intent.returnTo || fallback)}`, { replace: true });
    throw err;
  }
}
