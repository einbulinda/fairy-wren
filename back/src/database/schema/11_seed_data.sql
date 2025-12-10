-- =====================================================
-- 10. SEED DATA
-- =====================================================
-- Insert default categories
INSERT INTO categories (name, color)
VALUES ('Wines', '#FF6B9D'),
    ('Beers', '#C44569'),
    ('Soft Drinks', '#FFA07A'),
    ('Whiskies', '#4ECDC4');
('Rum', '#4ECDC4');
('Spirits', '#4ECDC4');
('Gin', '#4ECDC4');
('Liqueuers', '#4ECDC4');
('Vodkas', '#be1e49ff');
('Cognags', '#be1e49ff');
-- Insert default products
INSERT INTO products (name, price, category_id, stock, image)
VALUES ('Whisky', 400, 1, 50, '🥃'),
    ('Vodka', 350, 1, 60, '🍸'),
    ('Beer', 300, 1, 100, '🍺'),
    ('Cider', 320, 1, 45, '🍎'),
    ('Gin', 380, 1, 40, '🍹'),
    ('Rum', 390, 1, 35, '🥃'),
    ('Tequila Shot', 300, 2, 80, '🥃'),
    ('Vodka Shot', 250, 2, 90, '🍸'),
    ('Whisky Shot', 280, 2, 70, '🥃'),
    ('Champagne', 3500, 3, 20, '🍾'),
    ('Wine Bottle', 2500, 3, 25, '🍷'),
    ('Soda', 100, 4, 150, '🥤'),
    ('Juice', 150, 4, 100, '🧃');
-- Insert default users (hash PINs in production!)
INSERT INTO profiles (name, pin, role, active)
VALUES ('Prudence', '4321', 'bartender', true),
    ('Dan A', '9999', 'manager', true),
    ('Don', '0000', 'owner', true);