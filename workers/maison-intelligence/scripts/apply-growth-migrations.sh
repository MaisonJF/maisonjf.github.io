#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-maison-growth}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

files=(
  ".github/maison-growth/a1/migrations/0001_data_foundation.sql"
  ".github/maison-growth/a3/migrations/0002_journeys_economics.sql"
  ".github/maison-growth/a4/migrations/0003_living_map_radar.sql"
  ".github/maison-growth/a5/migrations/0004_brain.sql"
  ".github/maison-growth/a7/migrations/0005_decisor_commercial_discovery.sql"
  ".github/maison-growth/a8/migrations/0006_experiment_manager.sql"
  ".github/maison-growth/a9/migrations/0007_publisher_gateway.sql"
  ".github/maison-growth/a10/migrations/0008_ocean_promotion.sql"
  ".github/maison-growth/a11/migrations/0009_learning_engine.sql"
  ".github/maison-growth/a12/migrations/0010_gradual_autonomy_dashboard_v2.sql"
  ".github/maison-growth/a13/migrations/0011_external_intelligence_runtime.sql"
)

for file in "${files[@]}"; do
  echo "Applying $file"
  npx wrangler d1 execute "$DB_NAME" --remote --file="$ROOT/$file"
done

echo "Growth D1 schema is now at A13.2. The A13 database kill switch remains ON."
