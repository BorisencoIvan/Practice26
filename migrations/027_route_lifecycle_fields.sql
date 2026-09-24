ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

UPDATE routes
SET started_at = COALESCE(started_at, created_at)
WHERE status IN ('in_progress', 'completed');

UPDATE routes
SET completed_at = COALESCE(completed_at, now())
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS routes_status_idx ON routes (status);
CREATE INDEX IF NOT EXISTS route_stops_order_id_idx ON route_stops (order_id);

ALTER TABLE route_stops
  DROP CONSTRAINT IF EXISTS route_stops_route_order_unique;

ALTER TABLE route_stops
  ADD CONSTRAINT route_stops_route_order_unique UNIQUE (route_id, order_id);
