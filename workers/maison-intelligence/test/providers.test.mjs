import test from 'node:test';
import assert from 'node:assert/strict';

import { configuredProviders, configuredZeroCostModelSpecs, isZeroCostOpenRouterModel } from '../src/providers.js';

test('all AI providers are opt-in even when bindings or model names exist', () => {
  const env = {
    AI: { run() {} },
    WORKERS_AI_MODEL: '@cf/test/model',
    OPENAI_API_KEY: 'x', OPENAI_MODEL: 'test',
    GEMINI_API_KEY: 'x', GEMINI_MODEL: 'test',
    PERPLEXITY_API_KEY: 'x',
    ANTHROPIC_API_KEY: 'x', ANTHROPIC_MODEL: 'test',
    OPENROUTER_API_KEY: 'x', OPENROUTER_MODEL: 'test',
    OSIRIS_GATEWAY_API_KEY: 'x', OSIRIS_GATEWAY_MODEL: 'test'
  };
  assert.deepEqual(configuredProviders(env), []);
});

test('explicit enable flags expose only selected configured providers', () => {
  const env = {
    AI: { run() {} },
    WORKERS_AI_ENABLED: 'true',
    WORKERS_AI_MODEL: '@cf/test/model',
    OPENAI_ENABLED: 'true',
    OPENAI_API_KEY: 'x',
    OPENAI_MODEL: 'test',
    OPENROUTER_ENABLED: 'true',
    OPENROUTER_API_KEY: 'x',
    OPENROUTER_MODEL: 'openrouter/free',
    GEMINI_ENABLED: 'false',
    GEMINI_API_KEY: 'x',
    GEMINI_MODEL: 'test'
  };
  assert.deepEqual(configuredProviders(env), [
    'cloudflare_workers_ai',
    'openrouter',
    'openai'
  ]);
});

test('enable flag without required secret or model is skipped', () => {
  assert.deepEqual(configuredProviders({
    OPENAI_ENABLED: 'true',
    OPENAI_MODEL: 'test',
    ANTHROPIC_ENABLED: 'true',
    ANTHROPIC_API_KEY: 'x'
  }), []);
});


test('OpenRouter only accepts explicitly free model routes', () => {
  assert.equal(isZeroCostOpenRouterModel('openrouter/free'), true);
  assert.equal(isZeroCostOpenRouterModel('google/gemma-4-27b-it:free'), true);
  assert.equal(isZeroCostOpenRouterModel('openai/gpt-5'), false);
  assert.equal(isZeroCostOpenRouterModel('openrouter/auto'), false);
});

test('paid OpenRouter model is refused even when enabled and keyed', () => {
  assert.deepEqual(configuredProviders({
    OPENROUTER_ENABLED: 'true',
    OPENROUTER_API_KEY: 'x',
    OPENROUTER_MODEL: 'openai/gpt-5'
  }), []);
});

test('free OpenRouter route is admitted when enabled and keyed', () => {
  assert.deepEqual(configuredProviders({
    OPENROUTER_ENABLED: 'true',
    OPENROUTER_API_KEY: 'x',
    OPENROUTER_MODEL: 'openrouter/free'
  }), ['openrouter']);
});


test('free fallback model chain is accepted', () => {
  assert.deepEqual(configuredProviders({
    OPENROUTER_ENABLED: 'true',
    OPENROUTER_API_KEY: 'x',
    OPENROUTER_MODEL: 'google/gemma-4-26b-a4b-it:free',
    OPENROUTER_FALLBACK_MODELS_JSON: JSON.stringify([
      'qwen/qwen3.8-27b:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'z-ai/glm-5.2:free'
    ])
  }), ['openrouter']);
});

test('paid model anywhere in OpenRouter fallback chain is refused', () => {
  assert.deepEqual(configuredProviders({
    OPENROUTER_ENABLED: 'true',
    OPENROUTER_API_KEY: 'x',
    OPENROUTER_MODEL: 'google/gemma-4-26b-a4b-it:free',
    OPENROUTER_FALLBACK_MODELS_JSON: JSON.stringify([
      'openai/gpt-5'
    ])
  }), []);
});


test('zero-cost Foundry expands every configured OpenRouter free model independently', () => {
  const specs=configuredZeroCostModelSpecs({
    ZERO_COST_MODE:'true',
    OPENROUTER_ENABLED:'true',
    OPENROUTER_API_KEY:'x',
    OPENROUTER_MODEL:'google/gemma-4-26b-a4b-it:free',
    OPENROUTER_FALLBACK_MODELS_JSON:JSON.stringify([
      'qwen/qwen3.8-27b:free',
      'z-ai/glm-5.2:free'
    ])
  });
  assert.deepEqual(specs.map(x=>x.key),[
    'openrouter:google/gemma-4-26b-a4b-it:free',
    'openrouter:qwen/qwen3.8-27b:free',
    'openrouter:z-ai/glm-5.2:free'
  ]);
});

test('Workers AI can join zero-cost Foundry without joining continuous sensing', () => {
  const env={
    AI:{run(){}},
    ZERO_COST_MODE:'true',
    WORKERS_AI_ENABLED:'false',
    WORKERS_AI_MODEL:'@cf/test/model'
  };
  assert.deepEqual(configuredProviders(env),[]);
  assert.equal(configuredZeroCostModelSpecs(env)[0].providerId,'cloudflare_workers_ai');
});

test('zero-cost Foundry stays off when ZERO_COST_MODE is false', () => {
  assert.deepEqual(configuredZeroCostModelSpecs({
    ZERO_COST_MODE:'false',
    OPENROUTER_ENABLED:'true',
    OPENROUTER_API_KEY:'x',
    OPENROUTER_MODEL:'openrouter/free'
  }),[]);
});
