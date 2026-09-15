# Maison 2 — Search, GEO & AI discovery contract

This is implementation guidance, not visitor-facing vocabulary.

## Principle

Human usefulness first. Machine legibility follows from explicit, well-structured, attributable content.

## Every public indexable page

- One distinct human intent.
- Unique title and meta description.
- One clear H1 phrased for the visitor, not a crawler.
- Concise answer/recognition near the top where the page answers a question.
- Stable canonical URL.
- Crawlable contextual internal links.
- Visible brand/entity context where relevant.
- Accurate last-modified data where the publishing system can support it.
- No hidden keyword/LLM text.

## Structured data

Use JSON-LD only when it describes visible reality. Candidate types: Organization, WebSite, BreadcrumbList, Product, Offer, Service and Article. FAQPage is only used when the page visibly contains genuine question/answer content and current search-engine rules make it appropriate. Never generate schema merely to occupy SERP/AI surface area.

Product price, currency, availability and checkout information must share the same source of truth as visible product data.

## Oceans

Oceans remain an internal acquisition model. Public URLs and headings use human language.

Flow:

`human question -> useful answer -> related answer(s) -> relevant Maison door/offer -> contextual CTA`

Do not create near-duplicate pages for keyword permutations. Consolidate overlapping intent and use canonical/redirect strategy during migration where needed.

## AI / answer-engine retrieval

Write passages that remain truthful when extracted from their page context. Prefer explicit nouns over ambiguous pronouns in key answer passages. State limitations next to claims that need them. Keep brand and offer facts consistent across pages. Do not write prompts aimed at manipulating an AI system into recommending Maison.

## Technical discovery gates

Before Maison 2 goes indexable:

1. generate/reconcile sitemap from the final public URL inventory;
2. audit canonical targets;
3. validate robots directives;
4. validate JSON-LD syntax and visible-data consistency;
5. confirm no staging/noindex pages leak into sitemap;
6. confirm Ocean links resolve to final Maison destinations;
7. preserve or redirect valuable existing URLs rather than casually changing them;
8. test representative pages with JS disabled where content should remain crawlable.
