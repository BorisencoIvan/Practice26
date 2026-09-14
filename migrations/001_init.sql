-- 001_init.sql - core schema for invoicing backend
BEGIN;

CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  external_id TEXT,
  client_id INTEGER NOT NULL,
  route_id INTEGER REFERENCES routes(id),
  delivered_at TIMESTAMP WITH TIME ZONE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_counters (
  id SERIAL PRIMARY KEY,
  doc_type TEXT NOT NULL,
  serie TEXT NOT NULL,
  current_number BIGINT NOT NULL DEFAULT 0,
  UNIQUE (doc_type, serie)
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  serie TEXT NOT NULL,
  number BIGINT NOT NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  client_id INTEGER NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  due_at TIMESTAMP WITH TIME ZONE,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (serie, number)
);

CREATE TABLE IF NOT EXISTS delivery_notes (
  id SERIAL PRIMARY KEY,
  serie TEXT NOT NULL,
  number BIGINT NOT NULL,
  route_id INTEGER REFERENCES routes(id) ON DELETE SET NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (serie, number)
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- migrations table (internal)
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMIT;
