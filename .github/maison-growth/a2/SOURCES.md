# Future Event Sources

All sources are **deny by default** and must be listed in `source-registry.json`. Adding a source or widening its metadata is a reviewed contract change.

| Source | Future role | Accepted shape | Explicitly excluded |
|---|---|---|---|
| `site` | public navigation/CTA signals | path without query/fragment, CTA/campaign/surface tokens | forms, messages, emails, names |
| `internal_search` | search demand and zero-result signals | query hash/classification, result counts | raw query text |
| `test` | Test usage | test/result/territory identifiers | free-text answers |
| `oracle` | aggregate/pseudonymous Oráculo demand and conversion | territory, class, stage, hashed reading ID | paid reading/answer text, customer identity |
| `commerce` | product/service/B2B conversion signals | product/category, hashed order ref, payment status, channel | email, name, address, NIF, Stripe customer identity |
| `gsc` | aggregated discovery signals | hashed query, public page path, impressions/clicks/buckets | raw query text at A2 |
| `bing` | aggregated discovery signals | same privacy boundary as GSC | raw query text at A2 |
| `system` | internal health/retry telemetry | component/code/attempt | user data |

## Free-text discovery language

The Growth Engine will eventually need semantic language signals. A2 deliberately does **not** accept raw free text yet. That capability belongs behind a future privacy-aware adapter that can remove/directly segregate PII before emitting a reviewed derived event contract.

## Commercial identity boundary

Commerce adapters may read identifiable commerce records in their own protected domain only long enough to produce a permitted pseudonymous event. The collector itself must not receive or request commercial PII.

## Oracle boundary

The collector may receive territory/class/use/conversion analytics. It has no permission or field capable of accepting paid Oracle reading text.
