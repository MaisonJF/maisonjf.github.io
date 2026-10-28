import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');

test('Vault audit lists old, candidate, live and retired content without exposing a public endpoint',()=>{
  const lib=read('functions/_lib/vault-candidate-admin.js');
  const api=read('functions/api/vault-candidate-admin.js');
  const html=read('editorial-vault/index.html');
  assert.match(lib,/export async function listEditorialAuditContent/);
  assert.match(lib,/FROM vault_questions/);
  assert.match(lib,/FROM vault_oracle_blocks/);
  assert.match(lib,/quality_version/);
  assert.match(lib,/invalid_quarantine_scope/);
  assert.match(lib,/allowedAmor001/);
  assert.match(api,/action==='audit-list'/);
  assert.match(api,/action==='retire'/);
  assert.match(api,/action==='quarantine'/);
  assert.match(api,/MAISON_VAULT_ADMIN_SECRET/);
  assert.match(html,/id="audit-mode"/);
  assert.match(html,/id="export-audit"/);
  assert.match(html,/id="retire-selected"/);
  assert.match(html,/id="quarantine-selected"/);
  assert.match(html,/id="apply-plan"/);
  assert.match(html,/maison-vault-proposed-retirement-v1/);
  assert.match(html,/maison-vault-proposed-quarantine-v1/);
  assert.match(html,/maison-vault-proposed-quarantine-import-batch-v1/);
  assert.match(html,/private-import:amor-001:v1/);
  assert.match(html,/expectedSource/);
  assert.match(html,/A contagem do plano não coincide/);
  assert.match(html,/noindex,nofollow,noarchive/);
});

test('retirement preserves bodies and decisions instead of deleting content',()=>{
  const lib=read('functions/_lib/vault-candidate-admin.js');
  assert.match(lib,/SET status='retired',lifecycle_state='retired',rotation_state='retired'/);
  assert.match(lib,/INSERT INTO vault_editorial_decisions/);
  assert.match(lib,/physicalDeletion:false/);
  assert.match(lib,/export async function quarantineOceanEditorialContent/);
  assert.match(lib,/allowedOcean=requestedSource==='ocean_mcp_candidate'/);
  assert.match(lib,/allowedAmor001=requestedSource==='maison_private_import'/);
  assert.match(lib,/source_kind=\?2/);
  assert.match(lib,/ocean_candidate_quarantine/);
  assert.doesNotMatch(lib,/DELETE\s+FROM\s+vault_questions/i);
  assert.doesNotMatch(lib,/DELETE\s+FROM\s+vault_oracle_blocks/i);
});

test('generic question and Oracle seeding is disabled',()=>{
  const lib=read('functions/_lib/vault-candidate-admin.js');
  const html=read('editorial-vault/index.html');
  const start=lib.indexOf('export async function seedOceanVaultCandidates');
  const end=lib.indexOf('export async function activateOceanVaultCandidates',start);
  assert.ok(start>=0&&end>start);
  const seeder=lib.slice(start,end);
  assert.match(seeder,/disabled:true/);
  assert.match(seeder,/questions:0,oracle_blocks:0,created:0/);
  assert.match(html,/Seed automático desativado/);
});

test('generation pipelines enforce a suitability gate before writing question or Oracle bodies',()=>{
  const generator=read('workers/maison-intelligence/src/editorial_candidate_generation.js');
  const foundry=read('workers/maison-intelligence/src/expansion_foundry.js');
  assert.match(generator,/detectOperationalCommercialTopic/);
  assert.match(generator,/editorialDestinationDecision/);
  assert.match(generator,/editorial_classification_missing_or_invalid/);
  assert.match(foundry,/detectOperationalCommercialTopic/);
  assert.match(foundry,/candidate_type:'brand_intelligence'/);
  assert.match(foundry,/eligible_for_question_or_oracle:false/);
});
