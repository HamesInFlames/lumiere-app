-- Recipe categories
CREATE TABLE IF NOT EXISTS recipe_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  kitchen VARCHAR(20) NOT NULL CHECK (kitchen IN ('lumiere', 'tova', 'both')),
  category_id UUID REFERENCES recipe_categories(id) ON DELETE SET NULL,
  ingredients TEXT,
  instructions TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_by UUID REFERENCES users(id),
  last_edited_at TIMESTAMPTZ
);

-- Seed some categories
INSERT INTO recipe_categories (name, created_by)
SELECT name, (SELECT id FROM users WHERE role = 'owner' LIMIT 1)
FROM (VALUES ('Pastries'), ('Cakes'), ('Breads'), ('Drinks'), ('Sauces')) AS t(name)
ON CONFLICT DO NOTHING;
