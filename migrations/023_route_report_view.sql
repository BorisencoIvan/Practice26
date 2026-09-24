CREATE OR REPLACE VIEW route_report AS
SELECT
  r.id AS route_id,
  r.name AS route_name,
  r.driver_name,
  r.status AS route_status,
  o.stop_order,
  o.id AS order_id,
  COALESCE(o.external_id, 'ORD-' || o.id::text) AS order_number,
  o.status AS order_status,
  o.total_amount AS order_amount,
  o.created_at AS order_created_at,
  o.delivered_at,
  c.id AS recipient_id,
  COALESCE(NULLIF(c.company_name, ''), c.name) AS recipient_name,
  o.delivery_address AS recipient_address,
  s.id AS supplier_id,
  s.legal_name AS sender_name,
  s.address AS sender_address,
  COALESCE(goods.items, '[]'::jsonb) AS goods
FROM routes r
LEFT JOIN orders o ON o.route_id = r.id
LEFT JOIN clients c ON c.id = o.client_id
LEFT JOIN suppliers s ON s.id = o.supplier_id
LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object(
    'productId', oi.product_id,
    'name', oi.product_name,
    'variant', oi.product_variant,
    'unit', oi.unit,
    'quantity', oi.quantity,
    'unitPrice', oi.unit_price,
    'vatRate', oi.vat_rate,
    'netAmount', oi.net_amount,
    'vatAmount', oi.vat_amount,
    'amount', oi.total_amount
  ) ORDER BY oi.id) AS items
  FROM order_items oi
  WHERE oi.order_id = o.id
) goods ON TRUE;
