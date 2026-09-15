# MAISON JF® — Maison 2 Architecture

Status: architecture contract for the clean rebuild. This document does not alter production.

## North star

**PÁRA DE IGNORAR. Volta Para Casa.**

The new implementation must be technically boring and visually desirable: one coherent design system, semantic HTML, minimal JavaScript, reusable media slots, structured content, and no historical patch layers.

**Content changes. Structure does not break.**

## Production strategy

The current `main` remains production until Maison 2 passes staging and production-pipeline tests. Build Maison 2 away from `main`; do not patch the current homepage into Maison 2.

The pre-rebuild production state is preserved at `snapshot-pre-maison-2-2026-09-15` before this architecture document was added. The known recovery commit is `ae4a03f1efa6e94783b096113589f5f525205eb4`.

## Information architecture

The visible Maison remains simple:

- HOME — editorial entrance and Farol
- CASA
- CORPO
- CABEÇA
- COMPANHIA
- Produtos
- Serviços
- Respostas / useful discovery pages where appropriate
- Institutional / legal / contact

Oceans are primarily acquisition architecture, not a menu that visitors must learn. They should flow naturally into the four doors, products, services and useful answers.

**Ocean / human question → useful answer → relevant Maison destination → contextual CTA.**

## Oceans

Maintain and expand distinct, useful intent clusters without thin variants. Core fields include relationships, attachment, rejection, ambiguity, loneliness, intimacy, self-worth, boundaries, family influence, decisions, work, body/self-care, home/aroma, gifts, Tarot, companionship and B2B.

Every Ocean page must:

1. answer the human question first;
2. create immediate recognition without diagnosing;
3. provide genuinely useful original content;
4. expose an appropriate Maison destination early when one exists;
5. link to related strong pages, not keyword variants;
6. preserve honest limits and never fabricate supernatural certainty;
7. be indexable only when it has a distinct search intent and enough value to deserve a page.

## Search + GEO / AI discovery

Human usefulness is the source of truth. The implementation should nevertheless make meaning machine-readable for classic search and generative/AI retrieval.

Use:

- unique titles and descriptions;
- canonical URLs;
- semantic headings and landmarks;
- crawlable internal links;
- XML sitemap generated/reconciled from indexable content;
- robots rules that do not accidentally hide public content;
- structured data only when it truthfully describes the page/entity;
- Organisation / WebSite / BreadcrumbList / Product / Service / FAQ-like structured data only where valid and supported by visible content;
- explicit author/brand/entity context where useful;
- concise answer-first passages that can be accurately retrieved or cited by search and AI systems;
- stable URLs and clear relationships between Ocean, answer, product and service pages.

Do not create invisible keyword blocks, doorway pages, schema spam, fake reviews, fake FAQs or text written only for crawlers/LLMs.

Terms such as SEO, GEO, AI/LLM optimisation, answer-engine optimisation and related future labels are implementation concerns, not public-facing Maison jargon. The durable principle is: make each page useful, explicit, attributable, structured and easy to retrieve accurately.

## Media slot system

Images are content, not layout code. All visual components consume reusable semantic media slots.

### Slot roles

- `hero` — primary emotional/editorial image
- `packshot` — whole product/object
- `detail` — macro, texture, material, flame, liquid, label, gesture
- `use` — product/service in credible use
- `ritual` — sequence/moment around the offer
- `ambience` — world, room, table, steam, light, coffee, presence
- `pairing` — legitimate combination with another Maison offer
- `story` — optional editorial image supporting narrative

Slots are optional. Empty slots render nothing and leave no blank card or gap.

### Aspect families

- `landscape` — editorial/hero, target around 16:10
- `portrait` — doors/products/editorial, target around 4:5
- `square` — compact product/detail use, 1:1
- `wide` — optional campaign/editorial strip

The component owns aspect ratio, crop, responsive sizing and loading behaviour. Individual content can specify focal position when necessary.

### Asset contract

Prefer a predictable hierarchy:

`/assets/media/home/...`

`/assets/media/doors/casa/...`

`/assets/media/doors/corpo/...`

`/assets/media/doors/cabeca/...`

`/assets/media/doors/companhia/...`

`/assets/media/products/<slug>/...`

`/assets/media/services/<slug>/...`

Use WebP and/or AVIF with an intentional source format where appropriate. Do not rely on JavaScript to make basic images appear. Below-the-fold media may lazy-load; the principal hero must not.

Every materially different image gets truthful alt text. Decorative images use empty alt text intentionally.

## Product model

Every catalogue product is data-driven and can have its own optional visual collection without changing the template.

Minimum conceptual model:

```text
slug
name
category
short_description
editorial_description
price
currency
availability
checkout/link
media[]
  role
  src
  alt
  aspect
  focal_position (optional)
related_products[]
related_answers[]
cta
```

A product can launch with two images and later grow to six or eight. Adding media must not require CSS/layout rewrites.

Desired commercial rhythm where content supports it:

**sensation → detail → use → product → price → purchase**

Never invent product properties, ingredients, benefits, stock, prices or pairings.

## Service model

Services use the same media-slot engine but service-specific data. Imagery should sell the credible experience rather than pretending to photograph an abstract promise.

Possible visual language: conversation, prepared space, table, coffee, pause, guidance, proximity, hands/objects without invented intimacy, quiet environments and small gestures.

Service pages must state boundaries clearly. Companionship is not sexual service, guaranteed friendship, guaranteed romance or therapy. Tarot/reflection does not guarantee another person's thoughts or the future.

## Homepage

Homepage is edited, not exhaustive. It should create world, recognition and desire, then open clear doors into the Maison.

Use a small number of high-quality slots rather than galleries everywhere. Richer visual storytelling belongs on category, product and service detail pages.

## Technical rules

- One primary design system / stylesheet architecture; no competing “final authority” stylesheets.
- No dynamic CSS injection.
- No pseudo-elements used to substitute primary content images.
- No accumulated `!important` battles as architecture.
- Minimal progressive-enhancement JavaScript.
- No `old/`, `backup/`, `final-final/` or abandoned production copies in the deployable tree after migration.
- Accessible keyboard/focus states and reduced-motion respect.
- Responsive/mobile-first.
- Preserve analytics, checkout, legal requirements, prices and valid business content during migration.
- Preserve Oceans and Oráculo content deliberately rather than losing it in the visual rebuild.

## Deployment gates

Maison 2 does not replace production until all gates pass:

1. HTML/CSS/JS and internal-link audit.
2. Every referenced critical asset exists in the build output.
3. Hero and representative product/service slot images return HTTP 200 with expected image MIME types on staging.
4. No image relies on an accidental fallback to look correct.
5. Mobile and desktop visual checks.
6. Accessibility sanity check.
7. Analytics and conversion links verified.
8. robots, canonicals, structured data and sitemap verified.
9. Representative Ocean → Maison destination journeys tested.
10. Production smoke test after switch.

Only after production is confirmed should legacy active files be removed. Git history cleanup, if ever desired, is a separate destructive hygiene decision and not required for runtime correctness.

## Definition of done

A future request such as “add three new Escalda-Pés photos” should mean: add three media entries/assets to that product and publish. It should **not** mean redesign the page or write new CSS.

**The luxury is what the visitor sees. The simplicity stays under the bonnet.**
