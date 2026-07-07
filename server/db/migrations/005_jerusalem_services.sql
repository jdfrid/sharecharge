-- Jerusalem-area service stations for charging, fuel, puncture, tow, garage
INSERT INTO users (id, name, email, role, verified, blocked, revenue, spend, created_at)
VALUES
  ('host-1', 'מיכל רוזן', 'host@sharecharge.app', 'host', true, false, 1840, 0, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT),
  ('host-2', 'אורי שגב', 'host2@sharecharge.app', 'host', true, false, 620, 0, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stations (
  id, host_id, name, address, lat, lng, distance, power, plug, price_per_kwh,
  available, rating, photos, terms_text, service_category, created_at
) VALUES
  (
    'charge-jlm-1', 'host-1', 'עמדת בלוי', 'הרב בלוי 8, ירושלים',
    31.7946, 35.2137, 0.5, 22, 'Type 2', 1.35,
    true, 4.9, 4, 'חניה פרטית · תיאום מראש', 'charging',
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  ),
  (
    'fuel-jlm-1', 'host-2', 'דלק חירום ירושלים', 'רחוב בית הדפוס, ירושלים',
    31.7515, 35.2182, 0.3, 0, 'דלק', 35,
    true, 4.8, 2, 'הגעה עם דלק · תשלום לפי ליטר', 'fuel',
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  ),
  (
    'puncture-jlm-1', 'host-1', 'פנצ''ריה מהירה ירושלים', 'יפו 120, ירושלים',
    31.7855, 35.2055, 0.8, 0, 'פנצ''', 55,
    true, 4.9, 3, 'תיקון בשטח · עד 30 דק׳', 'puncture',
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  ),
  (
    'tow-jlm-1', 'host-2', 'גרר ירושלים 24/7', 'שדרות בegin 50, ירושלים',
    31.792, 35.195, 1.2, 0, 'גרירה', 190,
    true, 4.8, 2, 'גרירה עירונית ובין-עירונית', 'tow',
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  ),
  (
    'garage-jlm-1', 'host-1', 'מוסך + מצבר ירושלים', 'הארז 5, ירושלים',
    31.788, 35.21, 0.9, 0, 'מצבר', 100,
    true, 4.7, 3, 'התנעה · החלפת מצבר · תיקונים', 'garage',
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  )
ON CONFLICT (id) DO NOTHING;
