BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variant TEXT NOT NULL DEFAULT '';

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_variant TEXT NOT NULL DEFAULT '';

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS product_variant TEXT NOT NULL DEFAULT '';

UPDATE products AS p
SET name = details.name,
    variant = details.variant
FROM (VALUES
  ('MAT-CEM-001', 'Цемент ПЦ 500', '25 кг'),
  ('MAT-CEM-002', 'Цемент ПЦ 500', '50 кг'),
  ('MAT-SND-001', 'Песок строительный', 'навалом'),
  ('MAT-GRV-001', 'Щебень', 'фракция 5-20 мм'),
  ('MAT-BRK-001', 'Кирпич керамический полнотелый', 'стандартный размер'),
  ('MAT-BLK-001', 'Блок газобетонный', '600x200x300 мм'),
  ('MAT-STE-001', 'Арматура стальная', 'диаметр 12 мм'),
  ('MAT-INS-001', 'Утеплитель минеральный', 'толщина 50 мм'),
  ('MAT-DRY-001', 'Штукатурка гипсовая', '30 кг'),
  ('MAT-PAI-001', 'Краска интерьерная белая', '10 л'),
  ('MAT-NAI-001', 'Гвозди строительные', '80 мм, 1 кг'),
  ('MAT-SCR-001', 'Саморезы по дереву', '4x50 мм, 200 шт.'),
  ('MAT-DOW-001', 'Дюбель-гвоздь', '6x40 мм, 100 шт.'),
  ('MAT-LUM-001', 'Доска обрезная', '25x150x6000 мм'),
  ('MAT-LUM-002', 'Брус сосновый', '100x100x6000 мм'),
  ('MAT-PLY-001', 'Фанера берёзовая ФК', '12 мм'),
  ('MAT-OSB-001', 'Плита OSB-3', '12 мм, 1250x2500 мм'),
  ('MAT-GYP-001', 'Гипсокартон влагостойкий', '12.5 мм'),
  ('MAT-WAT-001', 'Мастика битумная гидроизоляционная', '18 кг'),
  ('MAT-ROO-001', 'Рубероид РКП-350', '15 м²'),
  ('MAT-GLU-001', 'Клей для плитки усиленный', '25 кг'),
  ('MAT-GRO-001', 'Затирка для швов серая', '2 кг'),
  ('MAT-FOA-001', 'Пена монтажная всесезонная', '750 мл'),
  ('TOO-LEV-001', 'Уровень алюминиевый', '600 мм'),
  ('SAF-GLO-001', 'Перчатки защитные с латексным покрытием', '')
) AS details(sku, name, variant)
WHERE p.sku = details.sku;

UPDATE order_items AS oi
SET product_name = p.name,
    product_variant = p.variant
FROM products AS p
WHERE oi.product_id = p.id AND oi.is_demo = TRUE;

UPDATE invoice_items AS ii
SET product_name = p.name,
    product_variant = p.variant
FROM products AS p
WHERE ii.product_id = p.id AND ii.is_demo = TRUE;

COMMIT;