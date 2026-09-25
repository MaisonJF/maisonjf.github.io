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
  const ACQUISITION_KEY = 'maison_acquisition_attribution_v1';
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

  function captureAcquisitionAttribution() {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted') return;
    try {
      if (sessionStorage.getItem(ACQUISITION_KEY)) return;
      const query = new URLSearchParams(window.location.search);
      let referrerHost = '';
      try { referrerHost = document.referrer ? new URL(document.referrer).hostname.slice(0,120) : ''; } catch (_) {}
      const data = {
        referrer: referrerHost,
        landing: window.location.pathname.slice(0,180),
        utm_source: String(query.get('utm_source') || '').slice(0,100),
        utm_medium: String(query.get('utm_medium') || '').slice(0,100),
        utm_campaign: String(query.get('utm_campaign') || '').slice(0,140),
        ts: Date.now()
      };
      sessionStorage.setItem(ACQUISITION_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function acquisitionAttribution() {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted') return {};
    try {
      const raw = sessionStorage.getItem(ACQUISITION_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      if (!data || !data.ts || Date.now() - Number(data.ts) > ATTRIBUTION_TTL) return {};
      return {
        acquisition_referrer: data.referrer || '',
        acquisition_landing: data.landing || '',
        acquisition_utm_source: data.utm_source || '',
        acquisition_utm_medium: data.utm_medium || '',
        acquisition_utm_campaign: data.utm_campaign || ''
      };
    } catch (_) { return {}; }
  }

  function getAttribution() {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted') return {};
    return { ...offerAttribution(), ...acquisitionAttribution() };
  }

  const GROWTH_TOKEN_RE = /^[A-Za-z0-9._:/@+-]{1,120}$/;
  let growthStarted = false;
  let growthPageViewSent = false;
  const growthOfferExposureSent = new Set();

  function growthToken(value, maxLength = 120) {
    const token = String(value || '').trim();
    if (!token || token.length > maxLength || !GROWTH_TOKEN_RE.test(token)) return '';
    return token;
  }

  function growthPath(raw = window.location.pathname) {
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) return '';
      let path = url.pathname || '/';
      if (path.endsWith('.html')) path = path.replace(/\.html$/, '');
      return path || '/';
    } catch (_) {
      return '';
    }
  }

  function growthSurface() {
    const explicit = growthToken(document.body?.dataset?.maisonSurface || '', 80);
    if (explicit) return explicit;
    const segment = growthPath().split('/').filter(Boolean)[0] || 'home';
    return growthToken(segment.replace(/[^A-Za-z0-9._:/@+-]+/g, '_'), 80) || 'page';
  }

  function growthReferrerHost() {
    try {
      if (!document.referrer) return '';
      const host = new URL(document.referrer).hostname.toLowerCase().replace(/\.$/, '');
      return /^[A-Za-z0-9.-]{1,255}$/.test(host) ? host : '';
    } catch (_) {
      return '';
    }
  }

  function growthCampaignId() {
    try {
      return growthToken(new URLSearchParams(window.location.search).get('utm_campaign') || '');
    } catch (_) {
      return '';
    }
  }

  function growthOfferContext(element = null) {
    const attribution = offerAttribution();
    const dataOffer = growthToken(
      element?.dataset?.maisonOfferId ||
      element?.closest?.('[data-maison-offer-id]')?.dataset?.maisonOfferId ||
      ''
    );
    const offerId = dataOffer || growthToken(attribution.recommendation_offer || '');
    if (!offerId) return null;
    const context = {
      path: growthPath(),
      surface: growthToken(
        element?.dataset?.maisonSurface ||
        element?.closest?.('[data-maison-surface]')?.dataset?.maisonSurface ||
        growthSurface(),
        80
      ) || 'page',
      offer_id: offerId
    };
    const optional = {
      recommendation_source: attribution.recommendation_source,
      recommendation_result: attribution.recommendation_result,
      recommendation_route: attribution.recommendation_route,
      recommendation_brain: attribution.recommendation_brain
    };
    Object.entries(optional).forEach(([key, value]) => {
      const safe = growthToken(value || '');
      if (safe) context[key] = safe;
    });
    return context;
  }

  function growthEventKey() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    if (!window.crypto?.getRandomValues) return '';
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  function trackGrowth(eventType, metadata) {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted') return;
    const eventKey = growthEventKey();
    if (!eventKey) return;
    fetch('/api/site-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        event_type: eventType,
        event_key: eventKey,
        consent: true,
        metadata
      })
    }).catch(() => {});
  }

  function emitGrowthPageView() {
    if (growthPageViewSent || localStorage.getItem(CONSENT_KEY) !== 'granted') return;
    const path = growthPath();
    if (!path) return;
    const metadata = { path, surface: growthSurface() };
    const referrer = growthReferrerHost();
    const campaign = growthCampaignId();
    if (referrer) metadata.referrer_host = referrer;
    if (campaign) metadata.campaign_id = campaign;
    trackGrowth('page.view', metadata);
    growthPageViewSent = true;

    const offer = growthOfferContext();
    if (offer && !growthOfferExposureSent.has(offer.offer_id)) {
      trackGrowth('offer.exposure', offer);
      growthOfferExposureSent.add(offer.offer_id);
    }
  }

  function observeGrowthOffers() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
        const offer = growthOfferContext(entry.target);
        if (!offer || growthOfferExposureSent.has(offer.offer_id)) return;
        trackGrowth('offer.exposure', offer);
        growthOfferExposureSent.add(offer.offer_id);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-maison-offer-id]').forEach(element => observer.observe(element));
  }

  function startGrowthTelemetry() {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted' || growthStarted) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startGrowthTelemetry, { once: true });
      return;
    }
    growthStarted = true;
    emitGrowthPageView();
    observeGrowthOffers();
  }

  function growthStructuralId(prefix, value) {
    const safe = String(value || '').replace(/[^A-Za-z0-9._:/@+-]+/g, '_').slice(0, 100);
    return growthToken(prefix + ':' + (safe || 'unknown'));
  }

  function trackGrowthLink(link) {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted') return;
    const raw = link.getAttribute('href') || '';
    let target = null;
    try { target = new URL(raw, window.location.href); } catch (_) {}

    const currentPath = growthPath();
    const surface = growthSurface();

    if (target && target.origin === window.location.origin) {
      const targetPath = growthPath(target.href);
      if (targetPath) {
        const area = link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'main';
        const explicitNav = growthToken(link.dataset.navigationId || link.dataset.maisonNavigationId || '');
        const navigationId = explicitNav || growthStructuralId(area, targetPath);
        if (navigationId) {
          trackGrowth('navigation.click', {
            path: currentPath,
            navigation_id: navigationId,
            target_path: targetPath,
            surface
          });
        }
      }
    }

    const isCta = link.matches('.button,.btn,[data-cta-id],[data-maison-cta]') ||
      Boolean(link.closest('[data-maison-offer-id]'));
    if (!isCta) return;

    let ctaId = growthToken(link.dataset.ctaId || link.dataset.maisonCta || link.id || '');
    if (!ctaId) {
      if ((target?.hostname || '').toLowerCase() === 'wa.me') ctaId = 'cta:whatsapp';
      else if (raw.toLowerCase().includes('checkout')) ctaId = 'cta:checkout';
      else ctaId = growthStructuralId('cta', target && target.origin === window.location.origin ? growthPath(target.href) : 'external');
    }
    if (ctaId) {
      const metadata = { path: currentPath, cta_id: ctaId, surface };
      const campaign = growthCampaignId();
      if (campaign) metadata.campaign_id = campaign;
      trackGrowth('cta.click', metadata);
    }

    const offer = growthOfferContext(link);
    if (offer) trackGrowth('offer.click', offer);
  }

  function track(name, parameters = {}) {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted') return;
    loadGoogle();
    window.gtag('event', name, { ...getAttribution(), ...parameters });
  }

  captureOfferAttribution();
  captureAcquisitionAttribution();
  window.maisonAnalytics = { track, getAttribution };
  queuedEvents.forEach(([name, parameters]) => track(name, parameters));

  function saveConsent(value) {
    localStorage.setItem(CONSENT_KEY, value);
    if (value === 'granted') { loadGoogle(); captureAcquisitionAttribution(); startGrowthTelemetry(); }
    else window.gtag('consent', 'update', { analytics_storage: 'denied' });
    document.querySelector('.maison-consent')?.remove();
    showPreferencesControl();
  }

  function ensurePreferencesControlStyles() {
    if (document.getElementById('maison-consent-settings-style')) return;
    const style = document.createElement('style');
    style.id = 'maison-consent-settings-style';
    style.textContent = [
      '.maison-consent-settings{appearance:none;-webkit-appearance:none;border:0;background:transparent;padding:0;color:rgba(245,241,233,.58);cursor:pointer;font:500 11px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase;text-align:left;text-decoration:none!important;text-underline-offset:0;transition:color .2s ease}',
      '.maison-consent-settings:hover{color:#fff}',
      '.maison-consent-settings:focus-visible{color:#fff;outline:1px solid rgba(199,170,115,.68);outline-offset:4px}',
      '.maison-consent-settings-item{list-style:none}',
      '.home-footer__group nav .maison-consent-settings{font-size:11px}',
      'footer nav .maison-consent-settings{font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit;text-decoration:none!important}',
      '.footer__links .maison-consent-settings{font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit}',
      '.maison-consent-settings--standalone{display:block;width:max-content;max-width:calc(100% - 36px);margin:34px auto 24px;color:rgba(245,241,233,.42);font-size:10px}',
      '@media(max-width:700px){.maison-consent-settings--standalone{margin-top:28px;margin-bottom:20px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function showPreferencesControl() {
    if (document.querySelector('.maison-consent-settings')) return;
    ensurePreferencesControlStyles();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'maison-consent-settings';
    button.textContent = 'Preferências de cookies';
    button.setAttribute('aria-label', 'Alterar preferências de cookies');
    button.addEventListener('click', () => {
      localStorage.removeItem(CONSENT_KEY);
      const item = button.closest('.maison-consent-settings-item');
      if (item) item.remove();
      else button.remove();
      showConsent();
    });

    const homeMaisonNav = document.querySelector('.home-footer__group nav[aria-label="Maison"]');
    if (homeMaisonNav) {
      button.classList.add('maison-consent-settings--nav');
      homeMaisonNav.appendChild(button);
      return;
    }

    const legalLink = document.querySelector('footer a[href*="informacao-legal"]');
    const footerList = legalLink?.closest('.footer__links');
    if (footerList) {
      const item = document.createElement('li');
      item.className = 'maison-consent-settings-item';
      button.classList.add('footer__link', 'maison-consent-settings--nav');
      item.appendChild(button);
      footerList.appendChild(item);
      return;
    }

    const genericFooterNav = document.querySelector('footer nav');
    if (genericFooterNav) {
      button.classList.add('maison-consent-settings--nav');
      genericFooterNav.appendChild(button);
      return;
    }

    button.classList.add('maison-consent-settings--standalone');
    (document.querySelector('main') || document.body).appendChild(button);
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
    if (consent === 'granted') { loadGoogle(); startGrowthTelemetry(); }
    else if (consent !== 'denied') showConsent();
    if (consent === 'granted' || consent === 'denied') showPreferencesControl();

    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (link) {
        const current = link.getAttribute('href');
        const clean = cleanInternalHref(current);
        if (clean && clean !== current) link.setAttribute('href', clean);
        classify(link);
        trackGrowthLink(link);
      }
    }, { capture: true });
  });
})();
