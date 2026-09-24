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

Use both templates when possible:

- `commercial-stocktake.template.json` — 5 active public physical products;
- `commercial-service-capacity.template.json` — 7 active public service/B2B entries.

Never fill private quantities/costs inside the git repository. The Brain directory also ignores `*.private.json`, but the overlay builder goes further and refuses to write its final private overlay anywhere inside the repository.

## 2. Fill observed facts only

Physical products support:

- `inventory_quantity`;
- `reserved_quantity`;
- `unit_material_cost_minor`;
- `packaging_cost_minor`;
- production/batch/MOQ/shelf-life/supplier-lead facts when actually known.

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
  --stocktake /private/path/stocktake.json \
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
- operational readiness = observed stock/capacity facts only.

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

The system never chooses a bundle price or discount. After a human supplies a candidate price, the evaluator can calculate stock feasibility, combined observed cost, difference from catalogue subtotal and contribution.

```bash
python .github/maison-growth/brain/commercial_operator_report.py \
  --overlay /private/path/maison-commercial-overlay.private.json \
  --bundle-id bundle_pausa_casa \
  --proposed-price-minor <HUMAN_CHOSEN_PRICE_MINOR>
```

A calculation does not authorize publication, checkout, discounting or experiment execution.

## 7. Build manual-pilot dossiers from approved validation plans

After the private Brain has human-approved validation plans, the operator can inspect what each manual pilot still needs before any external action.

Safe summary mode (no internal identifiers):

```bash
python .github/maison-growth/brain/manual_pilot_dossier_cli.py \
  --overlay /private/path/maison-commercial-overlay.private.json
```

For a private/local operator terminal only, `--full` prints the detailed dossier, including candidate assets, required inputs, success/stop signals and internal plan identifiers.

A dossier can become `ready_for_human_action_review` only when one actual candidate carries the complete operational fact set required for that pilot. Facts split across several different candidates do not fake readiness.

## 8. Only then feed facts into validation planning

Once stock/cost/capacity facts are known, they can support A14/A12 manual validation planning. Human review remains the authority boundary. A8 remains draft-only unless a separately governed CTA decision exists.
