BEGIN;

INSERT INTO clients (id, name, company_name, email, phone, tax_id)
VALUES
  (1, 'SRL Alpha', 'SRL Alpha', 'alpha@example.com', '+37360000001', '1000000001'),
  (2, 'SRL Beta', 'SRL Beta', 'beta@example.com', '+37360000002', '1000000002'),
  (3, 'SRL Gamma', 'SRL Gamma', 'gamma@example.com', '+37360000003', '1000000003'),
  (4, 'SRL Delta', 'SRL Delta', 'delta@example.com', '+37360000004', '1000000004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO routes (id, name)
VALUES
  (1, 'Route 1'),
  (2, 'Route 2'),
  (3, 'Route 3')
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, external_id, client_id, route_id, total_amount, status, delivered_at)
VALUES
  (1, 'ORD-1001', 1, 1, 2500.00, 'delivered', NOW() - INTERVAL '10 days'),
  (2, 'ORD-1002', 2, 1, 4200.00, 'delivered', NOW() - INTERVAL '45 days'),
  (3, 'ORD-1003', 3, 2, 1200.00, 'pending', NULL),
  (4, 'ORD-1004', 4, 3, 5000.00, 'delivered', NOW() - INTERVAL '70 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (id, serie, number, order_id, client_id, issued_at, due_at, total, paid, status)
VALUES
  (1, 'INV', 1001, 1, 1, NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 2500.00, 2500.00, 'paid'),
  (2, 'INV', 1002, 2, 2, NOW() - INTERVAL '45 days', NOW() - INTERVAL '5 days', 4200.00, 1500.00, 'partially_paid'),
  (3, 'INV', 1003, 4, 4, NOW() - INTERVAL '70 days', NOW() - INTERVAL '40 days', 5000.00, 1100.00, 'partially_paid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, invoice_id, client_id, amount, payment_method, reference, paid_at)
VALUES
  (1, 2, 2, 1500.00, 'bank', 'REC-001', NOW() - INTERVAL '20 days'),
  (2, 3, 4, 1100.00, 'cash', 'REC-002', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

COMMIT;
