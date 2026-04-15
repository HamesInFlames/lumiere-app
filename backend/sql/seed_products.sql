-- Lumiere Patisserie — Product & Inventory Seed Data
-- Run this on Railway PostgreSQL Query tab

-- ============================================================
-- PRODUCTS (used in order forms for item selection)
-- ============================================================

-- Clear existing products (if re-seeding)
-- DELETE FROM products;

-- Cakes
INSERT INTO products (name) VALUES
  ('ChocoHazelnut Cake'),
  ('Cleopatre Cake'),
  ('Blackcurrant Queen Cake'),
  ('Coconut Dream Cake'),
  ('Lemon Pistachio Meringue Cake'),
  ('Raspberry Pistachio Cake'),
  ('Strawberry Cheesecake'),
  ('Cream & Crumb Cake'),
  ('Chocolate Cream & Crumb Cake'),
  ('Tiramisu Cake'),
  ('Quite Daisy Cake');

-- Personal Desserts
INSERT INTO products (name) VALUES
  ('Tiramichoux'),
  ('Sweet Pleasure'),
  ('Lemon Pistachio Meringue'),
  ('Coconut Dream'),
  ('Rings of Paris'),
  ('Dubai Chocolate'),
  ('Cream & Crumb'),
  ('Chocolate Cream & Crumb'),
  ('Daisy'),
  ('Peaches & Cream'),
  ('Blackcurrant Queen'),
  ('Strawberry Cheesecake Tart'),
  ('Raspberry Pistachio Tart'),
  ('Cleopatra'),
  ('Black Forest'),
  ('Personal Heart'),
  ('Creme Berry Tart'),
  ('Matcha Latte');

-- Puff Pastry
INSERT INTO products (name) VALUES
  ('Almond Croissant'),
  ('Double Milk Chocolate Croissant'),
  ('Butter Croissant'),
  ('Salted Caramel Croissant'),
  ('Raspberry Cheesecake Croissant'),
  ('Pistachio Croissant'),
  ('Creme Diplomat Croissant'),
  ('Chocolatine'),
  ('Sweet Cheese Danish'),
  ('Cherry Danish'),
  ('Cinnamon Roll'),
  ('Coconut Passion Fruit Croissant'),
  ('Chocolate Chip Croissant');

-- Shelf Items (Cookies, Tarts, etc.)
INSERT INTO products (name) VALUES
  ('Choco Chip & Hazelnut Cookies'),
  ('Oatmeal Cookies'),
  ('Black Sesame Choco Chip Cookies'),
  ('Halva Cookies'),
  ('Pecan Tart'),
  ('Chocolate Nemesis'),
  ('Pear Breton'),
  ('Meringues'),
  ('Lumiere Marshmallows'),
  ('Garlic Red Pepper Crostini'),
  ('Lemon Chilli Crostini'),
  ('Hazelnut Dacquoise Square'),
  ('Biscotti'),
  ('Crinkle Cookie'),
  ('Hazelnut Cookie'),
  ('Sweetheart');

-- Bread
INSERT INTO products (name) VALUES
  ('Tartine'),
  ('Rye & Walnut'),
  ('Whole Wheat & Seeds'),
  ('Jalapeno & Onions'),
  ('Tomato & Garlic'),
  ('Greek Olive'),
  ('Yesterday''s Sourdough'),
  ('Classic Challah'),
  ('Japanese Milk Bread'),
  ('French Baguette');

-- ============================================================
-- INVENTORY ITEMS (bar module)
-- ============================================================

-- Drinks / Milk
INSERT INTO inventory_items (name, module, unit, quantity, low_threshold) VALUES
  ('Milk', 'bar', 'liters', 0, 5),
  ('Almond Milk', 'bar', 'liters', 0, 3),
  ('Oat Milk', 'bar', 'liters', 0, 3),
  ('Skim Milk', 'bar', 'liters', 0, 3),
  ('Lactose Free Milk', 'bar', 'liters', 0, 3),
  ('Cream', 'bar', 'liters', 0, 3);

-- Coffee
INSERT INTO inventory_items (name, module, unit, quantity, low_threshold) VALUES
  ('Matcha Powder', 'bar', 'units', 0, 2),
  ('Cinnamon Powder', 'bar', 'units', 0, 2),
  ('Decaf Coffee Bags', 'bar', 'units', 0, 3),
  ('Large Coffee Bags', 'bar', 'units', 0, 3),
  ('Small Coffee Bags', 'bar', 'units', 0, 3);

