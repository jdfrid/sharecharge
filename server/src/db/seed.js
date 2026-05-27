import { query } from './pool.js';

const users = [
  { id: 'driver-1', name: 'דני לוי', email: 'driver@sharecharge.app', role: 'driver', spend: 286 },
  { id: 'driver-2', name: 'נועה כהן', email: 'noa@sharecharge.app', role: 'driver', spend: 154 },
  { id: 'host-1', name: 'מיכל רוזן', email: 'host@sharecharge.app', role: 'host', revenue: 1840 },
  { id: 'host-2', name: 'אורי שגב', email: 'host2@sharecharge.app', role: 'host', revenue: 620 },
  { id: 'admin-1', name: 'מנהל מערכת', email: 'admin@sharecharge.app', role: 'admin', revenue: 0, spend: 0 },
];

const stations = [
  {
    id: 'station-1', host_id: 'host-1', service_category: 'charging', name: 'עמדת וילה ירוקה',
    address: 'הפרדס 18, רמת השרון', lat: 32.1378, lng: 34.8403, distance: 0.7, power: 22, plug: 'Type 2',
    price_per_kwh: 1.35, terms_text: 'גישה לעמדה מהחניה · נא לתאם זמן הגעה',
  },
  {
    id: 'station-2', host_id: 'host-1', service_category: 'charging', name: 'חניה פרטית שקטה',
    address: 'קהילת ונציה 4, תל אביב', lat: 32.0853, lng: 34.7818, distance: 1.4, power: 11, plug: 'Type 2',
    price_per_kwh: 1.18, terms_text: 'חניה צרה — נא להקפיד על פתיחת מראות',
  },
  {
    id: 'station-3', host_id: 'host-2', service_category: 'charging', name: 'מטען מהיר בחצר',
    address: 'הגליל 9, הרצליה', lat: 32.1624, lng: 34.8447, distance: 2.1, power: 50, plug: 'CCS',
    price_per_kwh: 1.55, terms_text: 'CCS בלבד · שעות שקט 22:00–07:00',
  },
  {
    id: 'bakery-1', host_id: 'host-1', service_category: 'bakery', name: 'פנזריה רוזן',
    address: 'אחוזה 12, רמת השרון', lat: 32.1395, lng: 34.8395, distance: 0.9, power: 0, plug: 'מגשים',
    price_per_kwh: 45, terms_text: 'הזמנה מראש · איסוף בחנות',
  },
  {
    id: 'bakery-2', host_id: 'host-2', service_category: 'bakery', name: 'מאפיית השכונה',
    address: 'דיזנגoff 88, תל אביב', lat: 32.0785, lng: 34.7745, distance: 1.8, power: 0, plug: 'מארזים',
    price_per_kwh: 38, terms_text: 'מינימום הזמנה ₪80',
  },
  {
    id: 'tow-1', host_id: 'host-2', service_category: 'tow', name: 'גרר מהיר 24/7',
    address: 'המסגר 5, הרצליה', lat: 32.164, lng: 34.846, distance: 2.3, power: 0, plug: 'גרירה',
    price_per_kwh: 180, terms_text: 'הגעה עד 40 דק׳ · תשלום לפי ק״מ',
  },
  {
    id: 'garage-1', host_id: 'host-1', service_category: 'garage', name: 'מוסך אלון',
    address: 'החרושת 3, רמת השרון', lat: 32.1365, lng: 34.8425, distance: 1.1, power: 0, plug: 'תיקון',
    price_per_kwh: 95, terms_text: 'אבחון + תיקון · תיאום מראש',
  },
  {
    id: 'garage-2', host_id: 'host-2', service_category: 'garage', name: 'מוסך מרכז',
    address: 'הנגר 20, תל אביב', lat: 32.082, lng: 34.785, distance: 1.6, power: 0, plug: 'שירות',
    price_per_kwh: 110, terms_text: 'טיפולים, צמיגים, מיזוג',
  },
];

export async function seed() {
  for (const u of users) {
    await query(
      `INSERT INTO users (id, name, email, role, verified, blocked, revenue, spend)
       VALUES ($1, $2, $3, $4, true, false, $5, $6)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role`,
      [u.id, u.name, u.email, u.role, u.revenue || 0, u.spend || 0],
    );
  }

  for (const s of stations) {
    await query(
      `INSERT INTO stations (id, host_id, name, address, lat, lng, distance, power, plug, price_per_kwh, available, rating, photos, terms_text, service_category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,4.9,0,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         service_category = EXCLUDED.service_category,
         terms_text = EXCLUDED.terms_text`,
      [
        s.id, s.host_id, s.name, s.address, s.lat, s.lng, s.distance, s.power, s.plug, s.price_per_kwh,
        s.terms_text, s.service_category,
      ],
    );
  }

  await query(
    `INSERT INTO audit_events (id, text, type, time) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
    ['event-1', 'המערכת מוכנה לקבלת הזמנות', 'system', Date.now() - 1000 * 60 * 12],
  );

  console.log('Seed data applied.');
}

if (process.argv[1]?.includes('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
