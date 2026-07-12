import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Store, Zap } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { resolveDriverIdForSession } from '../../auth/identity';
import { PLUG_OPTIONS } from '../../utils/vehicleProfile';
import { Card } from '../../components/ui/Card';

const SOS_OPTIONS = [
  { id: 'fuel', label: 'דלק' },
  { id: 'puncture', label: 'פנצ\'ר' },
  { id: 'tow', label: 'גרר' },
  { id: 'garage', label: 'מוסך / מצבר' },
];

export function ClientBecomeProviderPage() {
  const navigate = useNavigate();
  const { state, becomeProvider } = useShareCharge();
  const myId = resolveDriverIdForSession(state);
  const me = state.users.find((u) => u.id === myId);
  const alreadyProvider = !!me?.providerCapable;

  const [providerType, setProviderType] = useState('sos');
  const [serviceCategories, setServiceCategories] = useState(['fuel']);
  const [businessName, setBusinessName] = useState(me?.name || '');
  const [stationName, setStationName] = useState('');
  const [address, setAddress] = useState('');
  const [power, setPower] = useState('11');
  const [plug, setPlug] = useState('station');
  const [pricePerKwh, setPricePerKwh] = useState('1.25');
  const [termsText, setTermsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const toggleCategory = (id) => {
    setServiceCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    setError('');
    setNotice('');
    if (!businessName.trim()) {
      setError('יש להזין שם עסק / שם מלא');
      return;
    }
    if (providerType === 'sos' && !serviceCategories.length) {
      setError('יש לבחור לפחות סוג שירות אחד');
      return;
    }
    if (providerType === 'charging') {
      if (!stationName.trim()) {
        setError('יש להזין שם עמדת טעינה');
        return;
      }
      if (!address.trim()) {
        setError('יש להזין כתובת עמדה');
        return;
      }
    }
    setBusy(true);
    try {
      const data = await becomeProvider({
        providerType,
        serviceCategories,
        businessName: businessName.trim(),
        stationName: stationName.trim(),
        address: address.trim(),
        power: Number(power),
        plug,
        pricePerKwh: Number(pricePerKwh),
        termsText: termsText.trim(),
      });
      if (data?.error === 'already_provider') {
        setError('כבר רשום כספק — התחברו בפורטל הספק');
        return;
      }
      setNotice(data?.message || 'נרשמתם כספק בהצלחה!');
      setTimeout(() => navigate('/client/home', { replace: true }), 2000);
    } catch (err) {
      setError(err?.message || 'ההרשמה כספק נכשלה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/client/home')}
        className="mb-2 inline-flex items-center gap-1 rounded-full border border-sc-border bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)]"
      >
        <ChevronRight size={18} />
        חזרה לבית
      </button>

      <Card>
        <h1 className="text-xl font-black text-[var(--sc-accent)]">הפוך לספק</h1>
        <p className="mt-1 text-sm font-bold text-sc-muted">
          הרשמה עצמית — ללא מנהל. אותו מייל לכניסה כספק.
        </p>
      </Card>

      {alreadyProvider ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <p className="font-black text-emerald-900">כבר רשום כספק</p>
          <p className="mt-2 text-sm font-bold text-emerald-800">
            התחברו בפורטל הספק עם אותו מייל ({me?.email})
          </p>
          <Link to="/provider/entry" className="sc-btn-primary mt-3 inline-block !text-sm">
            מעבר לפורטל ספק
          </Link>
        </Card>
      ) : (
        <>
          <Card>
            <p className="text-sm font-black text-sc-text">סוג ספק</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProviderType('sos')}
                className={`flex flex-col items-center gap-2 rounded-sc-md border p-4 text-sm font-black ${
                  providerType === 'sos'
                    ? 'border-[var(--sc-accent)] bg-[var(--sc-accent)]/10 text-[var(--sc-accent)]'
                    : 'border-sc-border bg-white'
                }`}
              >
                <Store size={24} />
                שירותי חירום (SOS)
              </button>
              <button
                type="button"
                onClick={() => setProviderType('charging')}
                className={`flex flex-col items-center gap-2 rounded-sc-md border p-4 text-sm font-black ${
                  providerType === 'charging'
                    ? 'border-[var(--sc-accent)] bg-[var(--sc-accent)]/10 text-[var(--sc-accent)]'
                    : 'border-sc-border bg-white'
                }`}
              >
                <Zap size={24} />
                עמדת טעינה
              </button>
            </div>
          </Card>

          <Card>
            <label className="block text-xs font-bold text-sc-muted">
              שם עסק / שם מלא
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="sc-field text-sm" />
            </label>

            {providerType === 'sos' ? (
              <>
                <p className="mt-4 text-xs font-black text-sc-text">סוגי שירות (בחרו אחד או יותר)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SOS_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleCategory(opt.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${
                        serviceCategories.includes(opt.id)
                          ? 'bg-[var(--sc-accent)] text-white'
                          : 'border border-sc-border bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <label className="mt-3 block text-xs font-bold text-sc-muted">
                  אזור שירות (אופציונלי)
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className="sc-field text-sm" placeholder="למשל: גוש דן" />
                </label>
              </>
            ) : (
              <>
                <label className="mt-3 block text-xs font-bold text-sc-muted">
                  שם העמדה
                  <input value={stationName} onChange={(e) => setStationName(e.target.value)} className="sc-field text-sm" />
                </label>
                <label className="mt-2 block text-xs font-bold text-sc-muted">
                  כתובת
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className="sc-field text-sm" />
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-xs font-bold text-sc-muted">
                    הספק (kW)
                    <input type="number" value={power} onChange={(e) => setPower(e.target.value)} className="sc-field text-sm" />
                  </label>
                  <label className="text-xs font-bold text-sc-muted">
                    מחיר לקוט״ש (₪)
                    <input type="number" step="0.01" value={pricePerKwh} onChange={(e) => setPricePerKwh(e.target.value)} className="sc-field text-sm" />
                  </label>
                </div>
                <label className="mt-2 block text-xs font-bold text-sc-muted">
                  סוג מחבר
                  <select value={plug} onChange={(e) => setPlug(e.target.value)} className="sc-field text-sm">
                    {PLUG_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <label className="mt-2 block text-xs font-bold text-sc-muted">
                  תנאי שימוש (אופציונלי)
                  <textarea value={termsText} onChange={(e) => setTermsText(e.target.value)} className="sc-field min-h-[72px] text-sm" />
                </label>
              </>
            )}
          </Card>

          <button
            type="button"
            disabled={busy}
            onClick={handleSubmit}
            className="sc-btn-primary w-full !text-sm disabled:opacity-60"
          >
            {busy ? 'שומר…' : 'אישור — הפוך לספק'}
          </button>

          {notice ? <p className="text-sm font-bold text-emerald-700">{notice}</p> : null}
          {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}
        </>
      )}
    </>
  );
}
