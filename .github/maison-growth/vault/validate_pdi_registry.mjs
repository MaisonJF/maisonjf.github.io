import assert from 'node:assert/strict';
import { buildPdiThemeSourceSignals, pdiThemeSourceStats } from '../../../functions/_lib/pdi-theme-sources.js';
import { listPdiThemes, getPdiTheme, pdiThemeRegistryStats } from '../../../functions/_lib/pdi-theme-registry.js';

const signals=buildPdiThemeSourceSignals();
const sources=pdiThemeSourceStats();
const registry=listPdiThemes();
const stats=pdiThemeRegistryStats();

assert.equal(signals.length,150);
assert.equal(sources.exactGroups,150);
assert.equal(stats.sourceThemes,150);
assert.equal(stats.registered,151);
assert.equal(stats.minimumLiveQuestions,28);
assert.equal(new Set(registry.map(x=>x.slug)).size,registry.length);
assert.equal(getPdiTheme('relacoes')?.label,'Relações');
assert.ok(getPdiTheme('trabalho'));
assert.ok(getPdiTheme('dinheiro'));
assert.ok(getPdiTheme('familia'));

console.log('PDI theme registry: OK · 150 source themes + Relações umbrella');
