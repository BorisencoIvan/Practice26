BEGIN;

UPDATE suppliers
SET legal_name = details.legal_name,
    tax_id = details.tax_id,
    address = details.address,
    bank_name = details.bank_name,
    iban = details.iban,
    updated_at = now()
FROM (VALUES
  ('1008601234567', 'Construcții Nord SRL', '1024600001001', 'str. Constructorilor 8, Chișinău, MD-2069', 'Banca Meridian', 'MD24MERI00000000000001'),
  ('1009122345678', 'Materiale Sud SRL', '1024600001002', 'bd. Ștefan cel Mare 31, Bălți, MD-3100', 'Banca Meridian', 'MD24MERI00000000000002'),
  ('1007603456789', 'Agro Material Grup SRL', '1024600001003', 'str. Industrială 12, Chișinău, MD-2023', 'Banca Meridian', 'MD24MERI00000000000003'),
  ('1003204567890', 'Beton Expert SRL', '1024600001004', 'str. Muncii 5, Bălți, MD-3121', 'Banca Meridian', 'MD24MERI00000000000004'),
  ('1001235678901', 'Lemn Construct SRL', '1024600001005', 'str. Pădurii 17, Chișinău, MD-2012', 'Banca Meridian', 'MD24MERI00000000000005'),
  ('1011226789012', 'Izolații Moderne SRL', '1024600001006', 'str. Meșterul Manole 22, Chișinău, MD-2043', 'Banca Meridian', 'MD24MERI00000000000006'),
  ('1014237890123', 'Utilaj și Scule SRL', '1024600001007', 'str. Aerogării 6, Chișinău, MD-2026', 'Banca Meridian', 'MD24MERI00000000000007'),
  ('1018608901234', 'Distribuție Centrală SRL', '1024600001008', 'str. Florilor 14, Orhei, MD-3501', 'Banca Meridian', 'MD24MERI00000000000008')
) AS details(previous_tax_id, legal_name, tax_id, address, bank_name, iban)
WHERE suppliers.tax_id = details.previous_tax_id
  AND suppliers.is_demo = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_tax_id_uidx ON suppliers(tax_id);

UPDATE invoices i
SET supplier_snapshot = jsonb_build_object(
  'id', s.id,
  'legalName', s.legal_name,
  'taxId', s.tax_id,
  'address', s.address,
  'bankName', s.bank_name,
  'iban', s.iban
)
FROM suppliers s
WHERE i.supplier_id = s.id
  AND s.is_demo = TRUE;

COMMIT;