-- Fruits
INSERT INTO inventory_items (name, module, unit, quantity, low_threshold) VALUES
  ('Orange', 'bar', 'units', 0, 5),
  ('Lemon', 'bar', 'units', 0, 5),
  ('Apple', 'bar', 'units', 0, 5),
  ('Ginger', 'bar', 'units', 0, 3),
  ('Mint', 'bar', 'units', 0, 3);

-- Others
INSERT INTO inventory_items (name, module, unit, quantity, low_threshold) VALUES
  ('Sugar Brown', 'bar', 'units', 0, 2),
  ('Sugar White', 'bar', 'units', 0, 2),
  ('Napkins', 'bar', 'units', 0, 5),
  ('Mixer Sticks', 'bar', 'units', 0, 3),
  ('Plastic Gloves', 'bar', 'boxes', 0, 2),
  ('Tape', 'bar', 'units', 0, 2),
  ('Straws', 'bar', 'units', 0, 5),
  ('CO2', 'bar', 'units', 0, 2),
  ('Wooden To Go Utensils', 'bar', 'units', 0, 3),
  ('Cup Holders', 'bar', 'units', 0, 5);

-- Tea
INSERT INTO inventory_items (name, module, unit, quantity, low_threshold) VALUES
  ('Cinnamon Sticks', 'bar', 'units', 0, 2),
  ('All Spice', 'bar', 'units', 0, 2),
  ('Honey', 'bar', 'units', 0, 2),
  ('Chai Tea', 'bar', 'units', 0, 3),
  ('Earl Grey Tea', 'bar', 'units', 0, 3),
  ('Peppermint Tea', 'bar', 'units', 0, 3),
  ('Iced Princess Tea', 'bar', 'units', 0, 3),
  ('Chamomile Tea', 'bar', 'units', 0, 3),
  ('Coconut Green Tea', 'bar', 'units', 0, 3),
  ('Strawberry Kiwi Tea', 'bar', 'units', 0, 3),
  ('Raspberry Lime Tea', 'bar', 'units', 0, 3),
  ('Lemon Oolong Tea', 'bar', 'units', 0, 3),
  ('Ginger Green Tea', 'bar', 'units', 0, 3),
  ('Jasmine Tea', 'bar', 'units', 0, 3),
  ('Green Tea', 'bar', 'units', 0, 3);

-- Containers
INSERT INTO inventory_items (name, module, unit, quantity, low_threshold) VALUES
  ('Big Boxes', 'bar', 'units', 0, 5),
  ('Small Boxes', 'bar', 'units', 0, 5),
  ('Rectangle Boxes', 'bar', 'units', 0, 5),
  ('4 One Biter Containers', 'bar', 'units', 0, 5),
  ('12 One Biter Containers', 'bar', 'units', 0, 5),
  ('Small Plastic Box Lids', 'bar', 'units', 0, 5),
  ('Large Plastic Box Lids', 'bar', 'units', 0, 5),
  ('Baguette Bags', 'bar', 'units', 0, 5),
  ('Paper Bags 10', 'bar', 'units', 0, 5),
  ('Paper Bags 12', 'bar', 'units', 0, 5),
  ('Lumiere Pastry Paper', 'bar', 'units', 0, 5),
  ('Large To Go Cups', 'bar', 'units', 0, 10),
  ('Regular To Go Cups', 'bar', 'units', 0, 10),
  ('Espresso To Go Cups', 'bar', 'units', 0, 10),
  ('Cold To Go Cups', 'bar', 'units', 0, 10),
  ('Blue Lids', 'bar', 'units', 0, 10),
  ('Cold To Go Lids', 'bar', 'units', 0, 10),
  ('Shopping Bags', 'bar', 'units', 0, 5);

-- Syrups
INSERT INTO inventory_items (name, module, unit, quantity, low_threshold) VALUES
  ('Vanilla Syrup', 'bar', 'bottles', 0, 2),
  ('Caramel Syrup', 'bar', 'bottles', 0, 2),
  ('Hazelnut Syrup', 'bar', 'bottles', 0, 2),
  ('Pumpkin Spice Syrup', 'bar', 'bottles', 0, 2),
  ('Tiramisu Syrup', 'bar', 'bottles', 0, 2),
  ('Cinnamon Syrup', 'bar', 'bottles', 0, 2),
  ('Pistachio Syrup', 'bar', 'bottles', 0, 2),
  ('Coconut Syrup', 'bar', 'bottles', 0, 2),
  ('SF Caramel Syrup', 'bar', 'bottles', 0, 2),
  ('SF Hazelnut Syrup', 'bar', 'bottles', 0, 2),
  ('SF Sweetener', 'bar', 'bottles', 0, 2);
