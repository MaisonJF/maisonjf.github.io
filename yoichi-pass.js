/* MAISON JF® — Yoichi conversion & architecture pass · 2026-09-10 */
(function () {
  'use strict';

  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.body.dataset.yoichiPage = page;

  if (!document.querySelector('link[href^="yoichi-pass.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'yoichi-pass.css?v=20260910-2';
    document.head.appendChild(link);
  }

  const navItems = [
    ['farol.html', 'O Farol'],
    ['produtos.html', 'Produtos'],
    ['servicos.html', 'Serviços'],
    ['companhia.html', 'Companhia'],
    ['profissionais.html', 'Profissionais'],
    ['index.html#joao', 'Sobre']
  ];

  const desktopNav = document.querySelector('.header__nav-list');
  if (desktopNav) {
    desktopNav.innerHTML = navItems
      .map(([href, label]) => `<li><a href="${href}" class="header__nav-link">${label}</a></li>`)
      .join('');
  }

  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.querySelectorAll('.mobile-menu__link').forEach((link) => link.remove());
    navItems.forEach(([href, label]) => {
      const link = document.createElement('a');
      link.href = href;
      link.className = 'mobile-menu__link';
      link.textContent = label;
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('mobile-menu--open');
        mobileMenu.setAttribute('aria-hidden', 'true');
        const toggle = document.getElementById('menuToggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
      mobileMenu.appendChild(link);
    });
  }

  function setText(selector, text, root = document) {
    const el = root.querySelector(selector);
    if (el) el.textContent = text;
    return el;
  }

  function addPracticalNote(afterElement, text) {
    if (!afterElement || afterElement.parentElement.querySelector('.yoichi-practical-note')) return;
    const p = document.createElement('p');
    p.className = 'detail-note yoichi-practical-note';
    p.textContent = text;
    afterElement.insertAdjacentElement('afterend', p);
  }

  /* HOME — Farol = diagnóstico; segundo bloco = mapa da Maison. */
  if (page === 'index.html') {
    setText('#farol .farol__title', 'O que não te deixa em paz?');
    setText('#farol .farol__subtitle', 'Não precisas de saber o nome do que procuras. Começa pelo que está a acontecer.');

    const companhiaOption = document.querySelector('#farolStep1 [data-farol="companhia"] .farol__option-text');
    if (companhiaOption) companhiaOption.textContent = 'Quero ir. Só não quero ir sem companhia.';

    const section = document.getElementById('transformacoes');
    if (section) {
      section.setAttribute('aria-label', 'Explorar a Maison');
      setText('.transformacoes__label', 'Explora a Maison', section);
      setText('.transformacoes__title', 'O que está a pesar mais hoje?', section);
      setText('.transformacoes__subtitle', 'Não precisas de escolher um serviço. Começa pela parte da tua vida que está a pedir espaço.', section);

      const cards = section.querySelectorAll('.transformacao-card');
      const content = [
        {
          tag: 'Cabeça',
          title: '“Não consigo parar de pensar nisto.”',
          desc: 'Uma decisão, uma relação, uma conversa ou uma dúvida volta vezes demais. Quando a cabeça não larga o assunto, começa por lhe dar um lugar onde possa ser visto com clareza.',
          cta: 'Quero organizar isto',
          href: 'servicos.html'
        },
        {
          tag: 'Corpo',
          title: '“O dia ainda não acabou e eu já não tenho mais nada para dar.”',
          desc: 'Há dias em que até descansar parece trabalho. Começa por uma pausa concreta: menos exigência, mais presença e alguma coisa que diga ao corpo que já pode baixar a guarda.',
          cta: 'Quero começar por mim',
          href: 'produtos.html#escalda-pes'
        },
        {
          tag: 'Casa',
          title: '“Entro em casa, mas parece que ainda não cheguei.”',
          desc: 'O trabalho, a discussão e o ruído do dia atravessam a porta contigo. Às vezes mudar o ambiente é o primeiro gesto que ajuda a separar o lá fora do que é teu.',
          cta: 'Quero mudar o ambiente',
          href: 'produtos.html#brumas'
        },
        {
          tag: 'Companhia',
          title: '“Quero viver o plano. Só não quero vivê-lo sem ninguém.”',
          desc: 'Jantar, cinema, concerto, passeio ou simplesmente sair. O plano continua a ser teu; a diferença é não teres de o adiar só porque te falta companhia.',
          cta: 'Quero conhecer a Companhia',
          href: 'companhia.html'
        }
      ];

      cards.forEach((card, index) => {
        const item = content[index];
        if (!item) return;
        setText('.transformacao-card__tag', item.tag, card);
        setText('.transformacao-card__title', item.title, card);
        setText('.transformacao-card__desc', item.desc, card);
        const cta = card.querySelector('.transformacao-card__cta');
        if (cta) {
          cta.textContent = item.cta;
          cta.href = item.href;
        }
      });
    }

    /* Homepage: seis serviços cabem numa grelha limpa. Produtos especiais regressam à área Produtos. */
    const servicesGrid = document.querySelector('#servicos .services__grid');
    if (servicesGrid) {
      servicesGrid.querySelectorAll('.service-card').forEach((card) => {
        const title = card.querySelector('.service-card__title')?.textContent.trim() || '';
        if (title.includes('Cristais, Pulseiras e Peças Decorativas')) card.remove();
      });

      servicesGrid.querySelectorAll('.service-card').forEach((card) => {
        const title = card.querySelector('.service-card__title')?.textContent.trim() || '';
        if (title === 'Companhia') {
          setText('.service-card__eyebrow', 'Não quero ir sem companhia', card);
        }
      });
    }

    /* Fundador: autoridade factual, experiência longa e contacto real com pessoas em crise. */
    const joaoContent = document.querySelector('#joao .joao__content');
    if (joaoContent) {
      setText('.joao__role', 'Fundador da Maison JF® · Tarólogo · Técnico Psicossocial · Técnico de Apoio à Vítima', joaoContent);
      setText('.joao__text', 'Há 32 anos que trabalho com Tarot e com pessoas — não apenas em consulta, mas também em contextos onde não há espaço para respostas vazias. Trabalhei em casa de abrigo com vítimas de violência doméstica, acompanhando pessoas em momentos de crise, ruptura, medo e reconstrução. Essa experiência ensinou-me a ouvir com atenção, a perceber contexto, risco e limites, e a distinguir quando alguém precisa de orientação, presença ou encaminhamento. É essa exigência que trago para a Maison.', joaoContent);

      let proof = joaoContent.querySelector('.yoichi-founder-proof');
      if (!proof) {
        proof = document.createElement('p');
        proof.className = 'yoichi-founder-proof';
        joaoContent.appendChild(proof);
      }
      proof.innerHTML = '<strong>32 anos de experiência com Tarot e atendimento de pessoas.</strong><br>Técnico Psicossocial · Técnico de Apoio à Vítima.<br>Experiência em casa de abrigo para vítimas de violência doméstica e no acompanhamento de pessoas em situações de crise e elevada vulnerabilidade.';
    }
  }

  /* PRODUTOS — mantém a emoção, acrescenta segurança prática antes do WhatsApp. */
  if (page === 'produtos.html') {
    const grid = document.querySelector('.detail-grid--products');
    addPracticalNote(
      grid,
      'Antes de confirmares uma encomenda, indicamos disponibilidade, variantes aplicáveis, total final e forma de entrega. Assim sabes exactamente o que estás a pedir antes de pagar.'
    );
  }

  /* SERVIÇOS — hierarquia mais clara e menos ambiguidade clínica. */
  if (page === 'servicos.html') {
    const heroLead = document.querySelector('.detail-hero .detail-lead');
    if (heroLead) {
      heroLead.textContent = 'Uma mensagem. Uma decisão. Uma relação. Uma conversa que adias. Ou simplesmente a sensação de que já não consegues organizar tudo por ti. Não tens de saber que serviço pedir. Começa pelo que está a acontecer.';
    }

    document.querySelectorAll('.offer-card h3').forEach((heading) => {
      if (heading.textContent.trim() === 'Tarot Terapêutico') heading.textContent = 'Tarot de Aprofundamento';
    });

    const tarotGrid = document.querySelector('#tarot .detail-grid');
    addPracticalNote(
      tarotGrid,
      'Antes de marcares, confirmamos o formato, o que está incluído e todas as condições aplicáveis. A ideia é chegares à decisão sem teres de adivinhar o que estás a comprar.'
    );

    const acompanhamentoGrid = document.querySelector('#acompanhamento .detail-grid');
    addPracticalNote(
      acompanhamentoGrid,
      'Nas opções de continuidade e mentoria, o formato e o âmbito são definidos contigo antes da confirmação, para saberes exactamente o que está incluído.'
    );

    const astrologia = document.getElementById('astrologia');
    if (astrologia) {
      astrologia.classList.add('yoichi-secondary-services');
      setText('.detail-kicker', 'Outros trabalhos · sob encomenda', astrologia);
      setText('.detail-section__title', 'Astrologia, Numerologia e outras abordagens, quando fizerem sentido.', astrologia);
    }

    const espiritual = document.getElementById('espiritual');
    if (espiritual) {
      espiritual.classList.add('yoichi-secondary-services');
      setText('.detail-kicker', 'Trabalho espiritual · sob consulta', espiritual);
    }

    const especiais = document.getElementById('sob-consulta');
    if (especiais) especiais.classList.add('yoichi-secondary-services');
  }

  /* COMPANHIA — linguagem mais fluida, mantendo limites e segurança. */
  if (page === 'companhia.html') {
    setText('.detail-hero .detail-title', 'Queres ir. Só não queres ir sem companhia.');
    const lead = document.querySelector('.detail-hero .detail-lead');
    if (lead) {
      lead.textContent = 'Há dias, e noites, em que o que falta não é um plano. É alguém contigo. Às vezes queres apenas companhia para sair, conversar ou chegar com alguém ao teu lado. Outras, queres um pouco mais de proximidade, carinho e romance leve. A Companhia da MAISON JF® tem dois formatos para essas duas necessidades.';
    }

    const friend = document.getElementById('friend4rent');
    if (friend) {
      friend.querySelectorAll('p').forEach((p) => {
        if (p.textContent.includes('Vais acompanhado(a).')) p.textContent = p.textContent.replace('Vais acompanhado(a).', 'Vais com companhia.');
      });
    }
  }

  /* B2B — reduz fricção: primeiro informação e teste; proposta vem depois. */
  if (page === 'profissionais.html') {
    setText('.detail-hero .detail-title', 'Uma selecção MAISON JF® pensada para fazer sentido no seu espaço — comercialmente e visualmente.');
    const lead = document.querySelector('.detail-hero .detail-lead');
    if (lead) {
      lead.textContent = 'Lojas, spas, gabinetes e outros espaços podem começar com uma selecção ajustada ao público, ao orçamento e à realidade do negócio. Não precisa de começar grande para perceber se a Maison faz sentido para os seus clientes.';
    }

    const sections = document.querySelectorAll('.detail-section');
    const how = Array.from(sections).find((section) => section.querySelector('.detail-kicker')?.textContent.trim() === 'Como começamos');
    if (how) {
      setText('.detail-section__title', 'Não precisa de encher uma prateleira para experimentar a Maison.', how);
      setText('.detail-copy', 'Apresente-nos o seu espaço, o perfil dos seus clientes e o que gostaria de testar. A partir daí propomos uma selecção e quantidades que façam sentido para começar, com condições claras antes de qualquer confirmação.', how);

      const cta = how.querySelector('.btn--primary');
      if (cta) {
        cta.classList.add('yoichi-b2b-cta');
        cta.textContent = 'Receber catálogo + condições profissionais';
        cta.href = 'https://wa.me/351923318289?text=' + encodeURIComponent('Olá Maison JF. Tenho um espaço e quero receber o catálogo e as condições profissionais para perceber se faz sentido testar a Maison.');
      }
    }

    const convergence = document.querySelector('.farol-convergence');
    if (convergence) {
      setText('.detail-kicker', 'Procura outra coisa?', convergence);
      setText('.detail-section__title', 'Diga-nos o que faria sentido no seu espaço.', convergence);
      setText('.detail-copy', 'Se não encontrou aqui o produto, formato ou quantidade que procura, explique-nos o contexto. Respondemos com o que realmente conseguimos desenvolver.', convergence);
      const action = convergence.querySelector('.btn--primary');
      if (action) {
        action.textContent = 'Falar com a Maison';
        action.href = 'https://wa.me/351923318289?text=' + encodeURIComponent('Olá Maison JF. Estou na área profissional e procuro uma solução diferente para o meu espaço. O que tenho em mente é: ');
        action.target = '_blank';
        action.rel = 'noopener';
      }
    }
  }

  /* O popup adicional duplicava a função do Farol e do botão flutuante. */
  document.querySelectorAll('.conversion-nudge').forEach((nudge) => nudge.remove());
})();
