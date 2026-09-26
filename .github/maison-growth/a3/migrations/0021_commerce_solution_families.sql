-- Maison Growth Engine · canonical B2C commerce solution families
-- Stable solution families let confirmed Stripe purchases enter A3 without inventing a solution per SKU.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO solutions
  (solution_id,solution_key,solution_type,delivery_mode,capacity_class,status,created_at,created_by,metadata_json)
VALUES
  ('sol_0199a4b2-7f00-7000-8000-000000000002','maison-oracle','oracle','automatic','scalable','active','2026-09-26T08:30:00Z','architecture:commerce-solution-seed','{"checkout_source":"oracle-live"}'),
  ('sol_0199a4b2-7f00-7000-8000-000000000003','maison-pdi','digital_collection','automatic','scalable','active','2026-09-26T08:30:00Z','architecture:commerce-solution-seed','{"checkout_source":"para-de-ignorar-live"}'),
  ('sol_0199a4b2-7f00-7000-8000-000000000004','maison-physical-products','physical_product','human','inventory_limited','active','2026-09-26T08:30:00Z','architecture:commerce-solution-seed','{"checkout_source":"physical-product-live"}'),
  ('sol_0199a4b2-7f00-7000-8000-000000000005','maison-consultation','service','human','human_limited','active','2026-09-26T08:30:00Z','architecture:commerce-solution-seed','{"checkout_source":"consultation-live"}'),
  ('sol_0199a4b2-7f00-7000-8000-000000000006','maison-ebooks','ebook','automatic','scalable','active','2026-09-26T08:30:00Z','architecture:commerce-solution-seed','{"checkout_source":"ebooks-live"}'),
  ('sol_0199a4b2-7f00-7000-8000-000000000007','maison-commerce-unmapped','future_product','mixed','unknown','active','2026-09-26T08:30:00Z','architecture:commerce-solution-seed','{"checkout_source":"unmapped-paid-checkout"}');

INSERT INTO schema_state(schema_key,schema_value)
VALUES ('maison_growth_commerce_solution_seed_version','0021')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='0021';
