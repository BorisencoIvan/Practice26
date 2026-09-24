ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS route_code TEXT,
  ADD COLUMN IF NOT EXISTS origin_name TEXT,
  ADD COLUMN IF NOT EXISTS origin_address TEXT,
  ADD COLUMN IF NOT EXISTS destination_name TEXT,
  ADD COLUMN IF NOT EXISTS destination_address TEXT,
  ADD COLUMN IF NOT EXISTS planned_start_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS estimated_arrival_at TIMESTAMP WITH TIME ZONE;

UPDATE routes r
SET route_code = COALESCE(r.route_code, 'R-' || LPAD(r.id::text, 2, '0')),
    origin_name = COALESCE(first_stop.sender_name, split_part(r.name, ' – ', 1)),
    origin_address = COALESCE(first_stop.sender_address, ''),
    destination_name = COALESCE(last_stop.recipient_name, split_part(r.name, ' – ', 2)),
    destination_address = COALESCE(last_stop.recipient_address, '')
FROM (
  SELECT DISTINCT ON (route_id)
    route_id, sender_name, sender_address
  FROM route_stops
  ORDER BY route_id, stop_order NULLS LAST, order_id
) first_stop
LEFT JOIN (
  SELECT DISTINCT ON (route_id)
    route_id, recipient_name, recipient_address
  FROM route_stops
  ORDER BY route_id, stop_order DESC NULLS LAST, order_id DESC
) last_stop ON last_stop.route_id = first_stop.route_id
WHERE r.id = first_stop.route_id;

UPDATE routes
SET route_code = COALESCE(route_code, 'R-' || LPAD(id::text, 2, '0')),
    origin_name = COALESCE(origin_name, split_part(name, ' – ', 1)),
    destination_name = COALESCE(destination_name, NULLIF(split_part(name, ' – ', 2), ''));

CREATE INDEX IF NOT EXISTS routes_route_code_idx ON routes (route_code);
