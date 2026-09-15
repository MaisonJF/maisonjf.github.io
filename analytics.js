(() => {
  'use strict';

  const MEASUREMENT_ID = 'G-3W8B4L5QWP';
  const CONSENT_KEY = 'maison_analytics_consent_v1';
  let googleLoaded = false;
  const queuedEvents = Array.isArray(window.__maisonAnalyticsQueue) ? window.__maisonAnalyticsQueue.splice(0) : [];

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  function loadGoogle() {
    if (googleLoaded) return;
    googleLoaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(script);
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  function track(name, parameters = {}) {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted') return;
    loadGoogle();
    window.gtag('event', name, parameters);
  }

  window.maisonAnalytics = { track };
  queuedEvents.forEach(([name, parameters]) => track(name, parameters));

  function saveConsent(value) {
    localStorage.setItem(CONSENT_KEY, value);
    if (value === 'granted') loadGoogle();
    else window.gtag('consent', 'update', { analytics_storage: 'denied' });
    document.querySelector('.maison-consent')?.remove();
    showPreferencesControl();
  }

  function showPreferencesControl() {
    if (document.querySelector('.maison-consent-settings')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'maison-consent-settings';
    button.textContent = 'Gerir cookies';
    button.setAttribute('aria-label', 'Alterar preferências de cookies');
    button.addEventListener('click', () => {
      localStorage.removeItem(CONSENT_KEY);
      button.remove();
      showConsent();
    });
    const footer = document.querySelector('.footer__bottom, footer');
    (footer || document.body).appendChild(button);
  }

  function showConsent() {
    const banner = document.createElement('aside');
    banner.className = 'maison-consent';
    banner.setAttribute('aria-label', 'Cookies');
    banner.innerHTML = '<div class="maison-consent__copy"><span>Usamos cookies de medição apenas com a tua autorização. <a href="/informacao-legal.html#privacidade">Privacidade</a></span></div><div class="maison-consent__actions"><button type="button" data-consent="denied">Recusar</button><button type="button" data-consent="granted">Aceitar</button></div>';
    banner.addEventListener('click', event => {
      const button = event.target.closest('[data-consent]');
      if (button) saveConsent(button.dataset.consent);
    });
    document.body.appendChild(banner);
  }

  function classify(link) {
    const href = link.getAttribute('href') || '';
    const lowerHref = href.toLowerCase();
    const text = (link.textContent || '').trim().slice(0, 100);
    const lowerText = text.toLowerCase();

    if (lowerHref.includes('wa.me/')) {
      let service = 'general';
      if (lowerHref.includes('sos') || lowerText.includes('sos')) service = 'sos';
      else if (lowerHref.includes('escuta') || lowerText.includes('escuta')) service = 'escuta';
      else if (lowerHref.includes('tarot') || lowerText.includes('tarot') || lowerText.includes('consulta')) service = 'tarot';
      else if (lowerHref.includes('produto') || lowerText.includes('vela') || lowerText.includes('névoa') || lowerText.includes('nevoa') || lowerText.includes('escalda') || lowerText.includes('óleo') || lowerText.includes('oleo')) service = 'product';
      track('whatsapp_click', { service, link_text: text });
      track('generate_lead', { method: 'whatsapp', service });
    }

    if (lowerHref.includes('checkout') && !lowerHref.includes('sucesso')) track('begin_checkout', { link_text: text });
    if (lowerHref.includes('/produtos/') || lowerHref.includes('produto-') || lowerHref.includes('produtos.html')) track('product_interest', { link_url: href.split('?')[0], link_text: text });
    if (lowerHref.includes('/servicos/#escuta') || lowerHref.includes('servicos.html#escuta')) track('escuta_interest', { link_text: text });
    if (lowerHref.includes('/servicos/#acompanhamento') || lowerHref.includes('servicos.html#acompanhamento') || lowerText.includes('sos')) track('sos_interest', { link_text: text });
    if (lowerHref.includes('/servicos/#tarot') || lowerHref.includes('servicos.html#tarot')) track('tarot_interest', { link_text: text });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'granted') loadGoogle();
    else if (consent !== 'denied') showConsent();
    if (consent === 'granted' || consent === 'denied') showPreferencesControl();

    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (link) classify(link);
    }, { capture: true });
  });
})();
