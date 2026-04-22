INSERT INTO users (name, email, password_hash, role)
VALUES
  ('FitFirst Owner', 'owner@fitfirst.local', '$2b$10$Ic2PboOAm7NQB0P.yrRmRufkOThV6V1f2WW5Kk1xmagvpUrnWxt1K', 'owner'),
  ('Sample Customer', 'customer@fitfirst.local', '$2b$10$Ak4aahK5liWmrvyuyzOWe.aGdKfG8FgdvYmSf/Nfk1NNLHbn0xaji', 'customer')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = NOW();

INSERT INTO plans (name, description, duration_days, price_cents)
VALUES
  ('Starter Monthly', 'Basic access for students who want a low-friction monthly plan.', 30, 2500),
  ('Quarter Power', 'A three-month plan for members building consistency.', 90, 6500),
  ('Full Semester', 'Longer membership with the best value for repeat visits.', 180, 12000)
ON CONFLICT DO NOTHING;
