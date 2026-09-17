# A6 runtime boundary

A6 is complete at repository level without Cloudflare runtime.

Future activation requires an internal authenticated surface, a read-only data adapter to Growth D1/exports, and authorization for the `growth_dashboard_reader` role. The public Maison site must not depend on this dashboard.

The dashboard runtime must fail closed: if authentication, authorization or the Growth datastore is unavailable, it returns no Growth data. It must never fall back to public exposure or privileged credentials.

Fixture mode must remain visibly marked and must not be confused with observed production data.
