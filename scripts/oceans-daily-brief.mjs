const DATABASE_ID = "fb49d911-fed3-4c50-8424-231aae391814";
const D1_API = "https://api.cloudflare.com/client/v4";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error("Required configuration is missing: " + name);
  return value;
}
function lisbonParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const out = {};
  for (const part of parts) out[part.type] = part.value;
  return { date: out.year + "-" + out.month + "-" + out.day, hour: out.hour, minute: out.minute };
}
function jsonArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function cleanText(value, max = 700) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function urlList(value, max = 3) {
  return jsonArray(value).map(item => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") return String(item.url || item.href || "");
    return "";
  }).map(raw => {
    try {
      const u = new URL(raw);
      if (!["https:", "http:"].includes(u.protocol) || u.username || u.password) return "";
      return u.toString();
    } catch { return ""; }
  }).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).slice(0, max);
}
function dateLabel(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || "data desconhecida");
  return d.toLocaleString("pt-PT", {timeZone:"Europe/Lisbon", dateStyle:"short", timeStyle:"short"});
}
function score(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
}
async function queryD1(accountId, token, sql, params = []) {
  const response = await fetch(D1_API + "/accounts/" + encodeURIComponent(accountId) +
    "/d1/database/" + DATABASE_ID + "/query", {
      method: "POST",
      headers: {
        "authorization": "Bearer " + token,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({sql, params})
    });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    throw new Error("cloudflare_d1_read_failed_http_" + response.status);
  }
  let result = payload.result;
  if (Array.isArray(result)) result = result[0];
  if (!result || result.success === false || !Array.isArray(result.results)) {
    throw new Error("cloudflare_d1_read_unexpected_response");
  }
  return result.results;
}
function makeReport({now, observations, signals, states, stats, usage}) {
  const local = lisbonParts(now);
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const freshStates = states.filter(row => {
    const d = new Date(row.last_seen_at || 0);
    return !Number.isNaN(d.getTime()) && d >= cutoff;
  });
  const rankedSignals = signals.slice().sort((a,b) =>
    Math.max(score(b.relevance_score),score(b.commercial_score)) -
    Math.max(score(a.relevance_score),score(a.commercial_score)) ||
    String(b.observed_at).localeCompare(String(a.observed_at)));
  const rankedObservations = observations.slice().sort((a,b) =>
    Number(b.grounding_state === "grounded") - Number(a.grounding_state === "grounded") ||
    urlList(b.citations_json).length - urlList(a.citations_json).length ||
    String(b.observed_at).localeCompare(String(a.observed_at)));
  const commercial = rankedSignals.filter(row => score(row.commercial_score) >= 60).slice(0,4);
  const lines = [
    "MAISON JF® · OCEANS RADAR",
    "Briefing diário · " + local.date + " · Portugal continental",
    "Janela de recolha: últimas 24 horas",
    "",
    "ESTADO DO RADAR",
    "• Observações externas totais: " + Number(stats.observations || 0) +
      (stats.latest_observation ? " · última observação: " + dateLabel(stats.latest_observation) : ""),
    "• Sinais de memória acumulados: " + Number(stats.signals || 0) +
      (stats.latest_signal ? " · último sinal: " + dateLabel(stats.latest_signal) : ""),
    "• Oceans ativos na memória: " + states.length +
      " · sinais agregados: " + states.reduce((n,row)=>n+Number(row.signal_count||0),0),
    "• Atualizações de Ocean nas últimas 24 h: " + freshStates.length,
    "• Alertas pendentes registados: " + states.reduce((n,row)=>n+Number(row.pending_alert_count||0),0),
    ""
  ];
  if (freshStates.length) {
    lines.push("OCEANS ATUALIZADOS");
    for (const [index,row] of freshStates.slice(0,6).entries()) {
      lines.push((index+1)+". "+cleanText(row.ocean_key,140)+
        " · relevância "+score(row.max_relevance_score)+"/100"+
        " · comercial "+score(row.max_commercial_score)+"/100"+
        " · "+dateLabel(row.last_seen_at));
      lines.push("   "+cleanText(row.latest_summary,520));
      const themes = jsonArray(row.latest_theme_candidates_json).map(x=>cleanText(x,80)).filter(Boolean).slice(0,4);
      if (themes.length) lines.push("   Temas: "+themes.join(" · "));
      lines.push("");
    }
  } else {
    lines.push("OCEANS ATUALIZADOS", "Não foram encontrados estados de Ocean atualizados nas últimas 24 horas.", "");
  }
  const ideaSignals = rankedSignals.filter(row =>
    Math.max(score(row.relevance_score), score(row.commercial_score)) >= 35
  ).slice(0,5);
  lines.push("IDEIAS E PRÓXIMAS AÇÕES");
  if (ideaSignals.length) {
    for (const [index,row] of ideaSignals.entries()) {
      const themes = jsonArray(row.theme_candidates_json).map(x=>cleanText(x,100)).filter(Boolean).slice(0,3);
      const roots = urlList(row.evidence_roots_json,3);
      lines.push((index+1)+". "+cleanText(row.ocean_key,140)+
        " · relevância "+score(row.relevance_score)+"/100 · comercial "+score(row.commercial_score)+"/100");
      lines.push("   Sinal observado: "+cleanText(row.summary,420));
      if (themes.length) lines.push("   Ângulos possíveis: "+themes.join(" · "));
      lines.push("   Próximo passo: confirmar o sinal em pelo menos duas fontes independentes; identificar público afetado, problema concreto e uma proposta de conteúdo ou serviço antes de investir.");
      if (roots.length) lines.push("   Evidência registada: "+roots.join(" | "));
      lines.push("");
    }
  } else {
    const grounded = rankedObservations.filter(row => row.grounding_state === "grounded").slice(0,3);
    if (grounded.length) {
      lines.push("Ainda não há sinais de memória suficientemente pontuados. Pistas exploratórias para validação:");
      for (const [index,row] of grounded.entries()) {
        lines.push((index+1)+". "+cleanText(row.territory_key,100)+" — "+cleanText(row.response_excerpt,300));
        const citations = urlList(row.citations_json,2);
        if (citations.length) lines.push("   Confirmar: "+citations.join(" | "));
      }
      lines.push("   Não tratar estas pistas como oportunidades validadas; cruzar fontes independentes antes de publicar ou gastar dinheiro.","");
    } else {
      lines.push("Sem sinais suficientemente sustentados nesta janela. Verificar a recolha, as fontes e a memória antes de concluir que não existem oportunidades.","");
    }
  }
  if (commercial.length) {
    lines.push("SINAIS COM POSSÍVEL RELEVÂNCIA COMERCIAL");
    for (const [index,row] of commercial.entries()) {
      lines.push((index+1)+". "+cleanText(row.ocean_key,140)+
        " · score comercial "+score(row.commercial_score)+"/100"+
        " · "+dateLabel(row.observed_at));
      lines.push("   "+cleanText(row.summary,500));
      const roots = urlList(row.evidence_roots_json,3);
      if (roots.length) lines.push("   Evidência: "+roots.join(" | "));
      lines.push("");
    }
  } else {
    lines.push("SINAIS COM POSSÍVEL RELEVÂNCIA COMERCIAL", "Nenhum sinal novo atingiu o limiar editorial de 60/100 nesta janela.", "");
  }
  if (rankedObservations.length) {
    lines.push("OBSERVAÇÕES EXTERNAS A CONSULTAR");
    for (const [index,row] of rankedObservations.slice(0,8).entries()) {
      const grounded = row.grounding_state === "grounded";
      lines.push((index+1)+". "+cleanText(row.provider_id,80)+
        " · "+cleanText(row.territory_key,100)+
        " · "+(grounded ? "com grounding" : "exploratório / sem grounding")+
        " · "+dateLabel(row.observed_at));
      lines.push("   "+cleanText(row.response_excerpt,620));
      const citations = urlList(row.citations_json,3);
      if (citations.length) lines.push("   Fontes: "+citations.join(" | "));
      else lines.push("   Fontes citadas: nenhuma registada");
      lines.push("");
    }
  } else {
    lines.push("OBSERVAÇÕES EXTERNAS A CONSULTAR", "Não foram encontradas observações novas nas últimas 24 horas.", "");
  }
  if (usage.length) {
    const calls = usage.reduce((n,row)=>n+Number(row.calls||0),0);
    const failures = usage.reduce((n,row)=>n+Number(row.failures||0),0);
    const cost = usage.reduce((n,row)=>n+Number(row.reported_cost_usd||0),0);
    lines.push("OPERAÇÃO", "Chamadas contabilizadas no período de utilização disponível: "+calls+
      " · falhas: "+failures+" · custo reportado: $"+cost.toFixed(4)+" USD", "");
  }
  lines.push(
    "CRITÉRIO EDITORIAL",
    "Os sinais são pistas, não certezas. Confirma as fontes originais antes de decidir. Repetições da mesma fonte não contam como evidência independente.",
    "Este relatório é apenas informativo: não aprova, publica, altera preços nem executa ações comerciais.",
    "",
    "MAISON JF® · Oceans Radar autónomo · recolha D1 + envio de e-mail; sem chamadas ao ChatGPT/OpenAI."
  );
  return {date:local.date,text:lines.join("\n").slice(0,18000),counts:{
    observations:observations.length,
    signals:signals.length,
    freshOceans:freshStates.length,
    commercialSignals:commercial.length,
    states:states.length,
    usageRows:usage.length
  }};
}
async function sendEmail(apiKey, recipient, sender, report) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": "Bearer " + apiKey,
      "content-type": "application/json",
      "accept": "application/json",
      "Idempotency-Key": "maison-oceans-daily-brief-" + report.date
    },
    body: JSON.stringify({
      from: "MAISON JF Oceans Radar <" + sender + ">",
      to: [recipient],
      subject: "MAISON JF Oceans Radar · " + report.date,
      text: report.text,
      tags: [
        {name:"product",value:"maison-oceans-radar"},
        {name:"kind",value:"daily-brief"}
      ]
    })
  });
  if (!response.ok) throw new Error("resend_delivery_failed_http_" + response.status);
  const receipt = await response.json().catch(() => ({}));
  if (!receipt.id) throw new Error("resend_delivery_receipt_missing");
  return receipt.id;
}
async function main() {
  const eventName = String(process.env.GITHUB_EVENT_NAME || "workflow_dispatch");
  const dryRun = String(process.env.DRY_RUN || "true").toLowerCase() === "true";
  const enabled = String(process.env.OCEAN_BRIEFING_ENABLED || "").toLowerCase() === "true";
  const now = new Date();
  const local = lisbonParts(now);
  if (eventName === "schedule") {
    console.log("Scheduled briefing trigger accepted. " +
      "Lisbon local time: " + local.date + " " + local.hour + ":" + local.minute +
      ". The daily Resend idempotency key prevents duplicate delivery.");
  }
  if (eventName === "schedule" && !enabled) {
    console.log("Skipped: daily delivery is disabled until OCEAN_BRIEFING_ENABLED=true.");
    return;
  }
  if (!dryRun && !enabled) throw new Error("Sending is disabled. Set OCEAN_BRIEFING_ENABLED=true only after testing.");
  const accountId = required("CLOUDFLARE_ACCOUNT_ID");
  const readToken = required("CLOUDFLARE_READ_API_TOKEN");
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const usageSince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0,10);
  const [observations, signals, states, observationStats, signalStats, usage] = await Promise.all([
    queryD1(accountId,readToken,
      "SELECT observation_id,provider_id,model_id,source_class,territory_key,grounding_state,response_excerpt,citations_json,observed_at FROM external_intelligence_observations WHERE observed_at >= ? ORDER BY observed_at DESC LIMIT 100",[since]),
    queryD1(accountId,readToken,
      "SELECT signal_id,ocean_key,signal_kind,source_ref,source_observation_id,summary,evidence_roots_json,theme_candidates_json,relevance_score,commercial_score,observed_at FROM ocean_memory_signals WHERE observed_at >= ? ORDER BY MAX(relevance_score,commercial_score) DESC,observed_at DESC LIMIT 100",[since]),
    queryD1(accountId,readToken,
      "SELECT ocean_key,lifecycle_state,signal_count,independent_evidence_count,max_relevance_score,max_commercial_score,latest_summary,latest_theme_candidates_json,latest_commercial_adjacency_json,last_seen_at,promotion_gate_state,pending_alert_count FROM brain_ocean_memory_feed ORDER BY last_seen_at DESC LIMIT 100"),
    queryD1(accountId,readToken,
      "SELECT COUNT(*) AS observations,MAX(observed_at) AS latest_observation FROM external_intelligence_observations"),
    queryD1(accountId,readToken,
      "SELECT COUNT(*) AS signals,MAX(observed_at) AS latest_signal FROM ocean_memory_signals"),
    queryD1(accountId,readToken,
      "SELECT usage_date,provider_id,calls,failures,reported_cost_usd,updated_at FROM external_intelligence_daily_usage WHERE usage_date >= ? ORDER BY usage_date DESC,updated_at DESC LIMIT 40",[usageSince])
  ]);
  const report = makeReport({
    now, observations, signals, states,
    stats: { ...(observationStats[0]||{}), ...(signalStats[0]||{}) },
    usage
  });
  if (dryRun) {
    console.log("DRY RUN: daily report assembled; body intentionally not printed to public Actions logs.");
    console.log(JSON.stringify({date:report.date,counts:report.counts,send:false}));
    return;
  }
  const configuredRecipient = String(process.env.OCEAN_BRIEFING_EMAIL_TO || "").trim();
  // Radar delivery is intentionally restricted to the active inbox. Never send to the retired Maison JF inbox.
  const recipient = "jfadario@pm.me";
  if (configuredRecipient.toLowerCase() !== recipient) {
    console.warn("Configured recipient is blank or differs from the approved Radar inbox; safely routing only to jfadario@pm.me.");
  }
  const sender = required("OCEAN_BRIEFING_EMAIL_FROM");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("OCEAN_BRIEFING_EMAIL_TO is not a valid email address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) throw new Error("OCEAN_BRIEFING_EMAIL_FROM is not a valid email address.");
  const resendKey = required("OCEAN_BRIEFING_RESEND_API_KEY");
  const resendId = await sendEmail(resendKey,recipient,sender,report);
  console.log("Daily briefing accepted by Resend. Body withheld from logs. "+JSON.stringify({date:report.date,resendId,counts:report.counts}));
}
main().catch(error=>{
  console.error("Oceans daily briefing failed: "+String(error?.message||"unknown_error").slice(0,180));
  process.exitCode=1;
});
