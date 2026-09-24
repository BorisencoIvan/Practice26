-- 1. Убрать is_demo: колонки больше не нужны
ALTER TABLE suppliers     DROP COLUMN IF EXISTS is_demo;
ALTER TABLE order_items   DROP COLUMN IF EXISTS is_demo;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS is_demo;

-- 2. order_items: реалистичные строки (цена из каталога, количество = сумма / цена)
WITH calc AS (
  SELECT oi.id,
         p.price AS new_price,
         GREATEST(1, ROUND(oi.net_amount / p.price)) AS new_qty,
         oi.vat_rate
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
)
UPDATE order_items oi
SET unit_price   = calc.new_price,
    quantity     = calc.new_qty,
    net_amount   = ROUND(calc.new_qty * calc.new_price, 2),
    vat_amount   = ROUND(calc.new_qty * calc.new_price * calc.vat_rate / 100, 2),
    total_amount = ROUND(calc.new_qty * calc.new_price, 2)
                 + ROUND(calc.new_qty * calc.new_price * calc.vat_rate / 100, 2)
FROM calc
WHERE calc.id = oi.id;

-- 3. invoice_items: то же самое
WITH calc AS (
  SELECT ii.id,
         p.price AS new_price,
         GREATEST(1, ROUND(ii.net_amount / p.price)) AS new_qty,
         ii.vat_rate
  FROM invoice_items ii
  JOIN products p ON p.id = ii.product_id
)
UPDATE invoice_items ii
SET unit_price   = calc.new_price,
    quantity     = calc.new_qty,
    net_amount   = ROUND(calc.new_qty * calc.new_price, 2),
    vat_amount   = ROUND(calc.new_qty * calc.new_price * calc.vat_rate / 100, 2),
    total_amount = ROUND(calc.new_qty * calc.new_price, 2)
                 + ROUND(calc.new_qty * calc.new_price * calc.vat_rate / 100, 2)
FROM calc
WHERE calc.id = ii.id;

-- 4. Итоги заказов — из их позиций
UPDATE orders o
SET total_amount = s.total
FROM (
  SELECT order_id, ROUND(SUM(total_amount), 2) AS total
  FROM order_items
  GROUP BY order_id
) s
WHERE s.order_id = o.id;

-- 5. Итоги счетов — из их позиций; status пересчитывается относительно paid
-- (флаг разрешает изменение derived-полей в этой же транзакции, см. guard_invoice_paid)
SELECT set_config('app.invoice_paid_recalc', 'on', true);

UPDATE invoices i
SET subtotal  = s.net,
    vat_total = s.vat,
    total     = s.total,
    status = CASE
      WHEN i.paid >= s.total THEN 'paid'
      WHEN i.paid > 0 THEN 'partially_paid'
      ELSE 'issued'
    END
FROM (
  SELECT invoice_id,
         ROUND(SUM(net_amount), 2)   AS net,
         ROUND(SUM(vat_amount), 2)   AS vat,
         ROUND(SUM(total_amount), 2) AS total
  FROM invoice_items
  GROUP BY invoice_id
) s
WHERE s.invoice_id = i.id;
