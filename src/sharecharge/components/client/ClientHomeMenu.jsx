import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HOME_MENU_BUILD = '1.0.23';

const icon = (file) => `${import.meta.env.BASE_URL}images/service-icons/${file}`;

const CHARGING_TARGET = '/client/charging/map';
const EMERGENCY_TARGET = '/client/emergency';

export function ClientHomeMenu() {
  const navigate = useNavigate();

  return (
    <section className="sc-hero-menu sc-hero-menu--dual" aria-label="תפריט ראשי">
      <button
        type="button"
        className="sc-hero-menu__action sc-hero-menu__action--charging"
        aria-label="הטענה חשמלית"
        onClick={() => navigate(CHARGING_TARGET)}
      >
        <span className="sc-hero-menu__action-icon sc-hero-menu__action-icon--charging">
          <img src={icon('charging.png')} alt="" draggable={false} />
        </span>
        <span className="sc-hero-menu__action-label">הטענה חשמלית</span>
        <span className="sc-hero-menu__action-hint">מצאו עמדות · הזמינו טעינה</span>
      </button>

      <button
        type="button"
        className="sc-hero-menu__action sc-hero-menu__action--sos"
        aria-label="SOS חירום"
        onClick={() => navigate(EMERGENCY_TARGET)}
      >
        <span className="sc-hero-menu__action-icon sc-hero-menu__action-icon--sos">
          <AlertTriangle size={36} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <span className="sc-hero-menu__action-label">SOS חירום</span>
        <span className="sc-hero-menu__action-hint">פנצ&apos;ר · דלק · גרר · מוסך</span>
      </button>
    </section>
  );
}
