import assert from 'node:assert/strict';
import { buildPdiThemeSourceSignals, pdiThemeSourceStats } from '../../../functions/_lib/pdi-theme-sources.js';
import { listPdiThemes, getPdiTheme, pdiThemeRegistryStats } from '../../../functions/_lib/pdi-theme-registry.js';
import { isPublicPdiTheme, PDI_PUBLIC_HIDDEN_THEME_SLUGS } from '../../../functions/_lib/pdi-theme-catalogue.js';

const signals=buildPdiThemeSourceSignals();
const sources=pdiThemeSourceStats();
const registry=listPdiThemes();
const stats=pdiThemeRegistryStats();

assert.equal(signals.length,292);
assert.equal(sources.exactGroups,268);
assert.equal(stats.sourceThemes,268);
assert.equal(stats.registered,270);
assert.equal(stats.curatedThemes,2);
assert.equal(sources.ocean,142);
assert.equal(stats.minimumLiveQuestions,28);
assert.equal(new Set(registry.map(x=>x.slug)).size,registry.length);
assert.equal(getPdiTheme('relacoes')?.label,'Relações');
assert.ok(getPdiTheme('trabalho'));
assert.ok(getPdiTheme('dinheiro'));
assert.ok(getPdiTheme('familia-e-lacos'));
assert.equal(getPdiTheme('amor-sem-filtro')?.label,'Amor sem Filtro');
assert.equal(getPdiTheme('amor-e-relacoes')?.label,'Amor & Relações');
assert.deepEqual(PDI_PUBLIC_HIDDEN_THEME_SLUGS,['amor-e-relacoes']);
assert.equal(isPublicPdiTheme('amor-e-relacoes'),false);
assert.equal(isPublicPdiTheme('relacoes'),true);
assert.equal(isPublicPdiTheme('amor-sem-filtro'),true);

console.log('PDI theme registry: OK · 268 source themes + 2 curated themes · 142 Ocean signals · legacy Amor & Relações hidden publicly');
