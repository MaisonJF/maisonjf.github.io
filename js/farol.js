/**
 * MAISON JF® — O Farol v2
 * Sistema de orientação interativo
 * Resultados neutros — sem ofertas inventadas
 */

(function() {
  'use strict';

  // ============================================================
  // DADOS DO FAROL — Estrutura expansível
  // ============================================================
  // Para adicionar novas opções:
  // 1. Adiciona entrada em FAROL_DATA.step1
  // 2. Cria as sub-opções correspondentes em options
  // 3. O resultado será sempre neutro até haver oferta real
  // ============================================================

  const FAROL_DATA = {
    // Passo 1: Dores/Desejos iniciais
    step1: {
      resolver: {
        label: 'Há alguma coisa na minha vida que preciso de resolver.',
        question: 'O que precisas de resolver?',
        options: [
          { key: 'decisao', label: 'Preciso de tomar uma decisão importante.' },
          { key: 'direcao', label: 'Sinto que ando à deriva e preciso de direção.' },
          { key: 'bloqueio', label: 'Sinto-me bloqueado e não sei como sair.' }
        ]
      },
      relacao: {
        label: 'Há alguém ou alguma relação que continua a mexer comigo.',
        question: 'O que te move nesta relação?',
        options: [
          { key: 'compreensao', label: 'Preciso de compreender o que se passa.' },
          { key: 'fecho', label: 'Preciso de fechar um ciclo.' },
          { key: 'incerteza', label: 'Não sei se devo ficar ou ir-me embora.' }
        ]
      },
      cansado: {
        label: 'Estou cansado e preciso de me sentir melhor.',
        question: 'Como é esse cansaço?',
        options: [
          { key: 'fisico', label: 'É físico — o corpo pede descanso.' },
          { key: 'emocional', label: 'É emocional — sinto-me esgotado por dentro.' },
          { key: 'ambos', label: 'É ambos. Preciso de cuidar de mim de verdade.' }
        ]
      },
      espaco: {
        label: 'Quero mudar a forma como me sinto no meu espaço.',
        question: 'O que o teu espaço precisa?',
        options: [
          { key: 'quietude', label: 'Precisa de mais sossego.' },
          { key: 'energia', label: 'Precisa de energia renovada.' },
          { key: 'presenca', label: 'Quero que sinta mais a minha presença nele.' }
        ]
      },
      aprender: {
        label: 'Quero aprender, perceber ou desenvolver alguma coisa.',
        question: 'O que queres desenvolver?',
        options: [
          { key: 'autoconhecimento', label: 'Quero conhecer-me melhor.' },
          { key: 'tarot', label: 'Quero aprender Tarot a sério.' },
          { key: 'astrologia', label: 'Quero perceber a minha carta astral.' }
        ]
      },
      presente: {
        label: 'Quero alguma coisa para mim — ou para alguém.',
        question: 'Para quem é?',
        options: [
          { key: 'para_mim', label: 'Para mim. Preciso de cuidar de mim.' },
          { key: 'para_outro', label: 'Para alguém especial. Quero oferecer presença.' },
          { key: 'para_ambos', label: 'Para nós dois. Quero partilhar algo.' }
        ]
      },
      outro: {
        label: 'É outra coisa.',
        question: 'Conta-nos um pouco mais.',
        options: [
          { key: 'contacto_direto', label: 'Prefiro falar diretamente com alguém.' },
          { key: 'explorar', label: 'Quero explorar sem pressa.' }
        ]
      }
    },

    // Resultados neutros — NENHUMA oferta inventada
    // Cada combinação step1_key + step2_key mapeia para orientação genérica
    results: {
      // === RESOLVER ===
      'resolver_decisao': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'A Maison tem orientação e ferramentas para ajudar em decisões. Explora as soluções disponíveis ou fala connosco diretamente.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'resolver_direcao': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Seja através de orientação pessoal ou de conteúdo para o teu ritmo, a Maison pode ajudar-te a encontrar direção.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'resolver_bloqueio': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Acompanhamos quem sente que está parado. Desde SOS intensivo a orientação contínua, há caminhos para sair do bloqueio.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },

      // === RELAÇÃO ===
      'relacao_compreensao': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'A orientação da Maison pode ajudar-te a perceber dinâmicas que não vês sozinho. Explora as opções de consulta e leitura.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'relacao_fecho': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Fechamos ciclos quando estamos prontos. A Maison pode acompanhar-te nesse processo, com presença e orientação.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'relacao_incerteza': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'A dúvida entre ficar ou partir é humana. A orientação da Maison ajuda-te a ver o que já sentes.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },

      // === CANSADO ===
      'cansado_fisico': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'O corpo pede o que precisa. A Maison tem produtos e formas de cuidado para o descanso que mereces.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'cansado_emocional': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'O esgotamento emocional não se resolve sozinho. Acompanhamos quem precisa de presença real, dia a dia.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'cansado_ambos': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Quando tudo pesa, precisas de um plano. A Maison combina produtos, orientação e acompanhamento contínuo.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },

      // === ESPAÇO ===
      'espaco_quietude': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Transformar o teu espaço começa com pequenas escolhas. A Maison tem produtos criados para criar atmosfera.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'espaco_energia': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Um espaço novo não precisa de obras. Às vezes precisa apenas do aroma certo, da luz certa, da intenção certa.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'espaco_presenca': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'O teu espaço deve cheirar a ti. A Maison cria produtos para ambientes que contam histórias.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },

      // === APRENDER ===
      'aprender_autoconhecimento': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Conhecer-te melhor é um caminho, não um destino. A Maison tem ebooks, consultas e mentorias para o teu ritmo.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'aprender_tarot': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Aprender Tarot a sério exige orientação séria. A Maison oferece formação prática, com profundidade e sem atalhos.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'aprender_astrologia': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'A tua carta astral é um mapa. A Maison ajuda-te a lê-lo com a profundidade que merece.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },

      // === PRESENTE ===
      'presente_para_mim': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Cuidar de ti não é luxo. A Maison tem produtos e experiências para quem decide investir em si próprio.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'presente_para_outro': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'O melhor presente é presença. A Maison tem experiências e produtos para oferecer a quem importa.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },
      'presente_para_ambos': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Partilhar uma experiência cria memórias. A Maison tem opções para momentos a dois.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      },

      // === OUTRO ===
      'outro_contacto_direto': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Nem tudo cabe em categorias. Fala connosco e encontramos o caminho juntos.',
        cta: { text: 'Continuar na Maison', href: '#fecho', style: 'primary' },
        cta2: { text: 'Explorar a Maison', href: '#explorar', style: 'secondary' }
      },
      'outro_explorar': {
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'Navega pela Maison ao teu ritmo. Cada produto e serviço tem uma história para te contar.',
        cta: { text: 'Explorar a Maison', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      }
    }
  };

  // ============================================================
  // ESTADO
  // ============================================================
  let currentStep = 1;
  let step1Choice = null;
  let step2Choice = null;

  // ============================================================
  // ELEMENTOS DOM
  // ============================================================
  const steps = {
    1: document.getElementById('farolStep1'),
    2: document.getElementById('farolStep2'),
    3: document.getElementById('farolStep3')
  };

  const progressDots = document.querySelectorAll('.farol__progress-dot');
  const step2Question = document.getElementById('farolStep2Question');
  const step2Options = document.getElementById('farolStep2Options');
  const step3Result = document.getElementById('farolResult');
  const back2 = document.getElementById('farolBack2');
  const back3 = document.getElementById('farolBack3');

  // ============================================================
  // FUNÇÕES
  // ============================================================

  function updateProgress(step) {
    progressDots.forEach((dot, index) => {
      dot.classList.toggle('farol__progress-dot--active', index < step);
    });
  }

  function showStep(stepNumber) {
    Object.values(steps).forEach(el => {
      el.classList.remove('farol__step--active');
    });
    steps[stepNumber].classList.add('farol__step--active');
    currentStep = stepNumber;
    updateProgress(stepNumber);
  }

  function buildStep2(step1Key) {
    const data = FAROL_DATA.step1[step1Key];
    if (!data) return;

    step1Choice = step1Key;
    step2Question.textContent = data.question;
    step2Options.innerHTML = '';

    data.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'farol__option';
      btn.type = 'button';
      btn.setAttribute('data-step2', opt.key);
      btn.innerHTML = `
        <span class="farol__option-text">${opt.label}</span>
        <svg class="farol__option-arrow" viewBox="0 0 24 24" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      `;
      btn.addEventListener('click', () => handleStep2Choice(opt.key));
      step2Options.appendChild(btn);
    });

    showStep(2);
  }

  function handleStep2Choice(step2Key) {
    step2Choice = step2Key;
    const resultKey = `${step1Choice}_${step2Key}`;
    const result = FAROL_DATA.results[resultKey];

    if (!result) {
      showResult({
        title: 'Há mais do que uma possibilidade para aquilo que procuras.',
        text: 'A Maison tem várias formas de te acompanhar. Explora as opções ou fala connosco diretamente.',
        cta: { text: 'Explorar soluções', href: '#explorar', style: 'primary' },
        cta2: { text: 'Continuar na Maison', href: '#fecho', style: 'secondary' }
      });
      return;
    }

    showResult(result);
  }

  function showResult(result) {
    const ctaClass = result.cta.style === 'primary' ? 'btn btn--primary' : 'btn btn--secondary';
    const cta2Class = result.cta2.style === 'primary' ? 'btn btn--primary' : 'btn btn--secondary';

    step3Result.innerHTML = `
      <h3 class="farol__result-title">${result.title}</h3>
      <p class="farol__result-text">${result.text}</p>
      <div class="farol__result-actions">
        <a href="${result.cta.href}" class="${ctaClass}">${result.cta.text}</a>
        <a href="${result.cta2.href}" class="${cta2Class}">${result.cta2.text}</a>
      </div>
    `;

    showStep(3);
  }

  function resetFarol() {
    step1Choice = null;
    step2Choice = null;
    showStep(1);
  }

  // ============================================================
  // EVENT LISTENERS — Step 1
  // ============================================================
  const step1Options = steps[1].querySelectorAll('.farol__option');
  step1Options.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-farol');
      buildStep2(key);
    });
  });

  const outroBtn = steps[1].querySelector('[data-farol="outro"]');
  if (outroBtn) {
    outroBtn.addEventListener('click', () => buildStep2('outro'));
  }

  // ============================================================
  // EVENT LISTENERS — Navegação
  // ============================================================
  back2.addEventListener('click', () => showStep(1));
  back3.addEventListener('click', resetFarol);

  // ============================================================
  // EXPOSIÇÃO GLOBAL
  // ============================================================
  window.Farol = {
    data: FAROL_DATA,
    reset: resetFarol,
    getState: () => ({ step: currentStep, step1: step1Choice, step2: step2Choice })
  };

})();
