ALTER TABLE routes
  ADD CONSTRAINT routes_route_code_unique UNIQUE (route_code),
  ADD CONSTRAINT routes_date_order_check
  CHECK (
    (completed_at IS NULL OR started_at IS NOT NULL)
    AND (completed_at IS NULL OR completed_at >= started_at)
    AND (estimated_arrival_at IS NULL OR planned_start_at IS NULL OR estimated_arrival_at >= planned_start_at)
  );

ALTER TABLE route_stops
  ADD CONSTRAINT route_stops_order_amount_check CHECK (order_amount >= 0),
  ADD CONSTRAINT route_stops_stop_order_check CHECK (stop_order IS NULL OR stop_order > 0),
  ADD CONSTRAINT route_stops_status_check CHECK (order_status IN ('pending', 'delivered'));

ALTER TABLE route_stops
  ADD CONSTRAINT route_stops_route_stop_order_unique UNIQUE (route_id, stop_order);

CREATE OR REPLACE FUNCTION touch_route_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS routes_touch_updated_at ON routes;
CREATE TRIGGER routes_touch_updated_at
BEFORE UPDATE ON routes
FOR EACH ROW EXECUTE FUNCTION touch_route_updated_at();
