/* MAISON JF® | passe final de voz, confiança e conversão | 2026-09-10 */
(function () {
  'use strict';

  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.body.dataset.yoichiPage = page;

  if (!document.querySelector('link[href^="yoichi-pass.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'yoichi-pass.css?v=20260910-final';
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
    mobileMenu.querySelectorAll('.mobile-menu__link').forEach(link => link.remove());
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

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function setText(selector, text, root = document) {
    const el = $(selector, root);
    if (el) el.textContent = text;
    return el;
  }

  function setHTML(selector, html, root = document) {
    const el = $(selector, root);
    if (el) el.innerHTML = html;
    return el;
  }

  function cardByTitle(root, title) {
    return $$('.offer-card, .service-card, .catalogue-card', root).find(card => {
      const heading = $('h3, .service-card__title, .catalogue-card__title', card);
      return heading && heading.textContent.trim() === title;
    });
  }

  function rewriteCard(root, title, copy) {
    const card = cardByTitle(root, title);
    if (!card) return null;
    const p = $('.service-card__lead, .catalogue-card__pain, p:not(.detail-kicker):not(.offer-price):not(.offer-status)', card);
    if (p) p.textContent = copy;
    return card;
  }

  function practicalNote(anchor, text) {
    if (!anchor) return;
    const parent = anchor.parentElement;
    let note = parent ? $('.yoichi-practical-note', parent) : null;
    if (!note) {
      note = document.createElement('p');
      note.className = 'detail-note yoichi-practical-note';
      anchor.insertAdjacentElement('afterend', note);
    }
    note.textContent = text;
  }

  function updateTrust() {
    $$('.conversion-nudge').forEach(el => el.remove());

    const trust = $('.conversion-trust');
    if (trust) {
      const inner = $('.conversion-trust__inner', trust);
      if (inner) {
        inner.innerHTML = `
          <span class="conversion-trust__item">Marca registada na União Europeia</span>
          <span class="conversion-trust__item">Condições claras antes de pagar</span>
          <a class="conversion-trust__item" href="https://wa.me/351923318289" target="_blank" rel="noopener">Contacto directo com a Maison</a>`;
      }
    }

    const registrations = $$('.footer__registration');
    if (registrations[0]) registrations[0].textContent = 'MAISON JF® · Marca registada na União Europeia · EUIPO.';
    if (registrations[1]) registrations[1].textContent = 'Compras e reservas são confirmadas por escrito antes de qualquer pagamento.';

    $$('.footer__column').forEach(column => {
      const title = $('.footer__column-title', column);
      if (!title || title.textContent.trim() !== 'Legal') return;
      title.textContent = 'Confiança';
      const list = $('.footer__links', column);
      if (list) {
        list.innerHTML = `
          <li><span class="footer__link">Preço final antes de pagar</span></li>
          <li><span class="footer__link">Condições confirmadas por escrito</span></li>`;
      }
    });
  }

  /* HOME: dor, reconhecimento, confiança, solução, acção */
  if (page === 'index.html') {
    setText('#farol .farol__title', 'O que não te deixa em paz?');
    setText('#farol .farol__subtitle', 'Começa pelo que está a acontecer. O nome da solução vem depois.');

    const companhiaOption = $('#farolStep1 [data-farol="companhia"] .farol__option-text');
    if (companhiaOption) companhiaOption.textContent = 'Quero ir. Só não quero ir sem companhia.';

    const map = document.getElementById('transformacoes');
    if (map) {
      setText('.transformacoes__label', 'Explora a Maison', map);
      setText('.transformacoes__title', 'O que está a pesar mais hoje?', map);
      setText('.transformacoes__subtitle', 'Escolhe a parte da tua vida que está a pedir atenção.', map);

      const cards = $$('.transformacao-card', map);
      const content = [
        {
          tag: 'Cabeça',
          title: '“Já perguntei a toda a gente. Continuo sem saber o que fazer.”',
          desc: 'Já tens opiniões. O que te falta é clareza. Começa por aquilo que não consegues parar de pensar.',
          cta: 'Quero organizar isto',
          href: 'servicos.html'
        },
        {
          tag: 'Corpo',
          title: '“Ainda nem acabou o dia e eu já não tenho mais nada para dar.”',
          desc: 'Quando até descansar dá trabalho, começa pequeno. Um gesto que diga ao corpo: por hoje chega.',
          cta: 'Quero começar por mim',
          href: 'produtos.html#escalda-pes'
        },
        {
          tag: 'Casa',
          title: '“Fecho a porta. O dia entra comigo na mesma.”',
          desc: 'Fechaste a porta, mas o dia veio atrás. Muda primeiro o ambiente que te recebe.',
          cta: 'Quero mudar o ambiente',
          href: 'produtos.html#brumas'
        },
        {
          tag: 'Companhia',
          title: '“Quantas vezes mais vou desistir só porque não tenho com quem ir?”',
          desc: 'O plano continua a apetecer-te. Só não queres vivê-lo sem ninguém ao lado.',
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
        const cta = $('.transformacao-card__cta', card);
        if (cta) {
          cta.textContent = item.cta;
          cta.href = item.href;
        }
      });
    }

    const products = document.getElementById('explorar');
    if (products) {
      setText('.explorar__title', 'A casa pesa. O corpo sente. Começa pelo que queres mudar.', products);
      setText('.explorar__subtitle', 'Escolhe pelo efeito que procuras. O produto vem depois.', products);
      rewriteCard(products, 'Brumas de Ambiente', 'Entraste em casa e o dia veio atrás. Muda o ar. Marca o corte.');
      rewriteCard(products, 'Escalda-Pés', 'Quando cuidar de ti parece mais uma tarefa, começa por vinte minutos sem teres de fazer nada.');
      rewriteCard(products, 'Óleo de Massagem', 'O corpo está tenso. Nem tudo precisa de conversa. Às vezes precisa de mãos, calor e pausa.');
      rewriteCard(products, 'Águas de Lençóis', 'Deitaste o corpo. A cabeça não. Muda o quarto antes de pedir ao cérebro que desligue.');
    }

    const servicesGrid = $('#servicos .services__grid');
    if (servicesGrid) {
      $$('.service-card', servicesGrid).forEach(card => {
        const title = $('.service-card__title', card)?.textContent.trim() || '';
        if (title.includes('Cristais, Pulseiras e Peças Decorativas')) card.remove();
      });

      rewriteCard(servicesGrid, 'Tarot e Consultas', 'A pergunta continua a voltar. O Tarot não decide por ti. Ajuda-te a ver o que estás a evitar.');
      rewriteCard(servicesGrid, 'Escuta Orientada', 'Já contaste isto. Continuas no mesmo sítio. Aqui podes dizer tudo e pôr ordem no que está misturado.');
      rewriteCard(servicesGrid, 'Acompanhamento', 'Uma sessão acabou. O problema não. Há fases que pedem continuidade.');
      rewriteCard(servicesGrid, 'Companhia', 'O plano existe. Falta-te alguém ao lado. Isso não devia decidir por ti.');
      rewriteCard(servicesGrid, 'Astrologia, Numerologia e Outras Terapias Complementares', 'Há perguntas que pedem outra lente. Primeiro percebemos a questão. Depois escolhemos a ferramenta.');
      rewriteCard(servicesGrid, 'Defumações, Limpeza Energética e Abertura de Caminhos', 'Há momentos em que queres marcar uma mudança de forma simbólica. Fazemo-lo sem promessas impossíveis.');

      const astroCard = cardByTitle(servicesGrid, 'Astrologia, Numerologia e Outras Terapias Complementares');
      if (astroCard) setText('.service-card__title', 'Astrologia e Numerologia', astroCard);
      const spiritualCard = cardByTitle(servicesGrid, 'Defumações, Limpeza Energética e Abertura de Caminhos');
      if (spiritualCard) setText('.service-card__title', 'Trabalhos Espirituais', spiritualCard);

      $$('.service-card', servicesGrid).forEach(card => {
        const title = $('.service-card__title', card)?.textContent.trim() || '';
        if (title === 'Companhia') setText('.service-card__eyebrow', 'Não quero desistir do plano', card);
      });
    }

    const continuity = document.getElementById('repeticao');
    if (continuity) {
      setText('.continuity__title', 'Só te lembras de ti quando já estás no limite?', continuity);
      setText('.continuity__text', 'A Maison Todo o Mês existe para quebrar esse ciclo. Um mês de cada vez. Sem te prender.', continuity);
    }

    const joao = $('#joao .joao__content');
    if (joao) {
      setText('.joao__role', 'Fundador da Maison JF®', joao);
      setHTML('.joao__text',
        'Há coisas que não se aprendem a decorar. Aprendem-se quando alguém se senta à tua frente e a vida está a cair-lhe em cima.<br><br>' +
        'Há 32 anos que trabalho com Tarot e atendimento de pessoas. Sou <strong>Técnico Psicossocial</strong> e <strong>Técnico de Apoio à Vítima</strong>. Trabalhei numa <strong>Casa Abrigo para Vítimas de Violência Doméstica</strong>. Eu sei bem o que é receber alguém quando está por um fio, no limite. Aí não há espaço para ouvir pela metade ou julgar depressa.<br><br>' +
        'É assim que trabalho na Maison. <strong>Primeiro percebo o que está mesmo a acontecer. Depois vemos o que faz sentido fazer.</strong>',
        joao
      );
      const proof = $('.yoichi-founder-proof', joao);
      if (proof) proof.remove();
    }

    const b2b = document.getElementById('profissionais');
    if (b2b) {
      setText('.profissionais__title', 'Stock parado ocupa espaço e dinheiro.', b2b);
      setText('.profissionais__text', 'Começamos pequeno. Escolhemos o que faz sentido para o seu público. Vemos o que roda. Depois crescemos.', b2b);
      const cta = $('.btn', b2b);
      if (cta) cta.textContent = 'Ver condições profissionais';
    }

    const close = $('.fecho');
    if (close) {
      setText('.fecho__title', 'Chegaste até aqui. O que te trouxe ainda está à espera de resposta.', close);
      setText('.fecho__text', 'Se já sabes o que queres, escolhe. Se não sabes, usa o Farol. Se nada encaixar, fala connosco.', close);
    }

    const share = $('.share');
    if (share) {
      setText('.share__title', 'Conheces alguém que anda a adiar a mesma coisa?', share);
      setText('.share__text', 'Manda-lhe a Maison. O resto é com essa pessoa.', share);
    }
  }

  /* FAROL */
  if (page === 'farol.html') {
    setText('.detail-hero .detail-title', 'Há uma coisa que não te larga. Começa por aí.');
    setText('.detail-hero .detail-lead', 'Não precisas de saber o nome do serviço. Escolhe a frase mais próxima do que estás a viver.');
    setText('#farol .farol__title', 'O que não te deixa em paz?');
    setText('#farol .farol__subtitle', 'Escolhe a frase que mais se aproxima. O resto vem depois.');

    const companhiaOption = $('#farolStep1 [data-farol="companhia"] .farol__option-text');
    if (companhiaOption) companhiaOption.textContent = 'Quero ir. Só não quero ir sem companhia.';

    const repeatedSituations = document.getElementById('quando-seguir');
    if (repeatedSituations) repeatedSituations.remove();

    const about = document.getElementById('sobre-o-farol');
    if (about) {
      setText('.detail-section__title', 'Não é um teste. É só uma maneira de cortar o ruído.', about);
      setText('.detail-copy', 'Começamos na tua situação e reduzimos as opções. Se já sabes o que queres, segue directo.', about);
    }
  }

  /* PRODUTOS */
  if (page === 'produtos.html') {
    setText('.detail-hero .detail-title', 'A casa pesa. O corpo sente. Começa pelo que queres mudar.');
    setText('.detail-hero .detail-lead', 'Cheiro, pausa, toque, descanso. Escolhe pelo efeito que procuras.');

    rewriteCard(document, 'Brumas de Ambiente', 'O dia entrou contigo. Muda o ar e marca o momento em que a casa volta a ser tua.');
    rewriteCard(document, 'Escalda-Pés', 'Quando até cuidar de ti dá trabalho, começa simples. Água, tempo e pés lá dentro.');
    rewriteCard(document, 'Óleo de Massagem', 'O corpo está tenso. Dá-lhe calor, toque e alguns minutos sem exigir mais nada.');
    rewriteCard(document, 'Águas de Lençóis', 'Deitaste-te. A cabeça ainda está no dia. Muda o ambiente do quarto antes de dormir.');
    rewriteCard(document, 'Peças Decorativas em Jesmonite', 'Não precisas de mudar a casa toda para ela deixar de parecer provisória.');
    rewriteCard(document, 'Cristais e Pulseiras', 'Diz-nos o que procuras. Se tivermos uma opção que faça sentido, mostramos.');

    const grid = $('.detail-grid--products');
    practicalNote(grid, 'Antes de pagar, confirmamos referência, disponibilidade, preço final e forma de entrega.');

    const autumn = document.getElementById('outono');
    if (autumn) {
      setText('.detail-section__title', 'O Outono muda a casa antes de mudar o calendário.', autumn);
      setText('.detail-copy', 'A próxima série de velas será pequena. Fazemos menos para fazer melhor.', autumn);
    }
  }

  /* SERVIÇOS */
  if (page === 'servicos.html') {
    setText('.detail-hero .detail-title', 'A pergunta não te larga. A conversa não resolveu.');
    setText('.detail-hero .detail-lead', 'Então começa pelo que está mesmo a acontecer. Depois escolhemos o formato.');

    $$('h3').forEach(heading => {
      if (heading.textContent.trim() === 'Tarot Terapêutico') heading.textContent = 'Tarot de Aprofundamento';
    });

    rewriteCard(document, 'Tarot Expresso', 'Uma pergunta concreta. Sem rodeios. Para parares de a mastigar pela vigésima vez.');
    rewriteCard(document, 'Tarot Integrativo', 'A pergunta parece simples. Por baixo há medo, desejo, padrões e outra pessoa no meio.');
    rewriteCard(document, 'Tarot de Aprofundamento', 'O assunto tem história e uma resposta curta não chega.');
    rewriteCard(document, 'Consulta Escrita Breve', 'Queres uma resposta concreta por escrito e voltar a ela depois.');
    rewriteCard(document, 'Consulta Escrita Aprofundada', 'A situação tem camadas. Queres tempo para ler, reler e pensar.');

    const tarotGrid = $('#tarot .detail-grid');
    practicalNote(tarotGrid, 'Antes de marcar, confirmamos formato, duração, o que está incluído e quando recebes a resposta.');

    const escuta = document.getElementById('escuta');
    if (escuta) {
      setText('.detail-section__title', 'Já falaste. Ainda tens tudo cá dentro.', escuta);
      setText('.detail-copy', 'Aqui podes dizer o que não conseguiste dizer direito. Depois pomos ordem no que está misturado e vemos o próximo passo.', escuta);
    }

    const acompanhamento = document.getElementById('acompanhamento');
    if (acompanhamento) {
      setText('.detail-section__title', 'A sessão acabou. O problema não.', acompanhamento);
      rewriteCard(acompanhamento, 'Acompanhamento Permanente', 'Há fases que mudam de semana para semana. Não tens de recomeçar a história do zero todas as vezes.');
      rewriteCard(acompanhamento, 'Mentoria', 'Tens informação. Falta-te estrutura, prática e alguém que te corrija quando for preciso.');
      rewriteCard(acompanhamento, 'SOS', 'Esperar uma semana é tempo demais para esta fase. Definimos um período curto e limites claros.');
      practicalNote($('.detail-grid', acompanhamento), 'Nos valores “a partir de”, recebes antes do pagamento o período, o contacto previsto, o que inclui e os limites. Em situação de risco imediato, procura apoio de emergência ou especializado.');
    }

    const astrologia = document.getElementById('astrologia');
    if (astrologia) {
      astrologia.classList.add('yoichi-secondary-services');
      setText('.detail-kicker', 'Outras lentes', astrologia);
      setText('.detail-section__title', 'Nem toda a pergunta precisa de caber no Tarot.', astrologia);
      setText('.detail-copy', 'Primeiro percebemos a questão. Se outra abordagem fizer mais sentido, usamos essa.', astrologia);
      rewriteCard(astrologia, 'Análises e Relatórios de Astrologia', 'Queres aprofundar um mapa ou uma questão concreta. O trabalho é preparado para esse pedido.');
      rewriteCard(astrologia, 'Numerologia', 'Uma análise focada no tema que queres perceber.');
      rewriteCard(astrologia, 'Outras Terapias Complementares', 'Só propomos outra abordagem quando houver uma opção real dentro da Maison.');
    }

    const espiritual = document.getElementById('espiritual');
    if (espiritual) {
      espiritual.classList.add('yoichi-secondary-services');
      setText('.detail-section__title', 'Há alturas em que queres marcar uma mudança.', espiritual);
      setText('.detail-copy', 'Os trabalhos espirituais da Maison são simbólicos e rituais. Ouvimos o pedido primeiro. Sem promessas de resultado.', espiritual);
      rewriteCard(espiritual, 'Defumações', 'Quando queres marcar um espaço ou momento com um ritual mais forte do que apenas perfumar.');
      rewriteCard(espiritual, 'Limpeza Energética', 'Trabalho simbólico para casa, espaço ou situação.');
      rewriteCard(espiritual, 'Abertura de Caminhos', 'Intenção, mudança e movimento. Sem promessa de resultado.');
      rewriteCard(espiritual, 'Banho de Ervas', 'Preparação ritual sob consulta, conforme o objectivo.');
    }

    const especiais = document.getElementById('sob-consulta');
    if (especiais) especiais.remove();

    const companhiaSection = $$('.detail-section').find(section =>
      $('.detail-section__title', section)?.textContent.trim() === 'Também prestamos Companhia'
    );
    if (companhiaSection) {
      setText('.detail-section__title', 'O que te falta não é orientação. É alguém contigo.', companhiaSection);
      setText('.detail-copy', 'Se queres presença para um jantar, passeio, evento ou outro plano, vê os formatos de Companhia.', companhiaSection);
    }
  }

  /* COMPANHIA */
  if (page === 'companhia.html') {
    setText('.detail-hero .detail-title', 'Já deixaste de ir porque não tinhas com quem.');
    setText('.detail-hero .detail-lead', 'O plano continua a apetecer-te. A falta de companhia não tem de decidir por ti.');

    const formatos = document.getElementById('formatos');
    if (formatos) setText('.detail-section__title', 'Escolhe o tipo de presença que queres.', formatos);

    const friend = document.getElementById('friend4rent');
    if (friend) {
      const ps = $$('p:not(.detail-kicker)', friend);
      if (ps[0]) ps[0].textContent = 'Jantar, cinema, concerto, passeio, compras ou conversa. Companhia sem romance.';
      if (ps[1]) ps[1].textContent = 'Escolhes o plano. Combinamos tudo antes. Depois vais com companhia.';
    }

    const boyfriend = document.getElementById('boyfriend4rent');
    if (boyfriend) {
      const ps = $$('p:not(.detail-kicker)', boyfriend);
      if (ps[0]) ps[0].innerHTML = '<strong>Não queres necessariamente uma relação. Hoje só gostavas de sentir proximidade.</strong>';
      if (ps[1]) ps[1].textContent = 'Pode incluir mão dada, abraço, conversa íntima, carinho leve e beijos leves quando isso tiver sido combinado antes.';
    }

    const how = document.getElementById('como-funciona');
    if (how) {
      setText('.detail-section__title', 'Tudo combinado antes. Nada decidido à pressão no encontro.', how);
      rewriteCard(how, 'Mínimo de 2 horas', 'A reserva mínima é de 2 horas. A duração total fica fechada antes.');
      rewriteCard(how, 'Pagamento Antecipado', 'A reserva só fica confirmada depois do pagamento.');
      rewriteCard(how, 'Despesas a Cargo de Quem Contrata', 'Deslocação, refeições, bilhetes e outras despesas ficam definidas ou estimadas antes.');
      rewriteCard(how, 'Tudo Definido Antes', 'Data, horário, local, actividade, limites e despesas ficam combinados antes.');
      practicalNote($('.detail-grid', how), 'Antes de pagar, recebes o valor total da reserva e as despesas previsíveis.');
    }

    const limites = document.getElementById('limites');
    if (limites) {
      setText('.detail-section__title', 'Proximidade não significa ambiguidade.', limites);
      rewriteCard(limites, 'Friend4Rent', 'Companhia sem romance. Sem componente sexual.');
      rewriteCard(limites, 'Boyfriend4Rent', 'Proximidade e romance leve dentro do que ficou combinado. Sem sexo, nudez ou contacto sexual.');
      rewriteCard(limites, 'Não é Acompanhamento Permanente', 'É presença social ou afectiva. Não substitui cuidados psicológicos, médicos ou sociais especializados.');
      rewriteCard(limites, 'Queres Juntar Acompanhamento?', 'Podes juntar Escuta ou Acompanhamento se ficar combinado antes, com valor separado.');
      rewriteCard(limites, 'O Âmbito Não Muda Durante a Reserva', 'Nada de extras sexuais ou mudanças de âmbito durante o encontro.');
    }

    const reserve = $$('.detail-section').find(section =>
      $('.detail-kicker', section)?.textContent.trim() === 'Reserva'
    );
    if (reserve) {
      setText('.detail-section__title', 'Diz-me o plano. O resto fica fechado antes de saíres de casa.', reserve);
      setText('.detail-copy', 'Envia data, local, duração e o tipo de companhia que procuras. Confirmamos disponibilidade, valor e limites antes do pagamento.', reserve);
    }
  }

  /* MAISON TODO O MÊS */
  if (page === 'maison-todo-o-mes.html') {
    setText('.detail-hero .detail-title', 'Só te lembras de ti quando já estás no limite?');
    setText('.detail-hero .detail-lead', 'A Maison Todo o Mês existe para quebrar esse ciclo. Um mês de cada vez. Sem fidelização obrigatória.');

    const first = $('main > .detail-section');
    if (first) {
      setText('.detail-section__title', 'Três níveis. Escolhe o apoio que queres este mês.', first);
      const cards = $$('.offer-card', first);
      if (cards[0]) {
        const last = $('p:last-child', cards[0]);
        if (last) last.textContent = 'Para começares pequeno e não voltares a esquecer-te de ti.';
      }
      if (cards[1]) {
        const last = $('p:last-child', cards[1]);
        if (last) last.textContent = 'Para quando “depois cuido de mim” já te levou vezes suficientes ao mesmo sítio.';
      }
      if (cards[2]) {
        setText('h3', 'Hoje Não Enfrentas Isso Sem Apoio', cards[2]);
        const last = $('p:last-child', cards[2]);
        if (last) last.textContent = 'Cuidado físico e uma resposta escrita no mesmo mês.';
      }
      practicalNote($('.detail-grid', first), 'Antes de aderires, confirmamos a composição exacta do mês e o que entra no nível escolhido.');
    }

    const rule = $('.detail-section--alt');
    if (rule) {
      setText('.detail-section__title', 'Se deixar de fazer sentido, paras.', rule);
      setText('.detail-copy', 'Pagas um mês. Recebes esse mês. Depois decides se queres continuar.', rule);
    }
  }

  /* ÉDITIONS */
  if (page === 'editions.html') {
    setText('.detail-hero .detail-title', 'Há histórias que ficam a mexer contigo depois de fechares o livro.');
    setText('.detail-hero .detail-lead', 'Ficção própria da Maison. Desejo, perda, Tarot, relações e recomeços.');

    const first = $('main > .detail-section');
    if (first) {
      setText('.detail-section__title', 'Escolhe a história que queres levar contigo.', first);
      rewriteCard(first, 'Vírgulas do Destino: O Turista', 'Um encontro que devia ter sido passageiro. Não foi.');
      rewriteCard(first, 'Vírgulas do Destino: Meandros da Vida', 'Caim chega a Portugal depois de uma perda. Encontra mais do que vinha procurar.');
    }

    const alt = $('.detail-section--alt');
    if (alt) {
      setText('.detail-section__title', 'Nem tudo o que fica contigo cabe num frasco.', alt);
      setText('.detail-copy', 'As Éditions são a parte da Maison que continua contigo depois da última página.', alt);
    }
  }

  /* PROFISSIONAIS */
  if (page === 'profissionais.html') {
    setText('.detail-hero .detail-title', 'Stock parado custa espaço e dinheiro.');
    setText('.detail-hero .detail-lead', 'Não precisa de comprar uma prateleira inteira para testar a Maison. Começamos com o que faz sentido para o seu público.');

    const sections = $$('.detail-section');
    const offer = sections[0];
    if (offer) {
      setText('.detail-section__title', 'Não precisa de mais produto. Precisa de produto que rode.', offer);
      rewriteCard(offer, 'Selecção de Produtos', 'Escolhemos referências pela realidade do seu público, posicionamento e faixa de preço.');
      rewriteCard(offer, 'Pequenas Séries', 'Testa procura sem transformar a primeira encomenda numa aposta grande.');
      rewriteCard(offer, 'Edições Sazonais', 'Novidade em pequenas séries, sem obrigar a manter a mesma prateleira o ano inteiro.');
      rewriteCard(offer, 'Peças em Jesmonite', 'Peças para integrar produto e espaço quando isso melhora a apresentação.');
    }

    const how = sections.find(section => $('.detail-kicker', section)?.textContent.trim() === 'Como começamos');
    if (how) {
      setText('.detail-section__title', 'Primeiro vemos se vale a pena para os dois lados.', how);
      setText('.detail-copy', 'Diga-nos o espaço, o tipo de cliente e quanto quer testar. Depois sugerimos produtos, quantidades e condições.', how);
      rewriteCard(how, 'Condições Profissionais', 'Preço profissional e mínimos são definidos pela selecção e pelas quantidades reais.');
      rewriteCard(how, 'Proposta Antes de Confirmar', 'Produtos, quantidades, preços, prazos, despesas e pagamento ficam escritos antes de confirmar.');

      const cta = $('.btn--primary', how);
      if (cta) {
        cta.textContent = 'Receber catálogo + condições';
        cta.href = 'https://wa.me/351923318289?text=' + encodeURIComponent('Olá Maison JF. Tenho um espaço e quero receber o catálogo e as condições profissionais.');
      }
    }

    const convergence = $('.farol-convergence');
    if (convergence) {
      setText('.detail-kicker', 'Procura outra coisa?', convergence);
      setText('.detail-section__title', 'Diga-nos o que precisa de pôr na prateleira.', convergence);
      setText('.detail-copy', 'Se conseguirmos fazer bem, dizemos como. Se não, também dizemos.', convergence);
      const action = $('.btn--primary', convergence);
      if (action) {
        action.textContent = 'Falar com a Maison';
        action.href = 'https://wa.me/351923318289?text=' + encodeURIComponent('Olá Maison JF. Procuro uma solução diferente para o meu espaço: ');
      }
    }
  }

  updateTrust();

  /* Limpeza final, também para resultados do Farol criados depois do carregamento. */
  function cleanText(text) {
    return text
      .replace(/\s+[—–]\s+/g, ', ')
      .replace(/Sozinho\(a\)/g, 'Sem companhia')
      .replace(/sozinho\(a\)/g, 'sem companhia')
      .replace(/Acompanhado\(a\)/g, 'Com companhia')
      .replace(/acompanhado\(a\)/g, 'com companhia')
      .replace(/Cansado\(a\)/g, 'Sem energia')
      .replace(/cansado\(a\)/g, 'sem energia');
  }

  function cleanNode(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
        root.nodeValue = cleanText(root.nodeValue);
      }
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return;
      node.nodeValue = cleanText(node.nodeValue);
    });
  }

  cleanNode(document.body);

  const cleanupObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(cleanNode);
    });
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });
})();
