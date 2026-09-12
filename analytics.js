(() => {
  'use strict';

  const MEASUREMENT_ID = 'G-3W8B4L5QWP';
  const CONSENT_KEY = 'maison_analytics_consent_v1';
  let googleLoaded = false;

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
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
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
    const footer = document.querySelector('.footer__bottom');
    (footer || document.body).appendChild(button);
  }

  function showConsent() {
    const banner = document.createElement('aside');
    banner.className = 'maison-consent';
    banner.setAttribute('aria-label', 'Cookies');
    banner.innerHTML = `
      <div class="maison-consent__copy">
        <span>Usamos cookies para melhorar a experiência.</span>
      </div>
      <div class="maison-consent__actions">
        <button type="button" data-consent="denied">Recusar</button>
        <button type="button" data-consent="granted">Aceitar</button>
      </div>`;
    banner.addEventListener('click', event => {
      const button = event.target.closest('[data-consent]');
      if (button) saveConsent(button.dataset.consent);
    });
    document.body.appendChild(banner);
  }

  function classify(link) {
    const href = link.getAttribute('href') || '';
    const text = (link.textContent || '').trim().slice(0, 100);
    if (/wa\.me\//i.test(href)) {
      let service = 'general';
      if (/sos/i.test(href + text)) service = 'sos';
      else if (/escuta/i.test(href + text)) service = 'escuta';
      else if (/tarot|consulta/i.test(href + text)) service = 'tarot';
      else if (/produto|vela|bruma|escalda|óleo|oleo|wax|mikado/i.test(href + text)) service = 'product';
      track('whatsapp_click', { service, link_text: text });
      track('generate_lead', { method: 'whatsapp', service });
    }
    if (/checkout/i.test(href) && !/sucesso/i.test(href)) track('begin_checkout', { link_text: text });
    if (/produto-|produtos\.html/i.test(href)) track('product_interest', { link_url: href.split('?')[0], link_text: text });
    if (/servicos\.html#escuta/i.test(href)) track('escuta_interest', { link_text: text });
    if (/servicos\.html#acompanhamento/i.test(href) || /\bSOS\b/i.test(text)) track('sos_interest', { link_text: text });
    if (/servicos\.html#tarot/i.test(href)) track('tarot_interest', { link_text: text });
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
