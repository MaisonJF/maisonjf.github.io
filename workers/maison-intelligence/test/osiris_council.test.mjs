import test from 'node:test';
import assert from 'node:assert/strict';

import { MARKET_SEQUENCE, OSIRIS_ROLES, runOsirisCouncil } from '../src/osiris_council.js';

class MockD1 {
  constructor() {
    this.runs = [];
    this.outputs = [];
    this.statements = [];
  }

  prepare(sql) {
    const db = this;
    const statement = {
      sql,
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async run() {
        db.statements.push({ sql: this.sql, values: this.values });
        if (this.sql.includes('INSERT INTO maison_osiris_council_runs')) {
          db.runs.push({
            run_id: this.values[0],
            run_date: this.values[1],
            slot: this.values[2],
            status: 'started',
            stored_roles: 0
          });
        } else if (this.sql.includes('INSERT INTO maison_osiris_council_outputs')) {
          db.outputs.push({
            output_id: this.values[0],
            run_id: this.values[1],
            role_id: this.values[2],
            provider_id: this.values[3],
            model_id: this.values[4],
            payload_json: this.values[5]
          });
        } else if (this.sql.includes('UPDATE maison_osiris_council_runs')) {
          const run = db.runs.find(item => item.run_id === this.values[0]);
          if (run) {
            run.stored_roles = this.values[1];
            run.status = this.values[2];
            run.detail_json = this.values[3];
          }
        }
        return { success: true };
      },
      async first() {
        if (this.sql.includes('SELECT run_id,status FROM maison_osiris_council_runs')) return null;
        return null;
      },
      async all() {
        if (this.sql.includes('FROM external_intelligence_observations')) {
          return { results: [{
            observation_id: 'obs_test_1',
            provider_id: 'osiris_news',
            territory_key: 'portugal',
            response_excerpt: 'Sinal de procura de teste para o mercado português',
            observed_at: '2026-10-12T10:00:00Z'
          }] };
        }
        if (this.sql.includes('FROM maison_feedback_learning_patterns')) {
          return { results: [{
            pattern_key: 'test_pattern',
            scope: 'commercial',
            title: 'Padrão de teste',
            guidance: 'Usar apenas como hipótese, validar com evidência.',
            confidence: 55,
            occurrence_count: 2
          }] };
        }
        return { results: [] };
      }
    };
    return statement;
  }
}

function modelReply(roleId) {
  const common = {
    signal: roleId + '_TEST_SIGNAL',
    commercial_implication: 'Hipótese a validar antes de investir.',
    problem: 'Falta evidência de conversão real.',
    action: 'Testar uma melhoria simples em Portugal.',
    priority: 72,
    metric: 'Cliques qualificados que avançam para compra',
    confidence: 61,
    reason: 'Resposta sintética de teste; não representa dados de produção.',
    evidence: [{ claim: 'Sinal sintético', level: 'observed', source: 'fixture de teste' }]
  };
  if (roleId === 'osiris_01_radar') {
    return {
      ...common,
      evidence_quality: 'synthetic_test',
      market_signals: { Portugal: 'sinal sintético', Europa: 'unknown', Brasil: 'unknown', Mundo: 'unknown' },
      demand_signals: [],
      competitor_patterns: [],
      evidence_gaps: ['Procura real ainda por medir']
    };
  }
  if (roleId === 'osiris_02_psychology_conversion') {
    return {
      ...common,
      attention_hook: 'Gancho sintético',
      identification_angle: 'Identificação responsável, sem promessas falsas',
      desire_driver: 'Valor sensorial a validar',
      offer_diagnosis: 'Necessita de prova',
      trust_and_friction: ['Medir confiança e fricção'],
      conversion_path: ['Atenção', 'Página', 'Compra'],
      repeat_purchase_loop: 'A validar após primeira compra',
      test_hypothesis: 'Uma variante de mensagem pode melhorar o próximo passo'
    };
  }
  return {
    ...common,
    prioritized_market: 'Brasil',
    market_sequence: ['Brasil', 'Portugal'],
    market_adaptation: {
      portugal: { readiness: 'test', adaptation: 'Português europeu', main_risk: 'Amostra insuficiente', evidence_level: 'inference' },
      europe: { readiness: 'unknown', adaptation: 'Localizar por país', main_risk: 'UE não é homogénea', evidence_level: 'unknown' },
      brazil: { readiness: 'unknown', adaptation: 'Português brasileiro e BRL', main_risk: 'Logística e preço local', evidence_level: 'unknown' },
      world: { readiness: 'unknown', adaptation: 'Localização e distribuição', main_risk: 'Falta de validação nos mercados anteriores', evidence_level: 'unknown' }
    },
    next_action_pt: 'Validar mensagem e conversão em Portugal',
    success_metric: 'Conversão qualificada',
    evidence_gaps: ['Vendas reais não foram fornecidas'],
    gate_for_expansion: 'Não avançar sem medir a ação em Portugal'
  };
}

