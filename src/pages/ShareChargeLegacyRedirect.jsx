import { Navigate, useParams } from 'react-router-dom';

const LEGACY_ROLE_REDIRECT = {
  driver: '/client/discover',
  host: '/provider/dashboard',
  admin: '/ops/dashboard',
};

export default function ShareChargeLegacyRedirect() {
  const { role } = useParams();
  const target = LEGACY_ROLE_REDIRECT[role];
  if (target) return <Navigate to={target} replace />;
  return <Navigate to="/sharecharge" replace />;
}
