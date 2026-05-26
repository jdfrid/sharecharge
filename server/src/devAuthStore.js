/** In-memory auth fallback when PostgreSQL is unavailable (ALLOW_DEV_OTP only). */
const otps = new Map();
const users = new Map();

function otpKey(email, portal) {
  return `${email.toLowerCase().trim()}|${portal}`;
}

export function saveMemOtp(email, portal, code, expiresAt) {
  otps.set(otpKey(email, portal), { code, expires_at: expiresAt });
}

export function loadMemOtp(email, portal) {
  return otps.get(otpKey(email, portal));
}

export function clearMemOtp(email, portal) {
  otps.delete(otpKey(email, portal));
}

export function saveMemUser(user) {
  users.set(user.email.toLowerCase(), user);
}

export function loadMemUserByEmail(email) {
  return users.get(email.toLowerCase());
}

export function loadMemUserById(id) {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return null;
}

export function listMemUsers() {
  return [...users.values()];
}

export function seedMemUsers(seedUsers) {
  for (const user of seedUsers) {
    saveMemUser(user);
  }
}
