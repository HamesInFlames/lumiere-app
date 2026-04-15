-- Lumiere Patisserie — Staff Accounts
-- Default password for all: lumiere2026
-- Run on Railway PostgreSQL Query tab
-- IMPORTANT: Change passwords after first login!

-- Galit and Igor do wholesale work and need Lumiere Official access.
-- bar_staff gives them: orders, calendar, Lumiere Official + Bar Team channels.

INSERT INTO users (name, email, password, role) VALUES
  ('James',    'james@lumiere',    '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'bar_staff'),
  ('Caterina', 'caterina@lumiere', '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'kitchen_staff'),
  ('Aniko',    'aniko@lumiere',    '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'bar_staff'),
  ('Daisy',    'daisy@lumiere',    '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'kitchen_staff'),
  ('Galit',    'galit@lumiere',    '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'bar_staff'),
  ('Jade',     'jade@lumiere',     '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'kitchen_staff'),
  ('Mika',     'mika@lumiere',     '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'bar_staff'),
  ('Abby',     'abby@lumiere',     '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'kitchen_staff'),
  ('Igor',     'igor@lumiere',     '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'bar_staff'),
  ('Senen',    'senen@lumiere',    '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'kitchen_staff'),
  ('Sigal',    'sigal@lumiere',    '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'kitchen_staff'),
  ('Shimon',   'shimon@lumiere',   '$2a$10$8oYnqgMYFK9sxQXyjMLuT.ThdlBqhxTRhtzQiLtE8QKdS6TN7CyK.', 'kitchen_staff')
ON CONFLICT (email) DO NOTHING;
