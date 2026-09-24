import test from 'node:test';
import assert from 'node:assert/strict';

import { configuredProviders, isZeroCostOpenRouterModel } from '../src/providers.js';

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
