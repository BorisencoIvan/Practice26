BEGIN;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO suppliers (legal_name, tax_id, address, bank_name, iban, is_demo)
SELECT
  'DEMO - продавец для тестирования',
  'DEMO-NOT-VALID',
  'ТЕСТОВЫЕ ДАННЫЕ - НЕ ДЛЯ ДОКУМЕНТОВ',
  'ДЕМО - НЕ ДЛЯ ПЛАТЕЖЕЙ',
  'DEMO-NOT-A-REAL-IBAN',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE is_demo = TRUE);

UPDATE orders o
SET supplier_id = s.id
FROM suppliers s
WHERE s.is_demo = TRUE
  AND o.supplier_id IS NULL
  AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.is_demo = TRUE);

UPDATE invoices i
SET supplier_id = s.id,
    supplier_snapshot = jsonb_build_object(
      'id', s.id,
      'legalName', s.legal_name,
      'taxId', s.tax_id,
      'address', s.address,
      'bankName', s.bank_name,
      'iban', s.iban,
      'isDemo', TRUE
    )
FROM suppliers s
JOIN orders o ON o.supplier_id = s.id
WHERE s.is_demo = TRUE
  AND i.order_id = o.id
  AND (i.supplier_id IS NULL OR i.supplier_snapshot = '{}'::jsonb);

COMMIT;