-- 1. Удалить тестовые платежи, созданные в обход обычного потока
DELETE FROM payments
WHERE id >= 100 AND reference = 'Оплата через Back-Office';

-- 2. Пересчитать paid/status всех счетов из фактической суммы платежей
UPDATE invoices i
SET paid = COALESCE(p.total_paid, 0),
    status = CASE
      WHEN COALESCE(p.total_paid, 0) >= i.total THEN 'paid'
      WHEN COALESCE(p.total_paid, 0) > 0 THEN 'partially_paid'
      ELSE 'issued'
    END
FROM (
  SELECT i2.id AS invoice_id, SUM(py.amount) AS total_paid
  FROM invoices i2
  LEFT JOIN payments py ON py.invoice_id = i2.id
  GROUP BY i2.id
) p
WHERE p.invoice_id = i.id;

-- 3. Выровнять последовательности, чтобы INSERT без id не создавал коллизию PK
SELECT setval(pg_get_serial_sequence('clients', 'id'), (SELECT MAX(id) FROM clients));
SELECT setval(pg_get_serial_sequence('routes', 'id'), (SELECT MAX(id) FROM routes));
SELECT setval(pg_get_serial_sequence('orders', 'id'), (SELECT MAX(id) FROM orders));
SELECT setval(pg_get_serial_sequence('invoices', 'id'), (SELECT MAX(id) FROM invoices));
SELECT setval(pg_get_serial_sequence('payments', 'id'), (SELECT MAX(id) FROM payments));
SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products));
SELECT setval(pg_get_serial_sequence('suppliers', 'id'), (SELECT MAX(id) FROM suppliers));

-- 4. Заполнить пустые адреса клиентов
UPDATE clients SET address = addr FROM (VALUES
  (1, 'str. Columna 118, md-2021, Chișinău, Moldova'),
  (2, 'str. Ștefan cel Mare 42, md-3500, Bălți, Moldova'),
  (3, 'str. Trusei 27, md-2024, Chișinău, Moldova'),
  (4, 'str. Moiloasei 15, md-3500, Bălți, Moldova'),
  (5, 'str. București 86, md-2014, Chișinău, Moldova'),
  (6, 'str. Pădurarilor 3, md-2069, Chișinău, Moldova'),
  (7, 'str. Națională 100, md-7400, Cahul, Moldova'),
  (8, 'str. Doina 22, md-3500, Orhei, Moldova')
) AS v(id, addr)
WHERE clients.id = v.id AND (clients.address IS NULL OR clients.address = '');

-- 5. Защита: paid/status — производные от payments, их пересчитывает триггер
CREATE OR REPLACE FUNCTION recalc_invoice_payments() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  inv_id INTEGER;
  paid_sum NUMERIC;
BEGIN
  inv_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;
  IF inv_id IS NOT NULL THEN
    PERFORM set_config('app.invoice_paid_recalc', 'on', true);
    SELECT COALESCE(SUM(amount), 0) INTO paid_sum FROM payments WHERE invoice_id = inv_id;
    UPDATE invoices i
    SET paid = paid_sum,
        status = CASE
          WHEN paid_sum >= i.total THEN 'paid'
          WHEN paid_sum > 0 THEN 'partially_paid'
          ELSE 'issued'
        END
    WHERE i.id = inv_id;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS payments_recalc_invoice ON payments;
CREATE TRIGGER payments_recalc_invoice
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION recalc_invoice_payments();

CREATE OR REPLACE FUNCTION guard_invoice_paid() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.paid IS DISTINCT FROM OLD.paid OR NEW.status IS DISTINCT FROM OLD.status)
     AND COALESCE(current_setting('app.invoice_paid_recalc', true), '') <> 'on' THEN
    RAISE EXCEPTION 'INVOICE_PAID_IMMUTABLE: paid/status пересчитываются из payments; изменяйте их через платежи, а не напрямую';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_paid_guard ON invoices;
CREATE TRIGGER invoices_paid_guard
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION guard_invoice_paid();
