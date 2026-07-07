/**
 * Delivers login OTP by email (SMTP) or SMS (Twilio). Falls back to server log in dev.
 */
export function otpDeliveryConfigured() {
  return !!(process.env.SMTP_HOST || process.env.TWILIO_ACCOUNT_SID);
}

export async function deliverOtp({ email, portal, code }) {
  const portalLabel =
    portal === 'client' ? 'ShareCharge לקוח' : portal === 'provider' ? 'ShareCharge ספק' : 'ShareCharge מערכת';

  if (process.env.SMTP_HOST) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sharecharge.app',
      to: email,
      subject: `${portalLabel} — קוד אימות ${code}`,
      text: `קוד האימות שלך: ${code}\n\nהקוד תקף ל-10 דקות.\nShareCharge`,
      html: `<p>קוד האימות שלך: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>הקוד תקף ל-10 דקות.</p>`,
    });
    return { channel: 'email', delivered: true };
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.OTP_SMS_TO_FIELD === 'phone') {
    return { channel: 'sms', delivered: false, reason: 'SMS requires phone on register' };
  }

  console.log(`[OTP] ${portal} ${email} → ${code}`);
  return { channel: 'console', delivered: false };
}
