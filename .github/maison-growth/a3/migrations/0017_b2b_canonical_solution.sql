-- Maison Growth Engine · A3 canonical B2B solution mapping
-- Data-only migration 0017. Reuses the canonical A3 solutions table; no B2B store is created.
-- Safe on databases where a canonical solution_key='b2b' already exists.

INSERT INTO solutions(
    solution_id,solution_key,solution_type,delivery_mode,capacity_class,status,
    created_at,created_by,metadata_json
)
SELECT
    'sol_01a0d90c-db59-7a45-b81f-2757a5f23f1e',
    'b2b',
    'b2b',
    'human',
    'negotiated',
    'active',
    '2026-09-25T14:50:00.000Z',
    'maison-b2b-central-integration',
    '{"catalog_asset_ref":"catalog:service:b2b","contract":"MAISON_B2B_BRAIN.leadContract"}'
WHERE NOT EXISTS (
    SELECT 1 FROM solutions WHERE solution_key='b2b'
);

INSERT INTO schema_state(schema_key,schema_value)
VALUES('maison_growth_b2b_solution_seed_version','0017')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='0017';
