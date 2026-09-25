-- A3 · canonical Maison B2B solution seed
-- Reuses the existing catalogue service slug `b2b`; creates no parallel B2B catalogue.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO solutions
  (solution_id,solution_key,solution_type,delivery_mode,capacity_class,status,created_at,created_by,metadata_json)
VALUES
  ('sol_0199a4b2-7f00-7000-8000-000000000001',
   'maison-b2b',
   'b2b',
   'human',
   'negotiated',
   'active',
   '2026-09-25T14:30:00Z',
   'architecture:b2b-central',
   '{"catalog_ref":"catalog:service:b2b","catalog_slug":"b2b","source_of_truth":"data/services.js"}');
