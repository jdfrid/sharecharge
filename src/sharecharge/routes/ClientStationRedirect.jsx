import { Navigate, useParams } from 'react-router-dom';

export function ClientStationRedirect() {
  const { stationId } = useParams();
  return <Navigate to={`/client/charging/${stationId}`} replace />;
}
