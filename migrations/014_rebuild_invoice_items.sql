BEGIN;

LOCK TABLE invoice_items IN ACCESS EXCLUSIVE MODE;

CREATE SEQUENCE invoice_items_rebuilt_id_seq;

CREATE TABLE invoice_items_rebuilt (
  id INTEGER PRIMARY KEY DEFAULT nextval('invoice_items_rebuilt_id_seq'),
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_variant TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  net_amount NUMERIC(12,2) NOT NULL CHECK (net_amount >= 0),
  vat_amount NUMERIC(12,2) NOT NULL CHECK (vat_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (invoice_id, line_number),
  CHECK (total_amount = net_amount + vat_amount)
);

INSERT INTO invoice_items_rebuilt (
  id, invoice_id, line_number, product_id, product_name, product_variant,
  unit, quantity, unit_price, vat_rate, net_amount, vat_amount, total_amount, is_demo
)
SELECT
  id,
  invoice_id,
  ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY id)::integer,
  product_id,
  product_name,
  product_variant,
  unit,
  quantity,
  unit_price,
  vat_rate,
  net_amount,
  vat_amount,
  total_amount,
  is_demo
FROM invoice_items;

DROP TABLE invoice_items;
ALTER TABLE invoice_items_rebuilt RENAME TO invoice_items;

ALTER SEQUENCE invoice_items_rebuilt_id_seq RENAME TO invoice_items_id_seq;
ALTER SEQUENCE invoice_items_id_seq OWNED BY invoice_items.id;
SELECT setval('invoice_items_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM invoice_items), 1), 1));

CREATE INDEX invoice_items_invoice_id_idx ON invoice_items(invoice_id);

COMMIT;