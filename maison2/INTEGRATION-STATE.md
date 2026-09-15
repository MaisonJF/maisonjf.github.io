# Maison 2 — Integration state

Integration branch: `maison-2-integrated`

Base: current `main` after the latest Oceans and sitemap work.

## Rule

This branch is the cutover candidate. It starts from current production so no new Ocean content or sitemap work is lost. Maison 2 files are brought across selectively from the isolated build branch and tested here. `main` remains untouched until explicit cutover.

## Preserved from current production

- latest relationship Ocean pages and relationship hub changes;
- current sitemap split/reconciliation work;
- existing analytics, checkout, legal and public content;
- current image assets.

## Maison 2 layers to integrate

- architecture contract;
- coherent CSS/design system;
- homepage prototype;
- four door destinations;
- data-driven products and media-slot model;
- services destination;
- Oráculo hub + Amor experience + reflective reading;
- answers/discovery hub;
- search/GEO/AI discovery contract.

## Gates before production

No cutover until navigation, assets, responsive layout, checkout handoffs, analytics, Oráculo, canonical/robots/sitemap behaviour and representative Ocean links have been checked. Staging remains noindex until those gates pass.
