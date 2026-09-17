# A1 D1 provisioning boundary

A1 deliberately does **not** provision Cloudflare resources.

When provisioning is authorised later:

1. Create a dedicated D1 database for the Maison Growth Engine.
2. Bind it only to the Growth Engine runtime, not as a dependency of the public Maison pages.
3. Apply `migrations/0001_data_foundation.sql`.
4. Run the A1 validation suite against a disposable/local SQLite copy before applying remotely.
5. Record the D1 database identifier outside source-controlled public configuration if it is considered sensitive.
6. Do not grant any public unauthenticated endpoint direct database access.

The public Maison site must continue to function if this database is unavailable or absent.
