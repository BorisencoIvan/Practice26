BEGIN;

INSERT INTO suppliers (legal_name, tax_id, address, bank_name, iban, is_demo)
SELECT
  COALESCE(NULLIF(c.company_name, ''), c.name),
  c.tax_id,
  'DEMO - адрес продавца не задан',
  'DEMO - банк продавца не задан',
  'DEMO-NOT-A-REAL-IBAN',
  TRUE
FROM clients c
WHERE NOT EXISTS (
  SELECT 1 FROM suppliers s WHERE s.tax_id = c.tax_id
);

WITH demo_suppliers AS (
  SELECT id, tax_id, legal_name, address, bank_name, iban
  FROM suppliers
  WHERE is_demo = TRUE
), client_supplier_map AS (
  SELECT c.id AS client_id,
         s.id AS supplier_id,
         jsonb_build_object(
           'id', s.id,
           'legalName', s.legal_name,
           'taxId', s.tax_id,
           'address', s.address,
           'bankName', s.bank_name,
           'iban', s.iban,
           'isDemo', TRUE
         ) AS supplier_snapshot
  FROM clients c
  JOIN clients next_client
    ON next_client.id = CASE WHEN c.id = (SELECT MAX(id) FROM clients)
                             THEN (SELECT MIN(id) FROM clients)
                             ELSE c.id + 1 END
  JOIN demo_suppliers s ON s.tax_id = next_client.tax_id
)
UPDATE orders o
SET supplier_id = mapping.supplier_id
FROM client_supplier_map mapping
WHERE o.client_id = mapping.client_id
  AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.is_demo = TRUE);

WITH demo_suppliers AS (
  SELECT id, tax_id, legal_name, address, bank_name, iban
  FROM suppliers
  WHERE is_demo = TRUE
), client_supplier_map AS (
  SELECT c.id AS client_id,
         s.id AS supplier_id,
         jsonb_build_object(
           'id', s.id,
           'legalName', s.legal_name,
           'taxId', s.tax_id,
           'address', s.address,
           'bankName', s.bank_name,
           'iban', s.iban,
           'isDemo', TRUE
         ) AS supplier_snapshot
  FROM clients c
  JOIN clients next_client
    ON next_client.id = CASE WHEN c.id = (SELECT MAX(id) FROM clients)
                             THEN (SELECT MIN(id) FROM clients)
                             ELSE c.id + 1 END
  JOIN demo_suppliers s ON s.tax_id = next_client.tax_id
)
UPDATE invoices i
SET supplier_id = mapping.supplier_id,
    supplier_snapshot = mapping.supplier_snapshot
FROM orders o
JOIN client_supplier_map mapping ON mapping.client_id = o.client_id
WHERE i.order_id = o.id
  AND EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id AND ii.is_demo = TRUE);

DELETE FROM suppliers s
WHERE s.tax_id = 'DEMO-NOT-VALID'
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.supplier_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.supplier_id = s.id);

COMMIT;