# Maison private commercial runtime — activation runbook

This runbook is the bridge between **code-ready** and **privately usable**. It does not grant public execution authority.

## Target

Bring the private runtime online in the narrowest useful order:

`D1 canonical data → private Brain read → A14 preview → proposal materialization → A12 Commercial Action Inbox`

Throughout this runbook:

- public write = OFF;
- outbound = OFF;
- spend = OFF;
- experiment execution = OFF;
- A8, when used later, stops at `draft`.

## 0. Local/private dependencies

Copy the example environment and replace placeholders locally. Do not commit it.

```bash
cp .github/maison-growth/runtime/.env.observe.example .env.observe
```

Start the private persistence dependencies:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  up -d postgres redis osiris-init osiris-mcp maison-osiris-bridge
```

Run repository/runtime validation:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile brain-validation run --rm brain-validate
```

## 1. Private Brain read

Before changing any remote switch:

```bash
python .github/maison-growth/runtime/preflight_private_runtime.py \
  private_brain_read_candidate \
  --env-file .env.observe
```

The target remote Worker state is:

- `BRAIN_CONTROL_API_ENABLED=true`;
- `WORKER_ENABLED=false`;
- `KILL_SWITCH=true`;
- `OSIRIS_ENABLED=false`;
- proposal and review-decision APIs still OFF.

The Brain Control endpoint must be behind authenticated HTTPS. The bearer token is mandatory; Cloudflare Access service-token headers are supported as an additional boundary.

Verify health, then run one observe cycle:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile brain-observe run --rm brain-observe-cycle
```

That cycle performs zero writes.

## 2. Proposal materialization — first real inbox entries

Only after the private read path works:

```bash
python .github/maison-growth/runtime/preflight_private_runtime.py \
  proposal_materialization_candidate \
  --env-file .env.observe
```

Target remote state adds only:

- `BRAIN_PROPOSAL_API_ENABLED=true`;
- a **separate** `BRAIN_PROPOSAL_TOKEN`.

Keep `WORKER_ENABLED=false`, `KILL_SWITCH=true`, external sensors/model providers OFF.

First run materialization in preview mode:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile a14-materialize run --rm a14-materialize
```

When the selected previews are legitimate evidence-backed opportunities, set locally:

```text
MAISON_A14_MATERIALIZE_ENABLED=true
```

and rerun the same profile. This writes A14 commercial hypotheses and queues only `human_review_preview` offers for A12. It does **not** execute an experiment or contact anyone.

Read the working inbox:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile commercial-inbox run --rm commercial-inbox
```

The output separates:

- `decide` — human commercial decisions;
- `manual_pilots` — approved plans that require a human-operated test;
- `a8_drafts` — CTA experiments that exist only as drafts.

## 3. Human decisions

Enable the review-decision surface only when a real queue item is ready for a human decision:

```bash
python .github/maison-growth/runtime/preflight_private_runtime.py \
  human_review_decision_candidate \
  --env-file .env.observe
```

A recorded approval means **experiment planning only**. It does not authorize publication, outreach, spend or execution.

## 4. A8 draft path

Only CTA validation against an existing canonical Maison solution can enter A8. It additionally requires the private CTA context file and a passed canonical A7 `test_cta` decision.

Preflight:

```bash
python .github/maison-growth/runtime/preflight_private_runtime.py \
  a8_draft_candidate \
  --env-file .env.observe
```

The resulting A8 state is `draft` only.

## Stop condition

If any preflight returns `ready=false`, do not compensate by weakening a guard. Fix the named prerequisite and rerun the same stage.
