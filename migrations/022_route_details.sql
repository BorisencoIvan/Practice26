ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';

ALTER TABLE routes
  ADD CONSTRAINT routes_status_check
  CHECK (status IN ('planned', 'in_progress', 'completed'));

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stop_order INTEGER;

UPDATE routes r
SET status = CASE
  WHEN EXISTS (SELECT 1 FROM orders o WHERE o.route_id = r.id AND o.status <> 'delivered') THEN 'in_progress'
  ELSE 'completed'
END;

WITH ranked_orders AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY route_id ORDER BY created_at, id)::INTEGER AS position
  FROM orders
  WHERE route_id IS NOT NULL
)
UPDATE orders o
SET stop_order = ranked_orders.position
FROM ranked_orders
WHERE o.id = ranked_orders.id
  AND o.stop_order IS NULL;
