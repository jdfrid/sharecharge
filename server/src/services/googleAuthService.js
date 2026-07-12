function allowedClientIds() {
  return (process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isGoogleAuthEnabled() {
  return allowedClientIds().length > 0;
}

export function getGoogleClientId() {
  return allowedClientIds()[0] || '';
}

export async function verifyGoogleIdToken(idToken) {
  const audiences = allowedClientIds();
  if (!audiences.length) {
    throw Object.assign(new Error('Google sign-in not configured'), { status: 503 });
  }
  if (!idToken || typeof idToken !== 'string') {
    throw Object.assign(new Error('Missing Google token'), { status: 400 });
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    throw Object.assign(new Error('Invalid Google token'), { status: 401 });
  }

  const data = await res.json();
  if (!audiences.includes(data.aud)) {
    throw Object.assign(new Error('Google token audience mismatch'), { status: 401 });
  }
  if (data.email_verified !== 'true' && data.email_verified !== true) {
    throw Object.assign(new Error('Google email not verified'), { status: 403 });
  }
  if (!data.email?.includes('@')) {
    throw Object.assign(new Error('Google account missing email'), { status: 400 });
  }

  return {
    email: String(data.email).toLowerCase().trim(),
    name: data.name || String(data.email).split('@')[0],
    sub: data.sub,
    picture: data.picture,
  };
}
