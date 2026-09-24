UPDATE routes
SET driver_name = 'Ion Popescu',
    origin_name = 'Depozit Central',
    origin_address = 'str. Industrială 14, Chișinău',
    destination_name = 'Fabrica Sud',
    destination_address = 'Depozit Sud, str. Industrială 27, Chișinău',
    planned_start_at = created_at + interval '1 hour'
WHERE id = 1;

UPDATE routes
SET driver_name = 'Andrei Ceban',
    origin_name = 'Depozit Nord',
    origin_address = 'str. Muncii 5, Bălți',
    destination_name = 'Metalcom Bălți',
    destination_address = 'Depozit secundar, str. Atelierelor 23, Bălți',
    planned_start_at = created_at + interval '1 hour'
WHERE id = 2;

UPDATE routes
SET driver_name = 'Sergiu Lupu',
    origin_name = 'Depozit Sud',
    origin_address = 'bd. Ștefan cel Mare 31, Bălți',
    destination_name = 'Vector Trading',
    destination_address = 'Centru distribuție, str. Mărfurilor 16, Chișinău',
    planned_start_at = created_at + interval '1 hour'
WHERE id = 3;

UPDATE routes
SET driver_name = 'Victor Munteanu',
    origin_name = 'Depozit Est',
    origin_address = 'str. Libertății 1, Tiraspol',
    destination_name = 'Punct logistic Est',
    destination_address = 'str. Gagarin 5, Tiraspol',
    planned_start_at = created_at + interval '1 hour'
WHERE id = 4;

UPDATE routes
SET driver_name = COALESCE(driver_name, 'Mihai Rusu')
WHERE id = 104;

UPDATE routes
SET estimated_arrival_at = CASE
  WHEN status = 'completed' THEN COALESCE(completed_at, started_at, created_at) + interval '4 hours'
  WHEN status = 'in_progress' THEN COALESCE(started_at, planned_start_at, created_at) + interval '8 hours'
  WHEN status = 'planned' THEN COALESCE(planned_start_at, created_at) + interval '8 hours'
  ELSE NULL
END
WHERE estimated_arrival_at IS NULL;

UPDATE routes
SET updated_at = COALESCE(completed_at, started_at, planned_start_at, created_at)
WHERE updated_at IS NULL OR updated_at > now();
