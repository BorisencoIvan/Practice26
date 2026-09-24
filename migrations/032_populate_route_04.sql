INSERT INTO orders (
  id, external_id, client_id, route_id, supplier_id, delivery_address,
  total_amount, status, delivered_at, stop_order
)
SELECT
  109,
  'ORD-DEMO-109',
  2,
  4,
  17,
  'str. Gagarin 5, Tiraspol',
  12900.00,
  'delivered',
  now() - interval '1 day',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM orders WHERE id = 109
);

INSERT INTO order_items (
  order_id, product_id, product_name, product_variant, unit, quantity,
  unit_price, vat_rate, net_amount, vat_amount, total_amount
)
SELECT
  109,
  p.id,
  p.name,
  p.variant,
  p.unit,
  30,
  430,
  20,
  10750.00,
  2150.00,
  12900.00
FROM products p
WHERE p.id = 3
  AND NOT EXISTS (
    SELECT 1 FROM order_items WHERE order_id = 109
  );

UPDATE routes
SET completed_at = COALESCE(completed_at, now()),
    updated_at = now()
WHERE id = 4;

SELECT setval(
  pg_get_serial_sequence('orders', 'id'),
  GREATEST((SELECT MAX(id) FROM orders), 1),
  true
);
