import test from 'node:test';
import assert from 'node:assert/strict';

import { configuredProviders } from '../src/providers.js';

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
    OPENROUTER_MODEL: 'test',
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