test('council exposes three specialist roles and the required market order', () => {
  assert.deepEqual(OSIRIS_ROLES.map(role => role.id), [
    'osiris_01_radar',
    'osiris_02_psychology_conversion',
    'osiris_03_strategist'
  ]);
  assert.deepEqual(MARKET_SEQUENCE.map(market => market.label), ['Portugal', 'Europa', 'Brasil', 'Mundo']);
  assert.match(OSIRIS_ROLES[1].lenses.join(' '), /BARNUM/);
  assert.match(OSIRIS_ROLES[1].lenses.join(' '), /HORMOZI/);
  assert.match(OSIRIS_ROLES[1].lenses.join(' '), /TOM FORD/);
  assert.match(OSIRIS_ROLES[1].lenses.join(' '), /YSL/);
  assert.match(OSIRIS_ROLES[1].lenses.join(' '), /DIOR/);
  assert.match(OSIRIS_ROLES[1].lenses.join(' '), /CHANEL/);
});

test('all three roles write D1 outputs, with handoff to strategist and free-model fallback', async () => {
  const previousFetch = globalThis.fetch;
  const d1 = new MockD1();
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    const prompt = body.messages[0].content;
    requests.push({ model: body.model, prompt });
    // Prove the Radar has a zero-cost fallback if its preferred model is unavailable.
    if (prompt.includes('OSIRIS 01 — RADAR') && body.model === 'google/gemma-4-26b-a4b-it:free') {
      return new Response('temporary test failure', { status: 503 });
    }
    let roleId;
    if (prompt.includes('OSIRIS 01 — RADAR')) roleId = 'osiris_01_radar';
    else if (prompt.includes('OSIRIS 02 — PSICOLOGIA & CONVERSÃO')) roleId = 'osiris_02_psychology_conversion';
    else if (prompt.includes('OSIRIS 03 — ESTRATEGISTA')) roleId = 'osiris_03_strategist';
    else throw new Error('Unexpected role prompt');
    return new Response(JSON.stringify({
      id: 'mock-request',
      model: body.model,
      choices: [{ message: { content: JSON.stringify(modelReply(roleId)) } }]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const result = await runOsirisCouncil({
      OSIRIS_COUNCIL_ENABLED: 'true',
      ZERO_COST_MODE: 'true',
      OPENROUTER_ENABLED: 'true',
      OPENROUTER_API_KEY: 'test-key',
      OPENROUTER_MODEL: 'google/gemma-4-26b-a4b-it:free',
      OPENROUTER_FALLBACK_MODELS_JSON: JSON.stringify([
        'qwen/qwen3.8-27b:free',
        'nvidia/nemotron-3-super-120b-a12b:free'
      ]),
      GROWTH_DB: d1
    }, { date: new Date('2026-10-12T09:30:00Z') });

    assert.equal(result.status, 'completed');
    assert.equal(result.stored_roles, 3);
    assert.equal(d1.outputs.length, 3);
    assert.equal(d1.runs[0].status, 'completed');
    assert.equal(d1.runs[0].stored_roles, 3);
    assert.equal(requests.length, 4, 'one failed Radar model plus one fallback and two remaining roles');

    const radarRequests = requests.filter(request => request.prompt.includes('OSIRIS 01 — RADAR'));
    assert.equal(radarRequests.length, 2);
    assert.equal(radarRequests[1].model, 'qwen/qwen3.8-27b:free');

    const strategist = requests.find(request => request.prompt.includes('OSIRIS 03 — ESTRATEGISTA'));
    assert.ok(strategist.prompt.includes('osiris_01_radar'));
    assert.ok(strategist.prompt.includes('osiris_02_psychology_conversion'));
    assert.ok(strategist.prompt.includes('osiris_01_radar_TEST_SIGNAL'));
    assert.ok(strategist.prompt.includes('osiris_02_psychology_conversion_TEST_SIGNAL'));
    assert.match(strategist.prompt, /Portugal.*Europa.*Brasil.*Mundo/);

    const storedStrategist = JSON.parse(d1.outputs.find(item => item.role_id === 'osiris_03_strategist').payload_json);
    assert.equal(storedStrategist.prioritized_market, 'Portugal');
    assert.deepEqual(storedStrategist.market_sequence, ['Portugal', 'Europa', 'Brasil', 'Mundo']);
    assert.deepEqual(Object.keys(storedStrategist.market_adaptation), ['portugal', 'europe', 'brazil', 'world']);
    const psychology = requests.find(request => request.prompt.includes('OSIRIS 02 — PSICOLOGIA & CONVERSÃO'));
    for (const lens of ['BARNUM', 'HORMOZI', 'TOM FORD', 'YSL', 'DIOR', 'CHANEL', 'YOICHI FERAL']) {
      assert.ok(psychology.prompt.includes(lens), 'psychology prompt should include ' + lens);
    }
    assert.ok(requests.every(request => /Portugal.*Europa.*Brasil.*Mundo/.test(request.prompt)));
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('council remains disabled unless explicitly enabled', async () => {
  const result = await runOsirisCouncil({
    OSIRIS_COUNCIL_ENABLED: 'false',
    ZERO_COST_MODE: 'true',
    OPENROUTER_ENABLED: 'true',
    OPENROUTER_API_KEY: 'test-key',
    GROWTH_DB: new MockD1()
  }, { date: new Date('2026-10-12T09:30:00Z') });
  assert.deepEqual(result, { skipped: 'osiris_council_disabled' });
});
