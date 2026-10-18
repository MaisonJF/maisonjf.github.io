import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AUTHORIZED_EMAIL = 'maisonjf@proton.me';
const AUTHORIZED_EMAIL_SHA256 = '0f63626f4bb200dcea81d29de36dd74809ead3260de742f69c41465085815dd8';
const $ = id => document.getElementById(id);
const loginSection = $('login');
const grantsSection = $('grants');
const status = $('status');
let supabase = null;
let grants = [];

function say(message) { status.textContent = message || ''; }
function showLoggedOut() { loginSection.classList.remove('hidden'); grantsSection.classList.add('hidden'); }
function showLoggedIn() { loginSection.classList.add('hidden'); grantsSection.classList.remove('hidden'); }

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value).trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function config() {
  const response = await fetch('/api/sos/config', {
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('A autenticação está temporariamente indisponível.');
  const result = await response.json();
  if (!result?.available || !result.supabaseUrl || !result.supabasePublishableKey) {
    throw new Error('A autenticação está temporariamente indisponível.');
  }
  return result;
}

function userGrantList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.grants)) return data.grants;
  return [];
}
function clientName(grant) {
  return String(grant?.client_name || grant?.client?.name || grant?.name || 'Aplicação sem nome');
}
function isChatGPTGrant(grant) {
  return /chatgpt|openai/i.test(clientName(grant));
}
function formatDate(value) {
  if (!value) return 'data não disponível';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' });
}

function renderGrants() {
  const list = $('grantList');
  list.replaceChildren();
  if (!grants.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Não foram encontradas autorizações OAuth nesta conta.';
    list.append(empty);
    $('revokeSelected').disabled = true;
    return;
  }
  $('revokeSelected').disabled = false;
  for (const grant of grants) {
    const wrapper = document.createElement('article');
    wrapper.className = 'grant';
    const head = document.createElement('div');
    head.className = 'grant-head';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'grant-checkbox';
    checkbox.dataset.clientId = String(grant?.client_id || '');
    checkbox.checked = isChatGPTGrant(grant);
    checkbox.disabled = !grant?.client_id;
    checkbox.setAttribute('aria-label', 'Selecionar autorização ' + clientName(grant));
    const body = document.createElement('div');
    body.style.flex = '1';
    const title = document.createElement('div');
    title.className = 'grant-name';
    title.textContent = clientName(grant);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const scopes = Array.isArray(grant?.scopes) ? grant.scopes.join(', ') : String(grant?.scope || 'permissões não especificadas');
    meta.textContent = 'Permissões: ' + scopes + ' · Criada: ' + formatDate(grant?.created_at || grant?.granted_at);
    body.append(title, meta);
    head.append(checkbox, body);
    wrapper.append(head);
    list.append(wrapper);
  }
  if (!grants.some(isChatGPTGrant)) {
    const note = document.createElement('p');
    note.textContent = 'Não encontrei uma autorização cujo nome contenha ChatGPT ou OpenAI. Vê a lista acima; nenhuma autorização foi revogada automaticamente.';
    list.prepend(note);
  }
}

async function loadGrants() {
  say('A consultar as autorizações do Supabase…');
  const { data, error } = await supabase.auth.oauth.getUserGrants();
  if (error) throw new Error('Não foi possível consultar as autorizações. Verifica se o servidor OAuth do Supabase está ativo.');
  grants = userGrantList(data);
  renderGrants();
  say(grants.length ? 'Foram encontradas ' + grants.length + ' autorização(ões). Nenhuma alteração foi feita.' : 'Não há autorizações a revogar nesta conta.');
}

async function verifySignedInUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.email || await sha256(data.user.email) !== AUTHORIZED_EMAIL_SHA256) {
    await supabase.auth.signOut().catch(() => {});
    throw new Error('A sessão não pertence à conta autorizada ' + AUTHORIZED_EMAIL + '.');
  }
  return data.user;
}

async function boot() {
  try {
    const cfg = await config();
    supabase = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data?.session) {
      showLoggedOut();
      say('Envia o link e autentica-te com a conta antiga para gerir as suas autorizações.');
      return;
    }
    await verifySignedInUser();
    showLoggedIn();
    await loadGrants();
  } catch (error) {
    showLoggedOut();
    say(String(error?.message || 'Não foi possível abrir a gestão de autorizações.').slice(0, 300));
  }
}

$('sendLink').addEventListener('click', async () => {
  if (!supabase) {
    say('A preparar a autenticação…');
    try {
      const cfg = await config();
      supabase = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    } catch (error) {
      say(error?.message || 'Não foi possível preparar a autenticação.');
      return;
    }
  }
  say('A enviar o link seguro…');
  const { error } = await supabase.auth.signInWithOtp({
    email: AUTHORIZED_EMAIL,
    options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false }
  });
  if (error) {
    say('Não foi possível enviar o link. Confirma que tens acesso ao email e que o utilizador existe no Supabase.');
    return;
  }
  say('Link enviado para ' + AUTHORIZED_EMAIL + '. Abre-o neste dispositivo e volta a esta página.');
});

$('revokeSelected').addEventListener('click', async () => {
  const selected = [...document.querySelectorAll('.grant-checkbox:checked')];
  const clientIds = [...new Set(selected.map(input => input.dataset.clientId).filter(Boolean))];
  if (!clientIds.length) {
    say('Nenhuma autorização selecionada. Não alterámos nada.');
    return;
  }
  const selectedNames = selected.map(input => input.closest('.grant')?.querySelector('.grant-name')?.textContent || 'Aplicação');
  const message = 'Vais revogar ' + clientIds.length + ' autorização(ões):\n\n' +
    selectedNames.map(name => '• ' + name).join('\n') +
    '\n\nO Supabase invalidará as sessões e os tokens de atualização dessas aplicações. Continuar?';
  if (!confirm(message)) return;
  $('revokeSelected').disabled = true;
  let revoked = 0;
  for (const clientId of clientIds) {
    const { error } = await supabase.auth.oauth.revokeGrant(clientId);
    if (error) {
      $('revokeSelected').disabled = false;
      say('Foram revogadas ' + revoked + ' autorização(ões); houve uma falha na seguinte. Atualiza a lista para confirmar o estado.');
      return;
    }
    revoked += 1;
  }
  say('Revogação concluída para ' + revoked + ' autorização(ões) selecionada(s). A atualizar a lista…');
  try { await loadGrants(); }
  catch (error) { say('A revogação foi enviada, mas não consegui atualizar a lista. ' + String(error?.message || '').slice(0, 160)); }
  $('revokeSelected').disabled = false;
});

$('reload').addEventListener('click', async () => {
  try { await verifySignedInUser(); await loadGrants(); }
  catch (error) { say(error?.message || 'Não foi possível atualizar a lista.'); }
});
$('signOut').addEventListener('click', async () => {
  if (supabase) await supabase.auth.signOut().catch(() => {});
  showLoggedOut();
  say('Sessão terminada neste navegador.');
});

boot();
