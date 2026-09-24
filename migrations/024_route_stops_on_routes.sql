DROP VIEW IF EXISTS route_report;

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS stops JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION refresh_route_stops(target_route_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE routes r
  SET stops = COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', o.id,
      'orderId', COALESCE(o.external_id, 'ORD-' || o.id::text),
      'clientName', COALESCE(NULLIF(c.company_name, ''), c.name),
      'recipientName', COALESCE(NULLIF(c.company_name, ''), c.name),
      'recipientAddress', o.delivery_address,
      'deliveryAddress', o.delivery_address,
      'supplierName', s.legal_name,
      'supplierAddress', s.address,
      'goods', COALESCE(goods.items, '[]'::jsonb),
      'status', o.status,
      'amount', o.total_amount,
      'createdAt', o.created_at,
      'deliveredAt', o.delivered_at,
      'stopOrder', o.stop_order
    ) ORDER BY o.stop_order NULLS LAST, o.created_at, o.id)
    FROM orders o
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
        'amount', oi.total_amount
      ) ORDER BY oi.id) AS items
      FROM order_items oi
      WHERE oi.order_id = o.id
    ) goods ON TRUE
    WHERE o.route_id = target_route_id
  ), '[]'::jsonb)
  WHERE r.id = target_route_id;
END;
$$;

CREATE OR REPLACE FUNCTION sync_route_stops_from_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_route_stops(OLD.route_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.route_id IS DISTINCT FROM NEW.route_id THEN
    PERFORM refresh_route_stops(OLD.route_id);
  END IF;
  PERFORM refresh_route_stops(NEW.route_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_route_stops_from_order_items()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  old_route_id INTEGER;
  new_route_id INTEGER;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT route_id INTO old_route_id FROM orders WHERE id = OLD.order_id;
    PERFORM refresh_route_stops(old_route_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT route_id INTO new_route_id FROM orders WHERE id = NEW.order_id;
    IF new_route_id IS DISTINCT FROM old_route_id THEN
      PERFORM refresh_route_stops(new_route_id);
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_route_stops_from_clients()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_route RECORD;
BEGIN
  FOR affected_route IN
    SELECT DISTINCT route_id FROM orders
    WHERE client_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
      AND route_id IS NOT NULL
  LOOP
    PERFORM refresh_route_stops(affected_route.route_id);
  END LOOP;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_route_stops_from_suppliers()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_route RECORD;
BEGIN
  FOR affected_route IN
    SELECT DISTINCT route_id FROM orders
    WHERE supplier_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
      AND route_id IS NOT NULL
  LOOP
    PERFORM refresh_route_stops(affected_route.route_id);
  END LOOP;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_sync_route_stops ON orders;
CREATE TRIGGER orders_sync_route_stops
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION sync_route_stops_from_orders();

DROP TRIGGER IF EXISTS order_items_sync_route_stops ON order_items;
CREATE TRIGGER order_items_sync_route_stops
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION sync_route_stops_from_order_items();

DROP TRIGGER IF EXISTS clients_sync_route_stops ON clients;
CREATE TRIGGER clients_sync_route_stops
AFTER UPDATE OF name, company_name, address OR DELETE ON clients
FOR EACH ROW EXECUTE FUNCTION sync_route_stops_from_clients();

DROP TRIGGER IF EXISTS suppliers_sync_route_stops ON suppliers;
CREATE TRIGGER suppliers_sync_route_stops
AFTER UPDATE OF legal_name, address OR DELETE ON suppliers
FOR EACH ROW EXECUTE FUNCTION sync_route_stops_from_suppliers();

SELECT refresh_route_stops(id) FROM routes;
