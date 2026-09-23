BEGIN;

UPDATE suppliers
SET address = details.address,
    bank_name = details.bank_name,
    iban = details.iban,
    updated_at = now()
FROM (VALUES
  ('1008601234567', 'str. Mihai Eminescu 18, Chișinău, MD-2012', 'Banca Meridian', 'MD00MERI000000000000000001'),
  ('1009122345678', 'str. Independenței 42, Bălți, MD-3100', 'Banca Meridian', 'MD00MERI000000000000000002'),
  ('1007603456789', 'bd. Dacia 7, Chișinău, MD-2043', 'Banca Meridian', 'MD00MERI000000000000000003'),
  ('1003204567890', 'str. Ștefan cel Mare 25, Bălți, MD-3121', 'Banca Meridian', 'MD00MERI000000000000000004'),
  ('1001235678901', 'str. Uzinelor 9, Chișinău, MD-2023', 'Banca Meridian', 'MD00MERI000000000000000005'),
  ('1011226789012', 'str. Constructorilor 16, Chișinău, MD-2069', 'Banca Meridian', 'MD00MERI000000000000000006'),
  ('1014237890123', 'str. Aerogării 3, Chișinău, MD-2026', 'Banca Meridian', 'MD00MERI000000000000000007'),
  ('1018608901234', 'str. Florilor 11, Orhei, MD-3501', 'Banca Meridian', 'MD00MERI000000000000000008')
) AS details(tax_id, address, bank_name, iban)
WHERE suppliers.tax_id = details.tax_id
  AND suppliers.is_demo = TRUE;

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