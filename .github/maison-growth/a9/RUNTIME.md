# A9 runtime boundary

Not provisioned in A9:
- production GitHub App/bot credential;
- Cloudflare Worker/Queue/D1 bindings;
- branch protection/ruleset changes;
- automatic PR creation/merge;
- production rollback execution.

Future activation contract:
1. provision a dedicated publisher identity with least privilege;
2. bind it only to the Publisher Gateway runtime;
3. keep every other Growth component without repository write credentials;
4. create `growth/publish/<publish_run_id>` from the approved baseline commit;
5. validate exact diff against the action allowlist and protected zones;
6. run required validations and Oceans Guard when applicable;
7. only then allow a separately approved merge path;
8. on rollback, restore exact prior blob hashes/files through the same Gateway and validations.

If the Publisher Gateway or any Growth runtime is unavailable, the public Maison site must continue normally.
