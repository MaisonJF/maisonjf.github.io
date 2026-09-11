/**
 * MAISON JF® — Main JavaScript
 * Navegação, experiência e camada de conversão.
 */
(function() {
  'use strict';

  const WA_NUMBER = '351923318289';
  const header = document.getElementById('header');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  // ============================================================
  // CONVERSION CSS
  // ============================================================
  if (!document.querySelector('link[href="conversion.css"]')) {
    const conversionStyles = document.createElement('link');
    conversionStyles.rel = 'stylesheet';
    conversionStyles.href = 'conversion.css';
    document.head.appendChild(conversionStyles);
  }

  // ============================================================
  // HEADER SCROLL EFFECT
  // ============================================================
  function handleScroll() {
    if (!header) return;
    const scrollY = window.scrollY || window.pageYOffset;
    header.classList.toggle('header--scrolled', scrollY > 50);
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // ============================================================
  // MOBILE MENU
  // ============================================================
  const menuToggle = document.getElementById('menuToggle');
  const menuClose = document.getElementById('menuClose');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('.mobile-menu__link') : [];

  function openMenu() {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.classList.add('mobile-menu--open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.classList.remove('mobile-menu--open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (menuToggle) menuToggle.addEventListener('click', openMenu);
  if (menuClose) menuClose.addEventListener('click', closeMenu);

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('mobile-menu--open')) {
      closeMenu();
    }
  });

  // ============================================================
  // SMOOTH SCROLL
  // ============================================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      }
    });
  });

  // ============================================================
  // SCROLL REVEAL
  // ============================================================
  const revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('reveal--visible'));
  }

  // ============================================================
  // PARALLAX SUAVE NO HERO
  // ============================================================
  const heroBg = document.querySelector('.hero__bg-image');

  if (heroBg && !prefersReducedMotion && !isTouchDevice) {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          heroBg.style.transform = `translateY(${window.scrollY * 0.25}px)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ============================================================
  // IDENTIDADE VISUAL | SÍMBOLO JF + FAROL
  // ============================================================
  const maisonMark = document.querySelector('.joao__visual-monogram');
  if (maisonMark) {
    maisonMark.style.backgroundImage = "url('maison-jf-mark.svg')";
    maisonMark.style.backgroundSize = 'contain';
    maisonMark.style.backgroundPosition = 'center';
    maisonMark.style.backgroundRepeat = 'no-repeat';
    maisonMark.style.backgroundColor = '#080808';
    maisonMark.style.border = '1px solid rgba(196,162,101,.24)';
    maisonMark.removeAttribute('aria-hidden');
    maisonMark.setAttribute('role', 'img');
    maisonMark.setAttribute('aria-label', 'Símbolo MAISON JF® — monograma JF com Farol');

    maisonMark.querySelectorAll('.joao__visual-initials, .joao__visual-label').forEach(el => {
      el.style.display = 'none';
    });
  }

  // ============================================================
  // PERFORMANCE BÁSICA
  // ============================================================
  document.querySelectorAll('img').forEach((img, index) => {
    if (index > 0 && !img.hasAttribute('loading')) img.loading = 'lazy';
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
  });

  // ============================================================
  // CAMADA DE CONVERSÃO
  // ============================================================
  const fileName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const pageConfig = {
    'index.html': {
      label: 'Falar com a Maison',
      message: 'Olá Maison JF. Vim do site e quero ajuda a escolher a opção certa.',
      secondHref: 'farol.html',
      secondText: 'Seguir o Farol'
    },
    'produtos.html': {
      label: 'Ajuda a escolher',
      message: 'Olá Maison JF. Estou a ver os Produtos e quero ajuda a escolher o mais indicado para mim.',
      secondHref: 'farol.html',
      secondText: 'Usar o Farol'
    },
    'servicos.html': {
      label: 'Marcar ou perguntar',
      message: 'Olá Maison JF. Estou a ver os Serviços e quero ajuda para perceber qual faz mais sentido para mim.',
      secondHref: 'farol.html',
      secondText: 'Usar o Farol'
    },
    'companhia.html': {
      label: 'Ver disponibilidade',
      message: 'Olá Maison JF. Estou a ver a área de Companhia e quero saber qual opção faz mais sentido e a disponibilidade.',
      secondHref: 'farol.html',
      secondText: 'Usar o Farol'
    },
    'profissionais.html': {
      label: 'Falar de parceria',
      message: 'Olá Maison JF. Estou na área Profissional e quero falar sobre revenda, parceria ou fornecimento.',
      secondHref: 'produtos.html',
      secondText: 'Ver Produtos'
    },
    'maison-todo-o-mes.html': {
      label: 'Escolher a minha opção',
      message: 'Olá Maison JF. Estou a ver a Maison Todo o Mês e quero ajuda a escolher a opção certa.',
      secondHref: 'farol.html',
      secondText: 'Usar o Farol'
    },
    'editions.html': {
      label: 'Pedir uma edição',
      message: 'Olá Maison JF. Estou a ver as Edições e quero saber o que está disponível.',
      secondHref: 'index.html#explorar',
      secondText: 'Explorar a Maison'
    }
  };

  const currentConfig = pageConfig[fileName] || pageConfig['index.html'];
  const waUrl = (message) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

  function rememberIntent(type) {
    try {
      sessionStorage.setItem('maisonConversionIntent', type || 'cta');
    } catch (_) {}
  }

  function hasIntent() {
    try {
      return Boolean(sessionStorage.getItem('maisonConversionIntent'));
    } catch (_) {
      return false;
    }
  }

  function markExistingWhatsAppLinks(root = document) {
    root.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
      link.dataset.conversion = 'whatsapp';
      link.setAttribute('aria-label', `${link.textContent.trim()} — abre o WhatsApp`);
      if (link.dataset.conversionBound === '1') return;
      link.dataset.conversionBound = '1';
      link.addEventListener('click', () => rememberIntent('whatsapp'), { once: true });
    });
  }

  function enhanceFarolResults(root = document) {
    const results = [];
    if (root.matches && root.matches('.farol__result')) results.push(root);
    if (root.querySelectorAll) root.querySelectorAll('.farol__result').forEach(el => results.push(el));

    results.forEach(resultBox => {
      const actions = resultBox.querySelector('.farol__result-actions');
      const title = resultBox.querySelector('.farol__result-title');
      if (!actions || !title || resultBox.querySelector('.farol__whatsapp-link')) return;
      if (actions.querySelector('a[href*="wa.me/"]')) return;

      const whatsapp = document.createElement('a');
      whatsapp.className = 'farol__whatsapp-link';
      whatsapp.href = waUrl(`Olá Maison JF. Fiz o Farol e o resultado foi: "${title.textContent.trim()}". Quero ajuda para avançar.`);
      whatsapp.target = '_blank';
      whatsapp.rel = 'noopener noreferrer';
      whatsapp.textContent = 'Prefiro falar com a Maison no WhatsApp →';
      whatsapp.addEventListener('click', () => rememberIntent('farol-whatsapp'));
      actions.insertAdjacentElement('afterend', whatsapp);
      resultBox.dataset.conversionEnhanced = '1';

      if (isTouchDevice) {
        window.setTimeout(() => {
          resultBox.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'center'
          });
        }, 80);
      }
    });
  }

  markExistingWhatsAppLinks();
  enhanceFarolResults();

  const dynamicLinkObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('a[href*="wa.me/"]')) markExistingWhatsAppLinks(node.parentElement || document);
        else if (node.querySelectorAll) markExistingWhatsAppLinks(node);
        enhanceFarolResults(node);
      });
    });
  });

  dynamicLinkObserver.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (
      link.matches('a[href*="wa.me/"]') ||
      link.classList.contains('btn--primary') ||
      link.classList.contains('conversion-bar__link')
    ) {
      rememberIntent(link.matches('a[href*="wa.me/"]') ? 'whatsapp' : 'primary');
    }
  });

  // Trust perto da decisão, não só no rodapé.
  if (fileName !== 'farol.html' && !document.querySelector('.conversion-trust')) {
    const hero = document.querySelector('.detail-hero, .hero');
    if (hero) {
      const trust = document.createElement('div');
      trust.className = 'conversion-trust';
      trust.setAttribute('aria-label', 'Confiança MAISON JF');
      trust.innerHTML = `
        <div class="conversion-trust__inner">
          <a class="conversion-trust__item" href="index.html#joao" style="color:inherit;text-decoration:none">Marca registada na União Europeia</a>
          <a class="conversion-trust__item" href="${waUrl('Olá Maison JF. Vim do site e quero falar diretamente com a Maison.')}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none">Contacto direto com a Maison</a>
          <a class="conversion-trust__item" href="farol.html" style="color:inherit;text-decoration:none">O Farol ajuda-te a escolher</a>
        </div>`;
      hero.insertAdjacentElement('afterend', trust);
    }
  }

  // Farol já é o próprio funil; não colocamos distrações fixas nessa página.
  if (fileName !== 'farol.html') {
    const stickyMessage = `${currentConfig.message} Vim da página ${document.title}.`;

    const desktopFloat = document.createElement('a');
    desktopFloat.className = 'conversion-float';
    desktopFloat.href = waUrl(stickyMessage);
    desktopFloat.target = '_blank';
    desktopFloat.rel = 'noopener noreferrer';
    desktopFloat.textContent = currentConfig.label;
    desktopFloat.setAttribute('aria-label', `${currentConfig.label} no WhatsApp`);
    desktopFloat.addEventListener('click', () => rememberIntent('sticky-whatsapp'));
    document.body.appendChild(desktopFloat);

    const mobileBar = document.createElement('aside');
    mobileBar.className = 'conversion-bar';
    mobileBar.setAttribute('aria-label', 'Ações rápidas');
    mobileBar.innerHTML = `
      <a class="conversion-bar__link conversion-bar__link--primary"
         href="${waUrl(stickyMessage)}"
         target="_blank"
         rel="noopener noreferrer">${currentConfig.label}</a>
      <a class="conversion-bar__link"
         href="${currentConfig.secondHref}">${currentConfig.secondText}</a>`;
    document.body.appendChild(mobileBar);
    document.body.classList.add('has-conversion-bar');

    // Um lembrete discreto, uma vez por sessão, só em desktop.
    const nudge = document.createElement('aside');
    nudge.className = 'conversion-nudge';
    nudge.setAttribute('aria-label', 'Ajuda a escolher');
    nudge.innerHTML = `
      <button class="conversion-nudge__close" type="button" aria-label="Fechar">×</button>
      <p class="conversion-nudge__eyebrow">Ainda a comparar?</p>
      <h2 class="conversion-nudge__title">Não precisas de saber o nome do que procuras.</h2>
      <p class="conversion-nudge__text">Diz em uma frase o que se passa. A Maison ajuda-te a reduzir as opções.</p>
      <div class="conversion-nudge__actions">
        <a class="btn btn--primary" href="${waUrl(stickyMessage)}" target="_blank" rel="noopener noreferrer">Explicar no WhatsApp</a>
        <a class="btn btn--secondary" href="farol.html">Seguir o Farol</a>
      </div>`;
    document.body.appendChild(nudge);

    let nudgeShown = false;
    const showNudge = () => {
      if (nudgeShown || hasIntent() || window.innerWidth <= 768) return;
      nudgeShown = true;
      nudge.classList.add('conversion-nudge--visible');
    };

    const nudgeTimer = window.setTimeout(showNudge, 35000);

    window.addEventListener('scroll', () => {
      if (nudgeShown || hasIntent()) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable > 0.58) showNudge();
    }, { passive: true });

    nudge.querySelector('.conversion-nudge__close').addEventListener('click', () => {
      window.clearTimeout(nudgeTimer);
      nudge.classList.remove('conversion-nudge--visible');
      nudgeShown = true;
      try {
        sessionStorage.setItem('maisonConversionIntent', 'nudge-dismissed');
      } catch (_) {}
    });
  }

  // ============================================================
  // CONSOLE
  // ============================================================
  console.log('%cMAISON JF®', 'font-family: Cormorant Garamond, serif; font-size: 22px; color: #c4a265;');
  console.log('%cPára de Ignorar. Volta Para Casa.', 'font-family: Inter, sans-serif; font-size: 11px; color: #7a6e5e;');

})();

// Passe editorial/conversão adicional. Mantido separado para ser fácil rever ou reverter.
(function loadYoichiPass() {
  if (document.querySelector('script[src^="yoichi-pass.js"]')) return;
  const script = document.createElement('script');
  script.src = 'yoichi-pass.js?v=20260911-envios';
  document.body.appendChild(script);
})();
