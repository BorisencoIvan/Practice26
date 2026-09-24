DROP TRIGGER IF EXISTS orders_sync_route_stops ON orders;
DROP TRIGGER IF EXISTS order_items_sync_route_stops ON order_items;
DROP TRIGGER IF EXISTS clients_sync_route_stops ON clients;
DROP TRIGGER IF EXISTS suppliers_sync_route_stops ON suppliers;

DROP FUNCTION IF EXISTS sync_route_stops_from_orders();
DROP FUNCTION IF EXISTS sync_route_stops_from_order_items();
DROP FUNCTION IF EXISTS sync_route_stops_from_clients();
DROP FUNCTION IF EXISTS sync_route_stops_from_suppliers();
DROP FUNCTION IF EXISTS refresh_route_stops(INTEGER);

CREATE TABLE IF NOT EXISTS route_stops (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  stop_order INTEGER,
  order_number TEXT NOT NULL,
  order_status TEXT NOT NULL,
  order_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_created_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  recipient_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  recipient_name TEXT,
  recipient_address TEXT,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  sender_name TEXT,
  sender_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS route_stops_route_order_idx
  ON route_stops (route_id, stop_order NULLS LAST, order_id);

INSERT INTO route_stops (
  route_id, order_id, stop_order, order_number, order_status, order_amount,
  order_created_at, delivered_at, recipient_id, recipient_name, recipient_address,
  supplier_id, sender_name, sender_address
)
SELECT
  o.route_id,
  o.id,
  o.stop_order,
  COALESCE(o.external_id, 'ORD-' || o.id::text),
  o.status,
  o.total_amount,
  o.created_at,
  o.delivered_at,
  c.id,
  COALESCE(NULLIF(c.company_name, ''), c.name),
  o.delivery_address,
  s.id,
  s.legal_name,
  s.address
FROM orders o
LEFT JOIN clients c ON c.id = o.client_id
LEFT JOIN suppliers s ON s.id = o.supplier_id
WHERE o.route_id IS NOT NULL
ON CONFLICT (order_id) DO UPDATE SET
  route_id = EXCLUDED.route_id,
  stop_order = EXCLUDED.stop_order,
  order_number = EXCLUDED.order_number,
  order_status = EXCLUDED.order_status,
  order_amount = EXCLUDED.order_amount,
  order_created_at = EXCLUDED.order_created_at,
  delivered_at = EXCLUDED.delivered_at,
  recipient_id = EXCLUDED.recipient_id,
  recipient_name = EXCLUDED.recipient_name,
  recipient_address = EXCLUDED.recipient_address,
  supplier_id = EXCLUDED.supplier_id,
  sender_name = EXCLUDED.sender_name,
  sender_address = EXCLUDED.sender_address,
  updated_at = now();

CREATE OR REPLACE FUNCTION sync_route_stop_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM route_stops WHERE order_id = OLD.id;
    RETURN OLD;
  END IF;

  DELETE FROM route_stops WHERE order_id = NEW.id;
  IF NEW.route_id IS NOT NULL THEN
    INSERT INTO route_stops (
      route_id, order_id, stop_order, order_number, order_status, order_amount,
      order_created_at, delivered_at, recipient_id, recipient_name,
      recipient_address, supplier_id, sender_name, sender_address
    )
    SELECT
      NEW.route_id, NEW.id, NEW.stop_order,
      COALESCE(NEW.external_id, 'ORD-' || NEW.id::text),
      NEW.status, NEW.total_amount, NEW.created_at, NEW.delivered_at,
      c.id, COALESCE(NULLIF(c.company_name, ''), c.name), NEW.delivery_address,
      s.id, s.legal_name, s.address
    FROM clients c
    LEFT JOIN suppliers s ON s.id = NEW.supplier_id
    WHERE c.id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_route_stop_from_client()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE route_stops rs
  SET recipient_id = NEW.id,
      recipient_name = COALESCE(NULLIF(NEW.company_name, ''), NEW.name),
      updated_at = now()
  WHERE rs.recipient_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_route_stop_from_supplier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE route_stops rs
  SET supplier_id = NEW.id,
      sender_name = NEW.legal_name,
      sender_address = NEW.address,
      updated_at = now()
  WHERE rs.supplier_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_sync_route_stop ON orders;
CREATE TRIGGER orders_sync_route_stop
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION sync_route_stop_from_order();

DROP TRIGGER IF EXISTS clients_sync_route_stop ON clients;
CREATE TRIGGER clients_sync_route_stop
AFTER UPDATE OF name, company_name, address ON clients
FOR EACH ROW EXECUTE FUNCTION sync_route_stop_from_client();

DROP TRIGGER IF EXISTS suppliers_sync_route_stop ON suppliers;
CREATE TRIGGER suppliers_sync_route_stop
AFTER UPDATE OF legal_name, address ON suppliers
FOR EACH ROW EXECUTE FUNCTION sync_route_stop_from_supplier();

ALTER TABLE routes DROP COLUMN IF EXISTS stops;
