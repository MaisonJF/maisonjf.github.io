/**
 * MAISON JF® — Main JavaScript
 * Funcionalidades gerais do site
 */

(function() {
  'use strict';

  // ============================================================
  // HEADER SCROLL EFFECT
  // ============================================================
  const header = document.getElementById('header');
  let lastScrollY = 0;

  function handleScroll() {
    const scrollY = window.scrollY || window.pageYOffset;

    if (scrollY > 50) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }

    lastScrollY = scrollY;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // ============================================================
  // MOBILE MENU
  // ============================================================
  const menuToggle = document.getElementById('menuToggle');
  const menuClose = document.getElementById('menuClose');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu.querySelectorAll('.mobile-menu__link');

  function openMenu() {
    mobileMenu.classList.add('mobile-menu--open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    mobileMenu.classList.remove('mobile-menu--open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuToggle.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('mobile-menu--open')) {
      closeMenu();
    }
  });

  // ============================================================
  // SMOOTH SCROLL
  // ============================================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = header.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ============================================================
  // SCROLL REVEAL
  // ============================================================
  const revealElements = document.querySelectorAll('.reveal');

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

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });

  // ============================================================
  // PARALLAX SUAVE NO HERO (desktop only, reduced motion aware)
  // ============================================================
  const heroBg = document.querySelector('.hero__bg-image');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  if (heroBg && !prefersReducedMotion && !isTouchDevice) {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const rate = scrollY * 0.25;
          heroBg.style.transform = `translateY(${rate}px)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ============================================================
  // IDENTIDADE VISUAL | SÍMBOLO JF + FAROL NA SECÇÃO SOBRE
  // ============================================================
  const maisonMark = document.querySelector('.joao__visual-monogram');
  if (maisonMark) {
    maisonMark.style.backgroundImage = "url('maison-jf-farol.jpg')";
    maisonMark.style.backgroundSize = 'cover';
    maisonMark.style.backgroundPosition = 'center';
    maisonMark.style.backgroundRepeat = 'no-repeat';
    maisonMark.style.border = '1px solid rgba(196,162,101,.24)';

    maisonMark.querySelectorAll('.joao__visual-initials, .joao__visual-label').forEach(el => {
      el.style.display = 'none';
    });
  }

  // ============================================================
  // CONSOLE
  // ============================================================
  console.log('%cMAISON JF®', 'font-family: Cormorant Garamond, serif; font-size: 22px; color: #c4a265;');
  console.log('%cPára de Ignorar. Volta Para Casa.', 'font-family: Inter, sans-serif; font-size: 11px; color: #7a6e5e;');

})();
