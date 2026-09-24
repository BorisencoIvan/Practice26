CREATE INDEX IF NOT EXISTS routes_active_sort_idx
  ON routes (
    (CASE WHEN status = 'completed' THEN 1 ELSE 0 END),
    status,
    name,
    id
  );

CREATE INDEX IF NOT EXISTS route_stops_route_position_idx
  ON route_stops (route_id, stop_order NULLS LAST, order_created_at, order_id);
