ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS stop_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivered_stop_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_stop_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION refresh_route_summary(target_route_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE routes r
  SET stop_count = summary.stop_count,
      total_amount = summary.total_amount,
      delivered_stop_count = summary.delivered_stop_count,
      pending_stop_count = summary.pending_stop_count
  FROM (
    SELECT
      COUNT(*)::INTEGER AS stop_count,
      COALESCE(SUM(order_amount), 0)::NUMERIC(12,2) AS total_amount,
      COUNT(*) FILTER (WHERE order_status = 'delivered')::INTEGER AS delivered_stop_count,
      COUNT(*) FILTER (WHERE order_status <> 'delivered')::INTEGER AS pending_stop_count
    FROM route_stops
    WHERE route_id = target_route_id
  ) summary
  WHERE r.id = target_route_id;
END;
$$;

SELECT refresh_route_summary(id) FROM routes;

CREATE OR REPLACE FUNCTION sync_route_summary_from_stop()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_route_summary(OLD.route_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.route_id IS DISTINCT FROM NEW.route_id THEN
    PERFORM refresh_route_summary(OLD.route_id);
  END IF;
  PERFORM refresh_route_summary(NEW.route_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS route_stops_sync_route_summary ON route_stops;
CREATE TRIGGER route_stops_sync_route_summary
AFTER INSERT OR UPDATE OF route_id, order_status, order_amount OR DELETE ON route_stops
FOR EACH ROW EXECUTE FUNCTION sync_route_summary_from_stop();
