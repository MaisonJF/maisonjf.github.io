# MAISON JF® · Private Brain Vault

This directory contains only the **public schema and operating contract** for the private Maison content vault.

## Purpose

Paid content bodies must never be committed to the public GitHub repository.

The private vault is designed to hold:

- PÁRA DE IGNORAR! paid question bodies and editorial metadata;
- future private Oráculo composition blocks;
- generated paid game sessions;
- pseudonymous anti-repetition history;
- aggregate interaction counters;
- private rewards such as Carta 29 / mini-packs.

It must **never** store players' answer text or private conversation content.

## Runtime

Cloudflare Pages Functions access a D1 database through the binding:

`MAISON_BRAIN_DB`

A secret environment variable is also required:

`MAISON_VAULT_PEPPER`

The pepper is used to HMAC-normalize buyer identity for anti-repetition without storing raw email addresses.

## Provisioning

1. Create a D1 database in Cloudflare, suggested name: `maison-brain-vault`.
2. Apply `0001_private_content_vault.sql`.
3. Bind the database to the Pages project as `MAISON_BRAIN_DB` in Production and Preview as appropriate.
4. Add a strong secret `MAISON_VAULT_PEPPER` to the Pages environment.
5. Redeploy the Pages project.

No paid bodies are included in this repository migration.

## Safety contract

- GitHub holds code and schema, not paid bodies.
- Browser clients never receive the full repertoire.
- One paid session receives only its selected 28 questions.
- Question text is immutable once inserted; edits create a new question ID/version.
- Sessions keep question IDs, making reloads stable.
- Buyer identity is pseudonymous and derived server-side.
- Answer text is never requested or stored.
- Oceans may propose abstract candidates only; they never write directly into paid tables.
