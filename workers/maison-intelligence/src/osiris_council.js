import { callOpenRouterModel, openRouterZeroCostModels } from './providers.js';

export const OSIRIS_ROLES = Object.freeze([
  {
    id: 'osiris_01_radar',
    label: 'OSIRIS 01 — RADAR',
    mission: 'Detecta procura, tendências, concorrência, comportamento, oportunidades e sinais que possam gerar vendas para a MAISON JF.'
  },
  {
    id: 'osiris_02_psychology_conversion',
    label: 'OSIRIS 02 — PSICOLOGIA & CONVERSÃO',
    mission: 'Analisa desejo, identificação, fricção, linguagem, oferta, confiança e conversão. Procura o que impede uma pessoa de avançar até à compra.'
  },
  {
    id: 'osiris_03_strategist',
    label: 'OSIRIS 03 — ESTRATEGISTA',
    mission: 'Cruza os sinais dos outros dois OSIRIS com a realidade da Maison e determina a próxima acção comercial mais simples e de maior impacto.'
  }
]);

function enabled(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function clean(value, max = 9000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function parseJson(raw) {
  const text = String(raw ?? '').trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('osiris_council_json_missing');
  return JSON.parse(text.slice(start, end + 1));
}

function buildPrompt(role, observations, existingPatterns) {
  return `És ${role.label}, um agente interno do Brain da MAISON JF.
MISSÃO: ${role.mission}

OBJECTIVO SUPERIOR:
Transformar inteligência em vendas. Resultado > ego.
Uma ideia bonita que não vende deve ser criticada. Viralidade sem conversão não é sucesso. Conversão sem recompra não é o fim. Mantém KISS: procurar a alteração simples que produz impacto.

METODOLOGIA MAISON:
YOICHI FERAL = o murro que faz parar.
BARNUM = identificação.
PSICOLOGIA VIRAL = emoção e partilha.
APPLE = experiência, simplicidade e desejo.
HORMOZI = valor percebido e oferta.
KISS = eliminar complexidade.
CONVERSÃO = intenção em acção.
COMPRA → EXPERIÊNCIA → RECOMPRA → FIDELIZAÇÃO → RECOMENDAÇÃO.

REFERENCIAIS DE EXCELÊNCIA:
Tom Ford, Dior, Chanel, YSL e outros grandes referenciais podem servir como lentes críticas de desejo, identidade, luxo, narrativa, edição e experiência. NÃO copies essas marcas e NÃO atribuas opiniões reais às pessoas. A MAISON JF deve continuar a ser MAISON JF.

DADOS OSIRIS OBSERVADOS:
${JSON.stringify(observations).slice(0, 16000)}

PADRÕES JÁ APRENDIDOS:
${JSON.stringify(existingPatterns).slice(0, 7000)}

Responde APENAS com JSON válido:
{
  "signal": "o sinal mais importante",
  "commercial_implication": "o que isto pode significar para vendas",
  "problem": "erro, fricção ou oportunidade principal",
  "action": "uma única acção concreta e simples para a Maison executar",
  "priority": 0,
  "metric": "a métrica que deve provar se funcionou",
  "confidence": 0,
  "reason": "porquê"
}
Não inventes vendas, clientes, métricas ou evidência que não estejam nos dados. Quando não houver evidência suficiente, diz isso claramente.`;
}

async function ensureSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS maison_osiris_council_runs (
    run_id TEXT PRIMARY KEY,
    run_date TEXT NOT NULL,
    slot INTEGER NOT NULL,
    stored_roles INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    detail_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(run_date,slot)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS maison_osiris_council_outputs (
    output_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    model_id TEXT,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(run_id,role_id)
  )`).run();
}

async function loadContext(db) {
  const observations = await db.prepare(`
    SELECT observation_id, provider_id, territory_key, response_excerpt, observed_at
      FROM external_intelligence_observations
     WHERE provider_id LIKE 'osiris_%'
     ORDER BY observed_at DESC
     LIMIT 18
  `).all();
  let patterns = [];
  try {
    const result = await db.prepare(`
      SELECT pattern_key, scope, title, guidance, confidence, occurrence_count
        FROM maison_feedback_learning_patterns
       WHERE status IN ('active','candidate')
       ORDER BY confidence DESC, occurrence_count DESC
       LIMIT 12
    `).all();
    patterns = result?.results || [];
  } catch {}
  return { observations: observations?.results || [], patterns };
}

export async function runOsirisCouncil(env, { date = new Date() } = {}) {
  if (!enabled(env.OSIRIS_COUNCIL_ENABLED)) return { skipped: 'osiris_council_disabled' };
  if (!enabled(env.ZERO_COST_MODE)) return { skipped: 'zero_cost_mode_required' };
  if (!enabled(env.OPENROUTER_ENABLED) || !env.OPENROUTER_API_KEY) return { skipped: 'openrouter_unavailable' };

  await ensureSchema(env.GROWTH_DB);
  const dateKey = date.toISOString().slice(0, 10);
  const slot = Math.floor(date.getUTCHours() / 3);
  const existingRun = await env.GROWTH_DB.prepare(
    'SELECT run_id,status FROM maison_osiris_council_runs WHERE run_date=?1 AND slot=?2'
  ).bind(dateKey, slot).first();
  if (existingRun) return { skipped: 'slot_already_processed', run_id: existingRun.run_id };

  const runId = 'osc_' + crypto.randomUUID();
  await env.GROWTH_DB.prepare(
    `INSERT INTO maison_osiris_council_runs(run_id,run_date,slot,status) VALUES(?1,?2,?3,'started')`
  ).bind(runId, dateKey, slot).run();

  const context = await loadContext(env.GROWTH_DB);
  const models = openRouterZeroCostModels(env);
  const outputs = [];
  const errors = [];

  for (let i = 0; i < OSIRIS_ROLES.length; i++) {
    const role = OSIRIS_ROLES[i];
    const model = models[i % models.length];
    try {
      const result = await callOpenRouterModel(env, buildPrompt(role, context.observations, context.patterns), model);
      const payload = parseJson(result.text);
      payload.priority = Math.max(0, Math.min(100, Number(payload.priority) || 0));
      payload.confidence = Math.max(0, Math.min(100, Number(payload.confidence) || 0));
      const outputId = 'oso_' + crypto.randomUUID();
      await env.GROWTH_DB.prepare(
        `INSERT INTO maison_osiris_council_outputs
          (output_id,run_id,role_id,provider_id,model_id,payload_json)
         VALUES(?1,?2,?3,?4,?5,?6)`
      ).bind(outputId, runId, role.id, result.providerId, result.modelId || model, JSON.stringify(payload)).run();
      outputs.push({ output_id: outputId, role_id: role.id, model_id: result.modelId || model, payload });
    } catch (error) {
      errors.push({ role_id: role.id, error: clean(error?.message || error, 500) });
    }
  }

  const status = outputs.length === 3 ? 'completed' : outputs.length ? 'partial' : 'failed';
  await env.GROWTH_DB.prepare(
    `UPDATE maison_osiris_council_runs
        SET stored_roles=?2,status=?3,detail_json=?4
      WHERE run_id=?1`
  ).bind(runId, outputs.length, status, JSON.stringify({ outputs: outputs.map(x => x.role_id), errors })).run();

  return { run_id: runId, status, stored_roles: outputs.length, outputs, errors };
}
