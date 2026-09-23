-- 003_demo_realistic.sql - realistic-looking demo dataset (replaces 002 demo rows)
BEGIN;

DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM delivery_notes;
DELETE FROM orders;
DELETE FROM routes;
DELETE FROM clients;

INSERT INTO clients (id, name, company_name, email, phone, tax_id) VALUES
  (1, 'Fabrica Sud SRL', 'Fabrica Sud', 'office@fabricasud.md', '+37322123456', '1008601234567'),
  (2, 'Nord Distribuție SRL', 'Nord Distribuție', 'sales@norddist.md', '+37323055443', '1009122345678'),
  (3, 'AgroPlus Chișinău SRL', 'AgroPlus Chișinău', 'office@agroplus.md', '+37322556677', '1007603456789'),
  (4, 'Metalcom Bălți SRL', 'Metalcom Bălți', 'office@metalcom.md', '+37323011223', '1003204567890'),
  (5, 'Vector Trading SRL', 'Vector Trading', 'achizitii@vectortrading.md', '+37322998877', '1001235678901'),
  (6, 'Prim Construct SRL', 'Prim Construct', 'projects@primconstruct.md', '+37322443322', '1011226789012'),
  (7, 'EuroLogistic SRL', 'EuroLogistic', 'dispatch@eurologistic.md', '+37322776655', '1014237890123'),
  (8, 'Bunătăți Casei SRL', 'Bunătăți Casei', 'comenzi@bunataticasei.md', '+37322667744', '1018608901234');

INSERT INTO routes (id, name) VALUES
  (1, 'Chișinău – Centru'),
  (2, 'Nord – Bălți'),
  (3, 'Sud – Cahul'),
  (4, 'Est – Tiraspol');

INSERT INTO orders (id, external_id, client_id, route_id, total_amount, status, delivered_at) VALUES
  (1, 'ORD-3101', 1, 1, 18420.00, 'delivered', NOW() - INTERVAL '28 days'),
  (2, 'ORD-3102', 2, 2, 12600.50, 'delivered', NOW() - INTERVAL '25 days'),
  (3, 'ORD-3103', 3, 1, 7400.00, 'pending', NULL),
  (4, 'ORD-3104', 3, 1, 8900.00, 'delivered', NOW() - INTERVAL '20 days'),
  (5, 'ORD-3105', 4, 2, 22100.00, 'delivered', NOW() - INTERVAL '60 days'),
  (6, 'ORD-3106', 5, 3, 4750.00, 'delivered', NOW() - INTERVAL '15 days'),
  (7, 'ORD-3107', 6, 1, 15600.00, 'delivered', NOW() - INTERVAL '75 days'),
  (8, 'ORD-3108', 7, 3, 9800.00, 'delivered', NOW() - INTERVAL '50 days'),
  (9, 'ORD-3109', 8, 1, 6300.00, 'delivered', NOW() - INTERVAL '10 days'),
  (10, 'ORD-3110', 1, 1, 21400.00, 'delivered', NOW() - INTERVAL '5 days'),
  (11, 'ORD-3111', 2, 2, 3200.00, 'delivered', NOW() - INTERVAL '2 days'),
  (12, 'ORD-3112', 4, 2, 10500.00, 'delivered', NOW() - INTERVAL '100 days'),
  (13, 'ORD-3113', 5, 3, 2900.00, 'pending', NULL);

INSERT INTO invoices (id, serie, number, order_id, client_id, issued_at, due_at, total, paid, status) VALUES
  (1, 'INV', 1001, 1, 1, NOW() - INTERVAL '28 days', NOW() - INTERVAL '8 days', 18420.00, 18420.00, 'paid'),
  (2, 'INV', 1002, 2, 2, NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days', 12600.50, 5000.00, 'partially_paid'),
  (3, 'INV', 1003, 4, 3, NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days', 8900.00, 0, 'issued'),
  (4, 'INV', 1004, 5, 4, NOW() - INTERVAL '60 days', NOW() - INTERVAL '38 days', 22100.00, 8000.00, 'partially_paid'),
  (5, 'INV', 1005, 6, 5, NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 4750.00, 0, 'issued'),
  (6, 'INV', 1006, 7, 6, NOW() - INTERVAL '75 days', NOW() - INTERVAL '45 days', 15600.00, 6000.00, 'partially_paid'),
  (7, 'INV', 1007, 8, 7, NOW() - INTERVAL '50 days', NOW() - INTERVAL '20 days', 9800.00, 0, 'issued'),
  (8, 'INV', 1008, 9, 8, NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 6300.00, 0, 'issued'),
  (9, 'INV', 1009, 10, 1, NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 21400.00, 0, 'issued'),
  (10, 'INV', 1010, 11, 2, NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days', 3200.00, 0, 'issued'),
  (11, 'INV', 1011, 12, 4, NOW() - INTERVAL '100 days', NOW() - INTERVAL '70 days', 10500.00, 2000.00, 'partially_paid');

INSERT INTO payments (id, invoice_id, client_id, amount, payment_method, reference, paid_at) VALUES
  (1, 1, 1, 18420.00, 'bank', 'PLT-2301', NOW() - INTERVAL '20 days'),
  (2, 2, 2, 5000.00, 'bank', 'PLT-2318', NOW() - INTERVAL '10 days'),
  (3, 4, 4, 8000.00, 'bank', 'PLT-2325', NOW() - INTERVAL '30 days'),
  (4, 6, 6, 6000.00, 'cash', 'PLT-2341', NOW() - INTERVAL '25 days'),
  (5, 11, 4, 2000.00, 'bank', 'PLT-2350', NOW() - INTERVAL '60 days');

INSERT INTO document_counters (doc_type, serie, current_number)
SELECT 'invoice', 'INV', 1012
WHERE NOT EXISTS (SELECT 1 FROM document_counters WHERE doc_type = 'invoice' AND serie = 'INV');

SELECT setval(pg_get_serial_sequence('clients', 'id'), 100, false);
SELECT setval(pg_get_serial_sequence('routes', 'id'), 100, false);
SELECT setval(pg_get_serial_sequence('orders', 'id'), 100, false);
SELECT setval(pg_get_serial_sequence('invoices', 'id'), 100, false);
SELECT setval(pg_get_serial_sequence('payments', 'id'), 100, false);
SELECT setval(pg_get_serial_sequence('delivery_notes', 'id'), 100, false);

COMMIT;
