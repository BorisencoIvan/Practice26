BEGIN;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

WITH product_list AS (
  SELECT id, name, unit, ROW_NUMBER() OVER (ORDER BY id) - 1 AS product_index,
         COUNT(*) OVER () AS product_count
  FROM products
  WHERE is_active = TRUE
), order_lines AS (
  SELECT o.id AS order_id,
         p.id AS product_id,
         p.name AS product_name,
         p.unit,
         ROUND(o.total_amount / 1.2, 2) AS net_amount,
         o.total_amount - ROUND(o.total_amount / 1.2, 2) AS vat_amount,
         o.total_amount AS total_amount
  FROM orders o
  JOIN LATERAL (
    SELECT product_list.*
    FROM product_list
    WHERE product_list.product_index = MOD(o.id - 1, product_list.product_count)
  ) p ON TRUE
  WHERE o.total_amount > 0
)
INSERT INTO order_items
  (order_id, product_id, product_name, unit, quantity, unit_price, vat_rate,
   net_amount, vat_amount, total_amount, is_demo)
SELECT order_id, product_id, product_name, unit, 1, net_amount, 20,
       net_amount, vat_amount, total_amount, TRUE
FROM order_lines
WHERE NOT EXISTS (
  SELECT 1 FROM order_items existing WHERE existing.order_id = order_lines.order_id
);

WITH invoice_lines AS (
  SELECT i.id AS invoice_id,
         oi.product_id,
         oi.product_name,
         oi.unit,
         ROUND(i.total / 1.2, 2) AS net_amount,
         i.total - ROUND(i.total / 1.2, 2) AS vat_amount,
         i.total AS total_amount
  FROM invoices i
  JOIN orders o ON o.id = i.order_id
  JOIN order_items oi ON oi.order_id = o.id
  WHERE i.total > 0
)
INSERT INTO invoice_items
  (invoice_id, product_id, product_name, unit, quantity, unit_price, vat_rate,
   net_amount, vat_amount, total_amount, is_demo)
SELECT invoice_id, product_id, product_name, unit, 1, net_amount, 20,
       net_amount, vat_amount, total_amount, TRUE
FROM invoice_lines
WHERE NOT EXISTS (
  SELECT 1 FROM invoice_items existing WHERE existing.invoice_id = invoice_lines.invoice_id
);

UPDATE invoices i
SET subtotal = totals.subtotal,
    vat_total = totals.vat_total
FROM (
  SELECT invoice_id, SUM(net_amount)::numeric(12,2) AS subtotal,
         SUM(vat_amount)::numeric(12,2) AS vat_total
  FROM invoice_items
  GROUP BY invoice_id
) totals
WHERE i.id = totals.invoice_id
  AND i.subtotal = 0
  AND i.vat_total = 0;

COMMIT;