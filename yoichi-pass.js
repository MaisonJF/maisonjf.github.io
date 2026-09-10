/* MAISON JF® — Yoichi conversion & architecture pass · 2026-09-10 */
(function () {
  'use strict';

  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.body.dataset.yoichiPage = page;

  if (!document.querySelector('link[href^="yoichi-pass.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'yoichi-pass.css?v=20260910-3';
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

  function setHTML(selector, html, root = document) {
    const el = root.querySelector(selector);
    if (el) el.innerHTML = html;
    return el;
  }

  function addPracticalNote(afterElement, text) {
    if (!afterElement || afterElement.parentElement.querySelector('.yoichi-practical-note')) return;
    const p = document.createElement('p');
    p.className = 'detail-note yoichi-practical-note';
    p.textContent = text;
    afterElement.insertAdjacentElement('afterend', p);
  }

  function cardByTitle(root, title) {
    return Array.from(root.querySelectorAll('.offer-card, .service-card, .catalogue-card')).find((card) => {
      const heading = card.querySelector('h3, .service-card__title, .catalogue-card__title');
      return heading && heading.textContent.trim() === title;
    });
  }

  function rewriteCard(root, title, copy) {
    const card = cardByTitle(root, title);
    if (!card) return;
    const p = card.querySelector('.service-card__lead, .catalogue-card__pain, p:not(.detail-kicker):not(.offer-price)');
    if (p) p.textContent = copy;
  }

  /* HOME — dor primeiro, solução depois; luxo sem distância. */
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
          title: '“Já perguntei a toda a gente. Continuo sem saber o que fazer.”',
          desc: 'Mais uma opinião provavelmente não vai resolver. Quando uma decisão, uma relação ou uma conversa ocupa espaço demais, talvez precises de olhar para o que estás a evitar ver.',
          cta: 'Quero organizar isto',
          href: 'servicos.html'
        },
        {
          tag: 'Corpo',
          title: '“Ainda nem acabou o dia e eu já não tenho mais nada para dar.”',
          desc: 'Quando até descansar parece trabalho, não precisas de transformar a vida toda. Precisas de um primeiro gesto que diga ao corpo: por hoje, chega.',
          cta: 'Quero começar por mim',
          href: 'produtos.html#escalda-pes'
        },
        {
          tag: 'Casa',
          title: '“Fecho a porta. O dia entra comigo na mesma.”',
          desc: 'O trabalho, a discussão e o ruído não ficam automaticamente do lado de fora. Às vezes mudar o cheiro, a luz ou o ritual de chegada é o primeiro corte.',
          cta: 'Quero mudar o ambiente',
          href: 'produtos.html#brumas'
        },
        {
          tag: 'Companhia',
          title: '“Quantas vezes mais vou desistir só porque não tenho com quem ir?”',
          desc: 'Jantar, cinema, concerto, passeio ou simplesmente sair. O plano continua a ser teu. O que não precisa é de morrer por falta de companhia.',
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

    const products = document.getElementById('explorar');
    if (products) {
      setText('.explorar__title', 'Não compres pelo nome bonito. Compra pelo que queres sentir diferente.', products);
      setText('.explorar__subtitle', 'Casa, corpo, aroma, pausa. Começa pelo efeito que procuras — depois escolhes o produto.', products);
      rewriteCard(products, 'Brumas de Ambiente', 'Entraste em casa, mas o dia veio atrás. Algumas borrifadelas não resolvem a tua vida — mas podem marcar o momento em que ela deixa de estar lá fora e volta a ser tua.');
      rewriteCard(products, 'Escalda-Pés', 'Se até tomar conta de ti parece mais uma tarefa, começa por vinte minutos em que não tens de produzir absolutamente nada.');
      rewriteCard(products, 'Óleo de Massagem', 'Há dias em que o corpo não pede mais disciplina. Pede toque, calor e alguém — nem que sejas tu — a tratá-lo como se importasse.');
      rewriteCard(products, 'Águas de Lençóis', 'Deitar o corpo não chega quando a cabeça continua de pé. Muda o quarto antes de pedires ao cérebro que perceba que o dia acabou.');
    }

    const servicesGrid = document.querySelector('#servicos .services__grid');
    if (servicesGrid) {
      servicesGrid.querySelectorAll('.service-card').forEach((card) => {
        const title = card.querySelector('.service-card__title')?.textContent.trim() || '';
        if (title.includes('Cristais, Pulseiras e Peças Decorativas')) card.remove();
      });

      rewriteCard(servicesGrid, 'Tarot e Consultas', 'Já perguntaste a toda a gente. Agora tens cinco opiniões e continuas no mesmo sítio. O Tarot não decide por ti; ajuda-te a ver aquilo para onde talvez não estejas a olhar.');
      rewriteCard(servicesGrid, 'Escuta Orientada', 'Há dias em que já contaste a mesma história a três pessoas e continuas exactamente no mesmo sítio. Aqui não tens de a contar bonita. Começas a falar. Organizamos a partir daí.');
      rewriteCard(servicesGrid, 'Acompanhamento', 'Há assuntos que não acabam quando desligas a chamada. Se amanhã o problema ainda estiver contigo, talvez uma sessão isolada já não seja suficiente.');
      rewriteCard(servicesGrid, 'Companhia', 'Queres jantar, ir ao cinema, a um concerto ou simplesmente sair de casa. O plano existe. Falta-te alguém ao lado — e isso não devia obrigar-te a desistir outra vez.');
      rewriteCard(servicesGrid, 'Astrologia, Numerologia e Outras Terapias Complementares', 'Nem tudo precisa de caber no Tarot. Quando a pergunta pede outra lente, vemos primeiro o que queres perceber e só depois escolhemos a ferramenta.');
      rewriteCard(servicesGrid, 'Defumações, Limpeza Energética e Abertura de Caminhos', 'Às vezes não queres analisar mais. Queres marcar uma mudança. Os trabalhos espirituais da Maison são preparados com intenção clara e sem promessas mágicas de resultado.');

      servicesGrid.querySelectorAll('.service-card').forEach((card) => {
        const title = card.querySelector('.service-card__title')?.textContent.trim() || '';
        if (title === 'Companhia') setText('.service-card__eyebrow', 'Não quero desistir do plano', card);
      });
    }

    const continuity = document.getElementById('repeticao');
    if (continuity) {
      setText('.continuity__title', 'Se só te lembras de ti quando rebentas, há qualquer coisa a mudar.', continuity);
      setText('.continuity__text', 'A Maison Todo o Mês não existe para te prender a uma subscrição. Existe para não voltares sempre ao mesmo ponto: esperar pelo limite para finalmente fazeres alguma coisa por ti.', continuity);
    }

    const joaoContent = document.querySelector('#joao .joao__content');
    if (joaoContent) {
      setText('.joao__role', 'Fundador da Maison JF®', joaoContent);
      setHTML('.joao__text', 'Há coisas que não se aprendem a decorar. Aprendem-se quando alguém se senta à tua frente e a vida está a cair-lhe em cima.<br><br>Há 32 anos que trabalho com Tarot e atendimento de pessoas. Sou <strong>Técnico Psicossocial</strong> e <strong>Técnico de Apoio à Vítima</strong>. Trabalhei numa <strong>Casa Abrigo para Vítimas de Violência Doméstica</strong>. Eu sei bem o que é receber alguém quando está por um fio, no limite — quando ouvir mal, julgar depressa ou ignorar um sinal pode ter consequências reais.<br><br>É daí que vem a forma como trabalho na Maison. Não te encaixo numa fórmula e não te vendo a primeira solução que tenho à mão. <strong>Primeiro percebo o que está mesmo a acontecer. Depois vemos o que faz sentido fazer.</strong>', joaoContent);
      const proof = joaoContent.querySelector('.yoichi-founder-proof');
      if (proof) proof.remove();
    }

    const professionalHome = document.getElementById('profissionais');
    if (professionalHome) {
      setText('.profissionais__title', 'Não precisa de encher uma prateleira para descobrir se a Maison funciona no seu espaço.', professionalHome);
      setText('.profissionais__text', 'Começamos com uma selecção que faça sentido para os seus clientes, para o seu orçamento e para a realidade do negócio. Testa. Vê o que roda. Crescemos a partir daí.', professionalHome);
      const cta = professionalHome.querySelector('.btn');
      if (cta) cta.textContent = 'Ver condições profissionais';
    }
  }

  /* O FAROL — sem teste de personalidade; só uma boa pergunta de cada vez. */
  if (page === 'farol.html') {
    setText('.detail-hero .detail-title', 'Não tens de saber o que procuras. Basta saber o que não te larga.');
    setText('.detail-hero .detail-lead', 'Começa pela frase que te acerta. O Farol não te põe numa caixa e não te obriga a comprar nada. Só reduz o ruído até aparecer uma próxima porta que faça sentido.');
    setText('#farol .farol__title', 'O que não te deixa em paz?');
    setText('#farol .farol__subtitle', 'Escolhe a frase mais próxima do que estás a viver. O nome da solução vem depois.');
    const companhiaOption = document.querySelector('#farolStep1 [data-farol="companhia"] .farol__option-text');
    if (companhiaOption) companhiaOption.textContent = 'Quero ir. Só não quero ir sem companhia.';

    const about = document.getElementById('sobre-o-farol');
    if (about) {
      setText('.detail-section__title', 'Não é um teste. É uma maneira de não começares pela prateleira errada.', about);
      setText('.detail-copy', 'Tu sabes o que está a acontecer contigo; só podes não saber se isso pede um produto, uma consulta, uma conversa, acompanhamento ou simplesmente companhia. O Farol começa na tua situação e reduz as opções. Se já sabes exactamente o que queres, ignora-o e segue directo.', about);
    }
  }

  /* PRODUTOS — o produto entra depois da sensação que a pessoa quer mudar. */
  if (page === 'produtos.html') {
    setText('.detail-hero .detail-title', 'A tua casa não precisa de parecer nova. Precisa de voltar a saber a tua.');
    setText('.detail-hero .detail-lead', 'E o teu corpo não precisa de mais uma obrigação de autocuidado. Começa pelo que queres sentir diferente quando fechas a porta, tiras os sapatos ou finalmente te deitas.');

    const root = document;
    rewriteCard(root, 'Brumas de Ambiente', 'Entraste em casa, mas o trabalho, a rua ou a discussão entraram contigo. Borrifa. Muda o ar. Cria um corte simples entre o que aconteceu lá fora e o que queres deixar ficar cá dentro.');
    rewriteCard(root, 'Escalda-Pés', 'Quando até tomar conta de ti parece trabalho, não te vou pedir uma rotina de doze passos. Água, tempo, pés lá dentro. Por agora chega.');
    rewriteCard(root, 'Óleo de Massagem', 'Há tensão que não precisa de mais análise naquele momento. Precisa de mãos, calor e alguns minutos em que o corpo não tenha de aguentar mais nada.');
    rewriteCard(root, 'Águas de Lençóis', 'Deitaste-te. A cabeça não. Mudar o cheiro do quarto pode ajudar a marcar uma coisa simples que às vezes esquecemos: o dia acabou.');
    rewriteCard(root, 'Peças Decorativas em Jesmonite', 'Nem toda a mudança da casa precisa de obras. Às vezes basta um objecto certo no sítio certo para o espaço deixar de parecer provisório.');
    rewriteCard(root, 'Cristais e Pulseiras', 'Se procuras uma pedra, uma intenção ou uma peça específica, diz-nos o que tens em mente. Se existir uma opção que faça sentido, mostramos-ta. Se não, não inventamos.');

    const productGrid = document.querySelector('.detail-grid--products');
    addPracticalNote(productGrid, 'Antes de confirmares, sabes o que está disponível, o valor final e a forma de entrega. O WhatsApp serve para fechar a escolha — não para te obrigar a descobrir às cegas o que estás a comprar.');

    const autumn = document.getElementById('outono');
    if (autumn) {
      setText('.detail-section__title', 'O Outono chega. A casa também muda de estação.', autumn);
      setText('.detail-copy', 'A próxima edição de Velas Aromáticas será limitada. Não porque gostamos da palavra “exclusivo”, mas porque pequenas séries permitem fazer melhor e não produzir só para encher stock.', autumn);
    }
  }

  /* SERVIÇOS — reconhecimento, autoridade e decisão. */
  if (page === 'servicos.html') {
    setText('.detail-hero .detail-title', 'Se já contaste isto a toda a gente e continuas no mesmo sítio, talvez não precises de mais uma opinião.');
    setText('.detail-hero .detail-lead', 'Uma mensagem. Uma decisão. Uma relação. Uma conversa que adias. Ou uma fase em que já não sabes o que pensar primeiro. Não tens de escolher o nome do serviço sozinho. Começa pelo que está mesmo a acontecer.');

    document.querySelectorAll('.offer-card h3').forEach((heading) => {
      if (heading.textContent.trim() === 'Tarot Terapêutico') heading.textContent = 'Tarot de Aprofundamento';
    });

    rewriteCard(document, 'Tarot Expresso', 'Tens uma pergunta concreta e queres parar de a mastigar pela vigésima vez. Vamos ao assunto sem transformar uma pergunta simples numa novela.');
    rewriteCard(document, 'Tarot Integrativo', 'A pergunta parece ser uma. Por baixo estão medo, desejo, padrões, outra pessoa e aquilo que ainda não disseste nem a ti próprio. Aqui olhamos para o conjunto.');
    rewriteCard(document, 'Tarot de Aprofundamento', 'Quando uma resposta curta seria quase insultuosa porque o assunto tem história, repetição e demasiadas peças ligadas umas às outras.');
    rewriteCard(document, 'Consulta Escrita Breve', 'Queres uma resposta concreta, por escrito, para poderes voltar a ela depois — sem precisares de marcar uma conversa.');
    rewriteCard(document, 'Consulta Escrita Aprofundada', 'Quando sabes que vais precisar de reler. Não porque o texto é complicado, mas porque a situação é.');

    const escuta = document.getElementById('escuta');
    if (escuta) {
      setText('.detail-section__title', 'Há dias em que não precisas de cartas. Precisas de conseguir dizer tudo.', escuta);
      setText('.detail-copy', 'Sem editar para parecer forte. Sem resumir para não incomodar. Sem ouvir “eu no teu lugar...” ao fim de três minutos. Falas. Organizamos o que está misturado e procuramos um próximo passo que caiba na realidade.', escuta);
    }

    const acompanhamento = document.getElementById('acompanhamento');
    if (acompanhamento) {
      setText('.detail-section__title', 'Se amanhã isto ainda estiver contigo, uma sessão pode não chegar.', acompanhamento);
      rewriteCard(acompanhamento, 'Acompanhamento Permanente', 'Há fases em que o problema muda de forma todas as semanas. Não recomeças a história do zero de cada vez; seguimos o fio contigo enquanto houver trabalho real a fazer.');
      rewriteCard(acompanhamento, 'Mentoria', 'Não queres consumir mais conteúdo solto. Queres aprender com estrutura, ser corrigido, praticar e chegar ao ponto em que já não precisas de alguém a segurar-te a mão.');
      rewriteCard(acompanhamento, 'SOS', 'Há períodos em que “falamos para a semana” é tempo demais. O SOS existe para fases curtas que pedem presença mais próxima e um enquadramento definido logo à partida.');
      addPracticalNote(acompanhamento.querySelector('.detail-grid'), 'Antes de começares, definimos contigo o formato, o âmbito, a duração e o que está — e não está — incluído. Proximidade não significa ausência de limites.');
    }

    const astrologia = document.getElementById('astrologia');
    if (astrologia) {
      astrologia.classList.add('yoichi-secondary-services');
      setText('.detail-kicker', 'Outras lentes · sob encomenda', astrologia);
      setText('.detail-section__title', 'Nem toda a pergunta precisa de caber no Tarot.', astrologia);
      setText('.detail-copy', 'Há situações em que Astrologia, Numerologia ou outra abordagem faz mais sentido. Primeiro percebemos a pergunta. Só depois escolhemos a ferramenta — e não o contrário.', astrologia);
    }

    const espiritual = document.getElementById('espiritual');
    if (espiritual) {
      espiritual.classList.add('yoichi-secondary-services');
      setText('.detail-kicker', 'Trabalho espiritual · sob consulta', espiritual);
      setText('.detail-section__title', 'Há alturas em que não queres pensar mais. Queres marcar uma mudança.', espiritual);
      setText('.detail-copy', 'Defumações, limpezas energéticas, abertura de caminhos e outras práticas são tratadas como trabalho simbólico e ritual. O pedido é ouvido primeiro; a proposta vem depois. Sem garantias mágicas e sem promessas que ninguém pode fazer honestamente.', espiritual);
    }

    const especiais = document.getElementById('sob-consulta');
    if (especiais) especiais.classList.add('yoichi-secondary-services');
  }

  /* COMPANHIA — tratar a necessidade sem vergonha, mantendo limites muito claros. */
  if (page === 'companhia.html') {
    setText('.detail-hero .detail-title', 'O plano existe. O que te falta é alguém ao lado.');
    setText('.detail-hero .detail-lead', 'Já deixaste passar um jantar, um concerto, um passeio ou uma noite porque não querias ir sozinho. Não há nada de ridículo nisso. A Companhia da Maison existe para que a falta de alguém disponível não decida sempre por ti.');

    const formatos = document.getElementById('formatos');
    if (formatos) setText('.detail-section__title', 'Não tens de fingir que procuras uma relação quando só queres companhia.', formatos);

    const friend = document.getElementById('friend4rent');
    if (friend) {
      const paragraphs = friend.querySelectorAll('p:not(.detail-kicker)');
      if (paragraphs[0]) paragraphs[0].textContent = 'Jantar. Cinema. Concerto. Evento. Passeio. Exposição. Compras. Conversa. Ou só sair de casa e ter alguém com quem dividir o momento. Sem romance e sem fazer de conta que é um encontro.';
      if (paragraphs[1]) paragraphs[1].textContent = 'Escolhes o plano. Combinamos os limites. Depois vais com companhia.';
    }

    const boyfriend = document.getElementById('boyfriend4rent');
    if (boyfriend) {
      const ps = boyfriend.querySelectorAll('p:not(.detail-kicker)');
      if (ps[0]) ps[0].innerHTML = '<strong>Não queres necessariamente uma relação. Mas hoje gostavas de sentir proximidade.</strong>';
      if (ps[1]) ps[1].textContent = 'Pode existir mão dada, abraço, conversa íntima, carinho leve e beijos leves quando isso tiver sido combinado antes. É presença afectiva com limites claros — não um contrato para fingir uma vida inteira.';
    }

    const how = document.getElementById('como-funciona');
    if (how) setText('.detail-section__title', 'Tudo combinado antes. Nada negociado à pressão durante o encontro.', how);

    const limites = document.getElementById('limites');
    if (limites) setText('.detail-section__title', 'Proximidade não significa ambiguidade.', limites);

    const reserveSections = Array.from(document.querySelectorAll('.detail-section'));
    const reserve = reserveSections.find((section) => section.querySelector('.detail-kicker')?.textContent.trim() === 'Reserva');
    if (reserve) {
      setText('.detail-section__title', 'Diz-me o plano. O resto tratamos antes de saíres de casa.', reserve);
      setText('.detail-copy', 'Data, local, duração aproximada e o tipo de presença que procuras. Confirmamos disponibilidade, valor, despesas previsíveis e limites antes de qualquer pagamento. Sem surpresas depois.', reserve);
    }
  }

  /* MAISON TODO O MÊS — recorrência sem prisão. */
  if (page === 'maison-todo-o-mes.html') {
    setText('.detail-hero .detail-title', 'Se só te lembras de ti quando já estás no limite, não é falta de produtos. É falta de continuidade.');
    setText('.detail-hero .detail-lead', 'A Maison Todo o Mês existe para quebrar esse ciclo. Um mês de cada vez, sem fidelização obrigatória e sem a conversa de “transforma a tua vida em 30 dias”. Só uma estrutura para não voltares sempre ao zero.');

    const first = document.querySelector('main > .detail-section');
    if (first) {
      setText('.detail-kicker', 'Escolhe pelo apoio que queres', first);
      setText('.detail-section__title', 'Três níveis. Um mês de cada vez.', first);
      const cards = first.querySelectorAll('.offer-card');
      if (cards[0]) {
        const last = cards[0].querySelector('p:last-child');
        if (last) last.textContent = 'Para começares pequeno: alguma coisa física, uma mensagem pensada para aquele mês e um motivo para não voltares a esquecer-te de ti.';
      }
      if (cards[1]) {
        const last = cards[1].querySelector('p:last-child');
        if (last) last.textContent = 'Para quando sabes que “eu depois cuido de mim” já te levou vezes suficientes ao mesmo sítio.';
      }
      if (cards[2]) {
        setText('h3', 'Hoje Não Enfrentas Isso Sem Apoio', cards[2]);
        const last = cards[2].querySelector('p:last-child');
        if (last) last.textContent = 'Produto e orientação escrita no mesmo mês, para quando precisas de cuidar do ambiente e também pôr uma questão concreta em cima da mesa.';
      }
    }

    const rule = document.querySelector('.detail-section--alt');
    if (rule) {
      setText('.detail-section__title', 'Se deixar de fazer sentido, paras. Simples.', rule);
      setText('.detail-copy', 'Pagas um mês e recebes o que corresponde ao nível escolhido. Depois decides se queres outro. Continuidade deve ajudar-te — não prender-te.', rule);
    }
  }

  /* ÉDITIONS — editorial, não catálogo burocrático. */
  if (page === 'editions.html') {
    setText('.detail-hero .detail-title', 'A Maison também se lê. E nem tudo o que fica contigo cabe num frasco.');
    setText('.detail-hero .detail-lead', 'Ficção própria, desejo, perda, mistério, Tarot, relações e aqueles desvios da vida que começam pequenos e acabam por mudar tudo.');

    const first = document.querySelector('main > .detail-section');
    if (first) {
      setText('.detail-section__title', 'Escolhe a história que queres levar contigo.', first);
      rewriteCard(first, 'Vírgulas do Destino: O Turista', 'Um encontro que parecia passageiro. Desejo, destino e perguntas que continuam abertas quando a viagem devia ter acabado.');
      rewriteCard(first, 'Vírgulas do Destino: Meandros da Vida', 'Perda, desejo, Tarot e recomeço. Caim chega a Portugal depois de uma tragédia e encontra precisamente aquilo para que não vinha preparado.');
    }

    const alt = document.querySelector('.detail-section--alt');
    if (alt) {
      setText('.detail-section__title', 'Há coisas que uma vela não consegue contar.', alt);
      setText('.detail-copy', 'É para isso que existem as Éditions. Histórias próprias da Maison, feitas para te acompanhar para lá do último parágrafo.', alt);
    }
  }

  /* B2B — baixa o risco percebido e mostra lógica comercial. */
  if (page === 'profissionais.html') {
    setText('.detail-hero .detail-title', 'Não precisa de comprar uma prateleira inteira para descobrir se os seus clientes querem a Maison.');
    setText('.detail-hero .detail-lead', 'Lojas, spas, gabinetes e outros espaços podem começar com uma selecção pequena, coerente e pensada para o público real que entra pela porta. Testamos o que faz sentido. Crescemos com o que roda.');

    const mainSections = document.querySelectorAll('.detail-section');
    const offer = mainSections[0];
    if (offer) {
      setText('.detail-section__title', 'O seu espaço não precisa de mais stock parado.', offer);
      rewriteCard(offer, 'Selecção de Produtos', 'Em vez de lhe enviarmos tudo o que fazemos, escolhemos referências que façam sentido para o seu público, posicionamento e faixa de preço.');
      rewriteCard(offer, 'Pequenas Séries', 'Começar pequeno permite testar procura sem transformar a primeira encomenda numa aposta desnecessária. Quantidades e capacidade são definidas antes.');
      rewriteCard(offer, 'Edições Sazonais', 'Séries limitadas dão-lhe novidade e uma razão real para voltar a falar com o cliente — sem precisar de manter a mesma prateleira o ano inteiro.');
      rewriteCard(offer, 'Peças em Jesmonite', 'Peças para integrar produto e espaço com a mesma linguagem visual. Faz sentido quando acrescenta apresentação; se for só decoração por decoração, dizemos-lhe.');
    }

    const how = Array.from(mainSections).find((section) => section.querySelector('.detail-kicker')?.textContent.trim() === 'Como começamos');
    if (how) {
      setText('.detail-section__title', 'Primeiro percebemos se vale a pena para os dois lados.', how);
      setText('.detail-copy', 'Diga-nos que espaço tem, quem compra consigo e quanto quer testar. A partir daí sugerimos produtos, quantidades e condições. Sem obrigar a uma encomenda grande só para desbloquear uma conversa.', how);
      rewriteCard(how, 'Condições Profissionais', 'Existe preço profissional e existem mínimos quando fazem sentido. Mas a proposta nasce da selecção e das quantidades reais — não de uma tabela que ignora o seu negócio.');
      rewriteCard(how, 'Proposta Antes de Confirmar', 'Produtos, quantidades, preços, prazos, despesas e pagamento ficam todos escritos antes de confirmar. O objectivo é simples: saber exactamente onde está a pôr o dinheiro.');

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
      setText('.detail-section__title', 'Se a solução não está aqui, diga-nos o que precisa de pôr na prateleira.', convergence);
      setText('.detail-copy', 'Explique o contexto, o público e a ideia. Respondemos com o que conseguimos realmente fazer — não com uma promessa bonita só para ganhar a encomenda.', convergence);
      const action = convergence.querySelector('.btn--primary');
      if (action) {
        action.textContent = 'Falar com a Maison';
        action.href = 'https://wa.me/351923318289?text=' + encodeURIComponent('Olá Maison JF. Estou na área profissional e procuro uma solução diferente para o meu espaço. O que tenho em mente é: ');
        action.target = '_blank';
        action.rel = 'noopener';
      }
    }
  }

  document.querySelectorAll('.conversion-nudge').forEach((nudge) => nudge.remove());
})();
