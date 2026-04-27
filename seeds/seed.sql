INSERT INTO users (name, email, password_hash, role)
VALUES
  ('FitFirst Owner', 'admin@fitfirst.gym', '$2a$10$DEwFhzBiRvVUPSCjrgBW1eM3pbzxED0kWvxJbLaxhTrtQiQXpdxHq', 'owner'),
  ('FitFirst Customer', 'customer@fitfirst.gym', '$2a$10$8cAZiAEPJgGrLRVQZvRv3.vDG4HmE6z31q7oPt/eD/gr.COrY0OnC', 'customer')
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
