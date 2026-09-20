(() => {
  'use strict';

  const languageScript = document.createElement('script');
  languageScript.src = '/maison-language.js?v=20260920-pre90';
  languageScript.defer = true;
  document.head.appendChild(languageScript);

  const MEASUREMENT_ID = 'G-3W8B4L5QWP';
  const CONSENT_KEY = 'maison_analytics_consent_v1';
  const ATTRIBUTION_KEY = 'maison_offer_attribution_v1';
  const ATTRIBUTION_TTL = 24 * 60 * 60 * 1000;
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

  function cleanInternalHref(rawHref) {
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) return rawHref;
    try {
      const url = new URL(rawHref, window.location.href);
      if (url.origin !== window.location.origin) return rawHref;
      if (!url.pathname.endsWith('.html')) return rawHref;
      url.pathname = url.pathname.replace(/\.html$/, '');
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return rawHref;
    }
  }

  function normalizeInternalLinks(root = document) {
    root.querySelectorAll?.('a[href]').forEach(link => {
      const current = link.getAttribute('href');
      const clean = cleanInternalHref(current);
      if (clean && clean !== current) link.setAttribute('href', clean);
    });
  }

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

  function captureOfferAttribution() {
    try {
      const query = new URLSearchParams(window.location.search);
      if (query.get('mj_source') !== 'vpc') return;
      const payload = {
        source: 'vpc',
        offer: String(query.get('mj_offer') || '').slice(0, 80),
        result: String(query.get('mj_result') || '').slice(0, 40),
        route: String(query.get('mj_route') || '').slice(0, 40),
        brain: String(query.get('mj_brain') || '').slice(0, 80),
        ts: Date.now()
      };
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function offerAttribution() {
    try {
      const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      if (!data || !data.ts || Date.now() - Number(data.ts) > ATTRIBUTION_TTL) {
        sessionStorage.removeItem(ATTRIBUTION_KEY);
        return {};
      }
      return {
        recommendation_source: data.source || '',
        recommendation_offer: data.offer || '',
        recommendation_result: data.result || '',
        recommendation_route: data.route || '',
        recommendation_brain: data.brain || ''
      };
    } catch (_) {
      return {};
    }
  }

  function track(name, parameters = {}) {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted') return;
    loadGoogle();
    window.gtag('event', name, { ...offerAttribution(), ...parameters });
  }

  captureOfferAttribution();
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
    const footer = document.querySelector('.footer__legal') || document.querySelector('.footer__bottom') || document.querySelector('footer');
    (footer || document.body).appendChild(button);
  }

  function showConsent() {
    const banner = document.createElement('aside');
    banner.className = 'maison-consent';
    banner.setAttribute('aria-label', 'Cookies');
    banner.innerHTML = '<div class="maison-consent__copy"><span>Usamos cookies de medição apenas com a tua autorização. <a href="/informacao-legal#privacidade">Privacidade</a></span></div><div class="maison-consent__actions"><button type="button" data-consent="denied">Recusar</button><button type="button" data-consent="granted">Aceitar</button></div>';
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
    if (lowerHref.includes('/contacto/?interesse=')) {
      const match = href.match(/[?&]interesse=([^&#]+)/i);
      const interest = match ? decodeURIComponent(match[1]) : 'general';
      track('service_interest', { service: interest, link_text: text });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    normalizeInternalLinks();

    // Maison mobile navigation: progressive enhancement, no page-specific markup required.
    const header = document.querySelector('.site-header');
    if (header && !header.querySelector('.maison-menu-toggle')) {
      const nav = header.querySelector('nav');
      if (nav) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'maison-menu-toggle';
        toggle.setAttribute('aria-label', 'Abrir menu');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<span aria-hidden="true"></span>';
        header.insertBefore(toggle, nav);

        const closeMenu = () => {
          header.classList.remove('site-header--menu-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.setAttribute('aria-label', 'Abrir menu');
        };
        toggle.addEventListener('click', () => {
          const open = header.classList.toggle('site-header--menu-open');
          toggle.setAttribute('aria-expanded', String(open));
          toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        });
        nav.addEventListener('click', event => {
          if (event.target.closest('a')) closeMenu();
        });
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape') closeMenu();
        });
      }
    }
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.matches?.('a[href]')) {
            const current = node.getAttribute('href');
            const clean = cleanInternalHref(current);
            if (clean && clean !== current) node.setAttribute('href', clean);
          }
          normalizeInternalLinks(node);
        }
      }));
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'granted') loadGoogle();
    else if (consent !== 'denied') showConsent();
    if (consent === 'granted' || consent === 'denied') showPreferencesControl();

    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (link) {
        const current = link.getAttribute('href');
        const clean = cleanInternalHref(current);
        if (clean && clean !== current) link.setAttribute('href', clean);
        classify(link);
      }
    }, { capture: true });
  });
})();
