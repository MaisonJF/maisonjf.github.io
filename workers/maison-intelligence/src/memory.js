function enabled(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function safeBridgeUrl(raw) {
  const url = new URL(String(raw || '').trim());
  if (url.protocol !== 'https:') throw new Error('osiris_memory_bridge_https_required');
  return url.toString();
}

export function osirisMemoryBridgeConfigured(env) {
  return enabled(env.OSIRIS_MEMORY_ENABLED)
    && Boolean(env.OSIRIS_MEMORY_BRIDGE_URL)
    && Boolean(env.OSIRIS_MEMORY_BRIDGE_TOKEN);
}

export function buildOsirisMemoryEnvelope(observation = {}) {
  return {
    schema: 'maison.osiris-memory.observation.v1',
    source: 'maison-a13',
    observation_id: observation.observationId,
    event_id: observation.eventId,
    provider_id: observation.providerId,
    model_id: observation.modelId ?? null,
    source_class: observation.sourceClass,
    territory_key: observation.territoryKey,
    grounding_state: observation.groundingState,
    observed_at: observation.observedAt,
    confidence_class: observation.confidenceClass,
    independent_evidence_roots: observation.citations?.length ?? 0,
    citations: observation.citations ?? [],
    text: observation.safeText
  };
}

export async function mirrorToOsirisMemory(env, observation) {
  if (!osirisMemoryBridgeConfigured(env)) return { skipped: 'osiris_memory_disabled' };

  const url = safeBridgeUrl(env.OSIRIS_MEMORY_BRIDGE_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OSIRIS_MEMORY_BRIDGE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildOsirisMemoryEnvelope(observation)),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`osiris_memory_bridge_http_${response.status}`);
    return { mirrored: true };
  } finally {
    clearTimeout(timer);
  }
}
