import assert from 'node:assert/strict';
import { buildPdiThemeSourceSignals, pdiThemeSourceStats } from '../../../functions/_lib/pdi-theme-sources.js';
import { listPdiThemes, getPdiTheme, getPdiPriceForLocale, pdiThemeRegistryStats } from '../../../functions/_lib/pdi-theme-registry.js';
import { isPublicPdiTheme, PDI_PUBLIC_HIDDEN_THEME_SLUGS } from '../../../functions/_lib/pdi-theme-catalogue.js';

const signals=buildPdiThemeSourceSignals();
const sources=pdiThemeSourceStats();
const registry=listPdiThemes();
const stats=pdiThemeRegistryStats();

// These are invariants, not fixed totals: Ocean discovery is expected to grow.
assert.equal(stats.sourceThemes,sources.exactGroups);
assert.equal(stats.registered,stats.sourceThemes+stats.curatedThemes);
assert.equal(stats.curatedThemes,2);
assert.equal(sources.ocean,signals.filter(signal=>signal.source==='ocean').length);
assert.ok(signals.length>=sources.exactGroups);
assert.ok(sources.ocean>0);
assert.equal(stats.minimumLiveQuestions,28);
assert.deepEqual(getPdiPriceForLocale('pt-PT'),{amount:500,currency:'eur'});
assert.deepEqual(getPdiPriceForLocale('pt-BR'),{amount:1990,currency:'brl'});
assert.deepEqual(getPdiPriceForLocale('en'),{amount:500,currency:'eur'});
assert.deepEqual(getPdiPriceForLocale('es'),{amount:500,currency:'eur'});
assert.deepEqual(getPdiPriceForLocale('pt-br'),{amount:1990,currency:'brl'});
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

console.log('PDI theme registry: OK · dynamic source-theme counts · '+sources.ocean+' Ocean signals · legacy Amor & Relações hidden publicly');
