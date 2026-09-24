# Maison Commercial Operations Runbook

## Derived-context maintenance

When Ocean metadata or the canonical product/service catalogues change, refresh all derived commercial projections in dependency order with:

```bash
bash .github/maison-growth/brain/rebuild_commercial_context.sh --write
bash .github/maison-growth/brain/rebuild_commercial_context.sh --check
```

This rebuild is repository-local only; it has no Cloudflare, D1, deploy, checkout or publication command.

Private operator workflow for turning the current catalogue/Ocean attention model into fact-based commercial readiness.

> This path does not publish, discount, promise stock, open checkout, send outreach or execute experiments.

## 1. Copy the operator templates outside the repository

Use the current operator templates when possible:

- `commercial-operations-facts.template.json` — preferred physical-products template; unit cost + replenishment capacity are structural facts and finished stock is optional/volatile;
- `commercial-service-capacity.template.json` — active public service/B2B entries;
- `commercial-stocktake.template.json` — legacy compatibility input only.

Never fill private quantities/costs inside the git repository. The Brain directory also ignores `*.private.json`, but the overlay builder goes further and refuses to write its final private overlay anywhere inside the repository.

## 2. Fill observed facts only

Physical products support:

- structural cost facts: `unit_material_cost_minor` and `packaging_cost_minor`;
- structural replenishment facts: `production_minutes_per_unit` and `batch_capacity_units`;
- optional timestamped stock snapshot: `inventory_quantity` and `reserved_quantity`;
- optional MOQ/shelf-life/supplier-lead facts when actually known.

Finished-stock quantity is never a structural readiness gate: Maison may be able to replenish rapidly, so fulfilment readiness is based on real replenishment capacity plus economics.

Services support:

- `capacity_units_per_period`;
- `capacity_period`;
- `human_effort_minutes`;
- `variable_cost_minor`;
- `delivery_lead_days`.

Unknown values stay `null`. Do not infer counted stock from the public `in_stock` catalogue flag.

Every filled row needs an evidence reference such as a dated manual stocktake or cost/capacity review.

## 3. Build one validated private overlay

Example:

```bash
python .github/maison-growth/brain/prepare_commercial_overlay.py \
  --operations /private/path/operations-facts.json \
  --services /private/path/services.json \
  --observed-at "<ISO-8601 timestamp>" \
  --evidence-ref "manual:operations:<date>" \
  --output /private/path/maison-commercial-overlay.private.json
```

The builder validates asset refs, operational fields and evidence requirements against the canonical commercial catalogue. It prints only a summary, not the private values.

## 4. Recalculate commercial readiness

```bash
python .github/maison-growth/brain/commercial_operator_report.py \
  --overlay /private/path/maison-commercial-overlay.private.json
```

The report keeps **commercial attention** separate from **unit economics**:

- attention = Ocean relevance + current public offer context;
- unit economics = observed price/cost facts only;
- operational readiness = observed replenishment/capacity facts only; finished stock remains a volatile snapshot.

The attention score is never treated as a profit forecast.

## 5. Resolve multi-format / starting-from service prices explicitly

The catalogue projection preserves the difference between:

- fixed prices;
- multi-format prices such as Presença;
- `a partir de` prices;
- quote-only services.

The system never silently flattens these into one price. For a multi-format service, pass the exact catalogue option selected by the human operator:

```bash
python .github/maison-growth/brain/commercial_operator_report.py \
  --overlay /private/path/maison-commercial-overlay.private.json \
  --service-price catalog:service:companhia=3500
```

For `starting_from` services, the human-selected value must be at or above the catalogue minimum. Quote-only services accept a concrete human-approved quote for evaluation. This is calculation only; it does not change the public catalogue.

## 6. Evaluate a human-chosen bundle price

The system never chooses a bundle price. Maison has no discount mechanism. After a human supplies a candidate price, the evaluator can calculate replenishment feasibility, combined observed cost, difference from catalogue subtotal and contribution.

```bash
python .github/maison-growth/brain/commercial_operator_report.py \
  --overlay /private/path/maison-commercial-overlay.private.json \
  --bundle-id bundle_pausa_casa \
  --proposed-price-minor <HUMAN_CHOSEN_PRICE_MINOR>
```

