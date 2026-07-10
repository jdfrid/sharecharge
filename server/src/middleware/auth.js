import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function hasProviderAccess(user) {
  return user?.role === 'host' || (user?.role === 'driver' && user?.providerCapable === true);
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (roles.includes(req.user.role)) return next();
    if (roles.includes('host') && hasProviderAccess(req.user)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}
