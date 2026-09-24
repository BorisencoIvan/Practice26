INSERT INTO routes (
  id, route_code, name, origin_name, origin_address,
  destination_name, destination_address, driver_name, status,
  planned_start_at, started_at, completed_at
)
SELECT *
FROM (VALUES
  (101, 'R-101', 'Centru – Șantier Nord', 'Depozit Central',
   'str. Industrială 14, Chișinău', 'Șantier Nord',
   'str. Constructorilor 8, Orhei', 'Mihai Rusu', 'planned',
   now() + interval '1 day', NULL, NULL),
  (102, 'R-102', 'Chișinău – Bălți Express', 'Depozit Central',
   'str. Industrială 14, Chișinău', 'Metalcom Bălți',
   'str. Atelierelor 23, Bălți', 'Ion Popescu', 'in_progress',
   now() - interval '4 hours', now() - interval '3 hours', NULL),
  (103, 'R-103', 'Sud – Comrat Consolidat', 'Depozit Sud',
   'bd. Ștefan cel Mare 31, Bălți', 'AgroPlus Comrat',
   'str. Independenței 44, Comrat', 'Sergiu Lupu', 'completed',
   now() - interval '20 days', now() - interval '19 days',
   now() - interval '18 days'),
  (104, 'R-104', 'Livrare Locală Centru', 'Depozit Central',
   'str. Industrială 14, Chișinău', 'Fabrica Sud',
   'str. Industrială 27, Chișinău', NULL, 'planned',
   now() + interval '2 days', NULL, NULL),
  (105, 'R-105', 'Tură Multistop Nord', 'Depozit Nord',
   'str. Muncii 5, Bălți', 'Nord Distribuție',
   'str. Independenței 10, Soroca', 'Andrei Ceban', 'in_progress',
   now() - interval '2 hours', now() - interval '1 hour', NULL),
  (106, 'R-106', 'Rută Arhivată Fără Comenzi', 'Depozit Est',
   'str. Libertății 1, Tiraspol', 'Punct logistic Est',
   'str. Gagarin 5, Tiraspol', 'Victor Munteanu', 'completed',
   now() - interval '90 days', now() - interval '89 days',
   now() - interval '88 days')
) AS data(
  id, route_code, name, origin_name, origin_address,
  destination_name, destination_address, driver_name, status,
  planned_start_at, started_at, completed_at
)
WHERE NOT EXISTS (SELECT 1 FROM routes existing WHERE existing.id = data.id);

INSERT INTO orders (
  id, external_id, client_id, route_id, supplier_id, delivery_address,
  total_amount, status, delivered_at, stop_order
)
SELECT *
FROM (VALUES
  (101, 'ORD-DEMO-101', 6, 101, 16, 'str. Constructorilor 8, Orhei',
   18750.00, 'pending', NULL, 1),
  (102, 'ORD-DEMO-102', 4, 102, 12, 'str. Atelierelor 23, Bălți',
   32400.00, 'pending', NULL, 1),
  (103, 'ORD-DEMO-103', 2, 103, 10, 'str. Independenței 10, Comrat',
   9600.00, 'delivered', now() - interval '18 days', 1),
  (104, 'ORD-DEMO-104', 3, 103, 13, 'str. Trandafirilor 12, Comrat',
   14300.00, 'delivered', now() - interval '18 days', 2),
  (105, 'ORD-DEMO-105', 1, 105, 11, 'str. Independenței 10, Soroca',
   22100.00, 'pending', NULL, 1),
  (106, 'ORD-DEMO-106', 7, 105, 17, 'str. Libertății 5, Soroca',
   8750.00, 'delivered', now() - interval '1 hour', 2),
  (107, 'ORD-DEMO-107', 8, 105, 14, 'str. Ștefan cel Mare 21, Soroca',
   11990.00, 'pending', NULL, 3),
  (108, 'ORD-DEMO-108', 5, 104, 15, 'str. Industrială 27, Chișinău',
   6400.00, 'pending', NULL, 1)
) AS data(
  id, external_id, client_id, route_id, supplier_id, delivery_address,
  total_amount, status, delivered_at, stop_order
)
WHERE NOT EXISTS (SELECT 1 FROM orders existing WHERE existing.id = data.id);

INSERT INTO order_items (
  order_id, product_id, product_name, product_variant, unit, quantity,
  unit_price, vat_rate, net_amount, vat_amount, total_amount
)
SELECT
  data.order_id, p.id, p.name, p.variant, p.unit, data.quantity,
  p.price, 20,
  ROUND(o.total_amount / 1.2, 2),
  o.total_amount - ROUND(o.total_amount / 1.2, 2),
  o.total_amount
FROM (VALUES
  (101, 6, 1::numeric),
  (102, 4, 12::numeric),
  (103, 5, 30::numeric),
  (104, 8, 20::numeric),
  (105, 7, 50::numeric),
  (106, 10, 15::numeric),
  (107, 14, 20::numeric),
  (108, 19, 8::numeric)
) AS data(order_id, product_id, quantity)
JOIN products p ON p.id = data.product_id
JOIN orders o ON o.id = data.order_id
WHERE NOT EXISTS (
  SELECT 1 FROM order_items existing WHERE existing.order_id = data.order_id
);

SELECT setval(
  pg_get_serial_sequence('routes', 'id'),
  GREATEST((SELECT MAX(id) FROM routes), 1),
  true
);
SELECT setval(
  pg_get_serial_sequence('orders', 'id'),
  GREATEST((SELECT MAX(id) FROM orders), 1),
  true
);