A calculation does not authorize publication, checkout or experiment execution.

## 7. Read the offline Commercial Readiness Board

Before Cloudflare is active, the same catalogue + Ocean + private operational overlay can be reduced to one operator board:

```bash
python .github/maison-growth/brain/commercial_readiness_board.py \
  --overlay /private/path/maison-commercial-overlay.private.json
```

For multi-format or quote/starting-from services, pass only a human-selected concrete price when one exists:

```bash
python .github/maison-growth/brain/commercial_readiness_board.py \
  --overlay /private/path/maison-commercial-overlay.private.json \
  --service-price catalog:service:companhia=3500
```

Each row keeps Ocean context, catalogue pricing, operational/economic blockers and one explicit next human action together. Attention is never presented as profit, catalogue `in_stock` is never treated as counted inventory, and every external authority remains false.

## 8. Generate the shortest fact-collection queue

The readiness board can be reduced to a zero-private-data operator worksheet. It asks only for the **next** missing fact group for each ranked asset, rather than making the operator fill every possible field at once:

```bash
python .github/maison-growth/brain/commercial_fact_collection_plan.py \
  --output /private/path/maison-commercial-fact-plan.private.json
```

If a private overlay already exists, pass it with `--overlay`. Physical assets automatically move through cost → replenishment capacity → human review as evidence-backed facts become known. Current finished-stock counts may be recorded as timestamped snapshots, but they are not a structural readiness gate because Maison can replenish production quickly. Services move through price → capacity → effort/cost. Generated values remain null; the script never guesses stock, cost, capacity or prices and grants no execution authority.

## 9. Build manual-pilot dossiers from approved validation plans

After the private Brain has human-approved validation plans, the operator can inspect what each manual pilot still needs before any external action.

Safe summary mode (no internal identifiers):

```bash
python .github/maison-growth/brain/manual_pilot_dossier_cli.py \
  --overlay /private/path/maison-commercial-overlay.private.json
```

B2B, distribution and generic manual pilots can also need pilot-specific facts that do not belong in the public catalogue or stock/capacity overlay. Store those in a separate private file following `manual-pilot-context.schema.json`, with a validation-plan ID, strict allowed inputs and at least one evidence reference per row:

```bash
python .github/maison-growth/brain/manual_pilot_dossier_cli.py \
  --overlay /private/path/maison-commercial-overlay.private.json \
  --pilot-context /private/path/manual-pilot-context.private.json
```

The private context can supply items such as a B2B target profile, human quote rule, fulfilment lead time, distribution partner/strategy/cost/attribution, or the scope/cost/capacity basis for a generic manual validation. It can also carry an explicit human new-offer decision reference when no existing catalogue asset matches. Summary mode never prints these private values.

For a private/local operator terminal only, `--full` prints the detailed dossier, including candidate assets, required inputs, success/stop signals and internal plan identifiers. Private context values themselves are not copied into the dossier; only their evidence references and the fact that evidence-backed context was applied are retained.

A physical or service dossier can become `ready_for_human_action_review` only when one actual candidate carries the complete operational fact set required for that pilot. For physical candidates, that means evidence-backed unit economics plus practical replenishment capacity; a finished-stock count may be recorded but is not structurally required. Facts split across several different candidates do not fake readiness, and the pilot-context file cannot bypass this rule. For every plan kind, `ready_for_human_action_review` still grants no outbound, spend, public-write or experiment-execution authority.

## 10. Only then feed facts into validation planning

Once stock/cost/capacity facts are known, they can support A14/A12 manual validation planning. Human review remains the authority boundary. A8 remains draft-only unless a separately governed CTA decision exists.


## 11. Compare attention and economics without collapsing them into one score

Use the human-only decision-support matrix when you want one view across attention, readiness and economics without inventing a winner:

```bash
python .github/maison-growth/brain/commercial_decision_support_matrix.py \
  --overlay /private/path/maison-commercial-overlay.private.json
```

By default, private economic values are not printed: the matrix reports only whether each dimension is known or unknown. For a private local operator terminal, `--full-private-values` may be used together with `--overlay` to reveal the evidence-backed numbers. The matrix preserves attention order, creates no combined score, performs no profit ranking and never recommends an automatic commercial winner.
