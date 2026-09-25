import assert from 'node:assert/strict';
import { buildPdiThemeSourceSignals, pdiThemeSourceStats, groupExactThemeSignals } from '../../../functions/_lib/pdi-theme-sources.js';
import { listPdiThemes, getPdiTheme, pdiThemeRegistryStats } from '../../../functions/_lib/pdi-theme-registry.js';
import { isPublicPdiTheme, PDI_PUBLIC_HIDDEN_THEME_SLUGS } from '../../../functions/_lib/pdi-theme-catalogue.js';

const signals=buildPdiThemeSourceSignals();
const sources=pdiThemeSourceStats();
const groups=groupExactThemeSignals(signals);
const registry=listPdiThemes();
const stats=pdiThemeRegistryStats();

assert.ok(signals.length>0);
assert.equal(sources.totalSignals,signals.length);
assert.equal(sources.exactGroups,groups.length);
assert.equal(stats.sourceThemes,groups.length);
assert.equal(stats.registered,stats.sourceThemes+stats.curatedThemes);
assert.equal(stats.curatedThemes,2);
assert.equal(sources.ocean,signals.filter(x=>x.source==='ocean').length);
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

console.log(`PDI theme registry: OK · ${stats.sourceThemes} source themes + ${stats.curatedThemes} curated themes · ${sources.ocean} Ocean signals · structural invariants verified`);
