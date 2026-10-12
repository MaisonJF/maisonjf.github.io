import { callOpenRouterModel, openRouterZeroCostModels } from './providers.js';

export const MARKET_SEQUENCE = Object.freeze([
  { id: 'portugal', label: 'Portugal' },
  { id: 'europe', label: 'Europa' },
  { id: 'brazil', label: 'Brasil' },
  { id: 'world', label: 'Mundo' }
]);

export const OSIRIS_ROLES = Object.freeze([
  {
    id: 'osiris_01_radar',
    label: 'OSIRIS 01 — RADAR',
    mission: 'Detetar procura, sinais de mercado, concorrência, tendências e oportunidades comerciais para a Maison JF.',
    lenses: [
      'RADAR de procura: separar evidência observada, inferência e desconhecido.',
      'YOICHI FERAL: procurar o murro/pattern interrupt que conquista atenção sem recorrer a choque vazio.',
      'Psicologia viral: identificar emoção e motivos reais de partilha, sem confundir alcance com vendas.',
      'Inteligência competitiva: comparar categorias, posicionamento, ofertas e fricções; nunca inventar dados nem copiar identidades.'
    ],
    outputContract: 'Acrescenta evidence_quality, market_signals (Portugal, Europa, Brasil, Mundo), demand_signals, competitor_patterns e evidence_gaps. Marca cada conclusão como observed, inference ou unknown.'
  },
  {
    id: 'osiris_02_psychology_conversion',
    label: 'OSIRIS 02 — PSICOLOGIA & CONVERSÃO',
    mission: 'Transformar atenção em identificação, desejo, confiança, compra, recompra e recomendação.',
    lenses: [
      'BARNUM: relevância e reconhecimento pessoal, sem fingir conhecer individualmente a pessoa nem fazer promessas falsas.',
      'HORMOZI: valor percebido, resultado desejado, probabilidade percebida, tempo/esforço e redução legítima de risco.',
      'YOICHI FERAL: murro inicial que faz parar; depois, a mensagem tem de merecer a atenção.',
      'TOM FORD: desejo, provocação, segurança e sensorialidade.',
      'YSL: atitude, liberdade, tensão e ousadia.',
      'DIOR: narrativa, património, detalhe, desejo e sofisticação.',
      'CHANEL: códigos de marca, consistência, intemporalidade e edição.',
      'APPLE + KISS: experiência simples, poucos obstáculos e clareza.',
      'CIALDINI: prova social, autoridade, reciprocidade e compromisso; escassez/urgência apenas quando reais e verificáveis.',
      'JOBS-TO-BE-DONE + AIDA: compreender o progresso desejado e ligar atenção, interesse, desejo, ação e experiência posterior.',
      'CRO/psicologia comportamental: CTA, prova, confiança, fricção, abandono, recompra e recomendação.'
    ],
    outputContract: 'Acrescenta attention_hook, identification_angle, desire_driver, offer_diagnosis, trust_and_friction, conversion_path, repeat_purchase_loop e test_hypothesis. As marcas são lentes analíticas, não modelos a copiar.'
  },
  {
    id: 'osiris_03_strategist',
    label: 'OSIRIS 03 — ESTRATEGISTA',
    mission: 'Cruzar os sinais do Radar e da Psicologia/Conversão com a realidade da Maison JF, escolher a próxima ação comercial mais simples e ordenar a expansão por mercados.',
    lenses: [
      'Cruzar, citar e criticar explicitamente as conclusões dos OSIRIS 01 e 02.',
      'Resultado > ego: vendas, margem, recompra e aprendizagem mensurável acima de likes e vaidade.',
      'HORMOZI para oferta e valor; KISS para escolher a mudança com maior impacto e menor complexidade.',
      'Tom Ford, YSL, Dior e Chanel como lentes de desejo, atitude, narrativa e identidade — nunca como vozes reais, afiliações ou identidades a copiar.'
    ],
    outputContract: 'Devolve prioritized_market="Portugal", market_sequence=["Portugal","Europa","Brasil","Mundo"], market_adaptation com as quatro chaves portugal/europe/brazil/world, next_action_pt, success_metric, evidence_gaps e gate_for_expansion. Para cada mercado indica readiness, adaptation, main_risk e evidence_level. Só pode recomendar como próxima ação imediata uma ação para Portugal; os restantes mercados ficam adaptados e avaliados pela ordem definida.'
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

function buildPrompt(role, observations, existingPatterns, previousOutputs = []) {
  const marketOrder = MARKET_SEQUENCE.map((market, index) => String(index + 1) + '. ' + market.label).join(' → ');
  const strategistHandoff = role.id === 'osiris_03_strategist'
    ? JSON.stringify(previousOutputs.map(item => ({ role_id: item.role_id, payload: item.payload }))).slice(0, 10000)
    : 'Não se aplica a esta função.';
  const lensText = role.lenses.map(lens => '- ' + lens).join('\n');
  return [
    'És ' + role.label + ', um agente autónomo de análise comercial no Brain da MAISON JF.',
    'MISSÃO: ' + role.mission,
    '',
    'OBJETIVO SUPERIOR: transformar inteligência em vendas. RESULTADO > EGO.',
    'Uma ideia bonita que não vende deve ser criticada. Views sem compra não são sucesso; compra sem recompra exige investigação. Mantém KISS e escolhe ações testáveis.',
    '',
    'LENTES DE ANÁLISE OBRIGATÓRIAS:',
    lensText,
    '',
    'REGRAS DE INTEGRIDADE:',
    '- Nunca inventes vendas, clientes, tráfego, preços, custos, quotas, concorrentes, tendências ou estatísticas.',
    '- Distingue factos observados, inferências e desconhecidos. Se faltarem sinais, diz explicitamente que falta evidência.',
    '- Não atribuas opiniões reais a Tom Ford, YSL, Dior, Chanel, Apple, Hormozi, Barnum ou outras referências; não afirmes parceria nem copies marcas.',
    '- Barnum significa identificação responsável, não manipulação nem alegar conhecer individualmente quem lê.',
    '- Não confundas viralidade, impressões ou gostos com intenção de compra, receita ou margem.',
    '- Recomenda uma ação concreta de cada vez, com uma métrica de sucesso e uma condição para parar ou mudar.',
    '- Não publiques, não contactes clientes e não autorizes despesas; propõe apenas análise e ações para revisão humana.',
    '',
    'ORDEM ESTRATÉGICA DE MERCADOS — obrigatória: ' + marketOrder + '.',
    'PORTUGAL: ponto de partida e prioridade imediata. Considera português europeu, preços em EUR, poder de compra, canais reais, logística e capacidade atual da Maison.',
    'EUROPA: segunda camada. Não trates a UE como um mercado homogéneo; considera idioma, país, custos de envio, IVA/consumidor e adequação do canal.',
    'BRASIL: terceira camada. Usa português brasileiro, preços/âncoras em BRL e realidade local de pagamento, parcelamento, logística, impostos e distribuição; não convertas EUR em BRL mecanicamente.',
    'MUNDO: quarta camada, apenas como leitura de escalabilidade depois das adaptações anteriores; exige localização, canal, distribuição, moeda, regras e prova de repetibilidade.',
    'A ordem significa Portugal primeiro, depois Europa, depois Brasil e só depois mundo. A recomendação de ação imediata deve ser para Portugal. As outras três camadas são avaliações/adaptações posteriores, não autorização para lançar tudo em simultâneo.',
    '',
    'DADOS OSIRIS OBSERVADOS (pode estar vazio):',
    JSON.stringify(observations).slice(0, 16000),
    '',
    'PADRÕES DE APRENDIZAGEM EXISTENTES (candidatos não são factos confirmados):',
    JSON.stringify(existingPatterns).slice(0, 7000),
    '',
    'PASSAGEM ENTRE AGENTES (só relevante para o Estrategista; deve criticá-la e não a aceitar cegamente):',
    strategistHandoff,
    '',
    'CONTRATO DE SAÍDA ESPECÍFICO:',
    role.outputContract,
    '',
    'Responde APENAS com um objeto JSON válido que contenha sempre:',
    '{"signal":"...", "commercial_implication":"...", "problem":"...", "action":"...", "priority":0, "metric":"...", "confidence":0, "reason":"...", "evidence":[{"claim":"...", "level":"observed|inference|unknown", "source":"..."}]}',
    'Acrescenta os campos exigidos pelo contrato específico da tua função. Usa valores numéricos de 0 a 100 para priority e confidence. Se não houver dados suficientes, não preenchas lacunas com invenções.'
  ].join('\n');
}

async function callRoleWithFallback(env, prompt, models, preferredIndex) {
  const attempts = Math.min(3, models.length);
  let lastError = null;
  for (let offset = 0; offset < attempts; offset++) {
    const model = models[(preferredIndex + offset) % models.length];
    try {
      const result = await callOpenRouterModel(env, prompt, model);
      // Treat malformed/empty model output as a failed attempt and try another free model.
      const payload = parseJson(result.text);
      return { result, payload };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('osiris_council_all_free_models_failed');
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
    try {
      const prompt = buildPrompt(role, context.observations, context.patterns, outputs);
      const { result, payload } = await callRoleWithFallback(env, prompt, models, i % models.length);
      payload.priority = Math.max(0, Math.min(100, Number(payload.priority) || 0));
      payload.confidence = Math.max(0, Math.min(100, Number(payload.confidence) || 0));
      if (role.id === 'osiris_03_strategist') {
        payload.prioritized_market = 'Portugal';
        payload.market_sequence = MARKET_SEQUENCE.map(market => market.label);
        if (!payload.market_adaptation || typeof payload.market_adaptation !== 'object' || Array.isArray(payload.market_adaptation)) {
          payload.market_adaptation = {};
        }
        const proposedPortugalAction = clean(payload.next_action_pt || '', 1000);
        payload.next_action_pt = proposedPortugalAction && /portugal/i.test(proposedPortugalAction)
          ? proposedPortugalAction
          : 'Validar uma única mensagem/oferta em Portugal e medir a passagem até à compra.';
        payload.action = payload.next_action_pt;
        for (const market of MARKET_SEQUENCE) {
          if (!payload.market_adaptation[market.id] || typeof payload.market_adaptation[market.id] !== 'object') {
            payload.market_adaptation[market.id] = {
              readiness: 'unknown',
              adaptation: 'Evidência insuficiente; avaliar depois de medir a primeira ação em Portugal.',
              main_risk: 'Evidência insuficiente',
              evidence_level: 'unknown'
            };
          }
        }
      }
      const outputId = 'oso_' + crypto.randomUUID();
      await env.GROWTH_DB.prepare(
        `INSERT INTO maison_osiris_council_outputs
          (output_id,run_id,role_id,provider_id,model_id,payload_json)
         VALUES(?1,?2,?3,?4,?5,?6)`
      ).bind(outputId, runId, role.id, result.providerId, result.modelId || 'unknown', JSON.stringify(payload)).run();
      outputs.push({ output_id: outputId, role_id: role.id, model_id: result.modelId || 'unknown', payload });
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

  console.info('MAISON_OSIRIS_COUNCIL_RUN', JSON.stringify({
    run_id: runId,
    status,
    stored_roles: outputs.length,
    roles: outputs.map(item => item.role_id),
    errors: errors.map(item => ({ role_id: item.role_id, error: item.error })),
    market_sequence: MARKET_SEQUENCE.map(market => market.label)
  }));
  return { run_id: runId, status, stored_roles: outputs.length, outputs, errors };
}
