/**
 * MAISON JF® | O Farol v3
 * Sistema de orientação interativo
 * Máximo de 3 passos, client-side, dados editáveis.
 */

(function() {
  'use strict';

  const result = (text, primaryHref, primaryText, secondaryHref = null, secondaryText = null) => ({
    title: 'Há mais do que uma possibilidade para aquilo que procuras.',
    text,
    cta: { text: primaryText, href: primaryHref, style: 'primary' },
    cta2: secondaryHref && secondaryText
      ? { text: secondaryText, href: secondaryHref, style: 'secondary' }
      : null
  });

  const FAROL_DATA = {
    step1: {
      resolver: {
        label: 'Há alguma coisa na minha vida que preciso de resolver.',
        question: 'O que está a prender isto?',
        options: [
          { key: 'decisao', label: 'Preciso de tomar uma decisão.' },
          { key: 'direcao', label: 'Não sei o que fazer a seguir.' },
          { key: 'bloqueio', label: 'Já sei que preciso de mexer nisto, mas continuo parado.' }
        ]
      },
      relacao: {
        label: 'Há alguém ou alguma relação que continua a mexer comigo.',
        question: 'O que está a acontecer?',
        options: [
          { key: 'compreensao', label: 'Quero perceber melhor o que se passa.' },
          { key: 'desligar', label: 'Não consigo desligar desta pessoa.' },
          { key: 'incerteza', label: 'Não sei se fico, se saio ou se espero.' }
        ]
      },
      cansado: {
        label: 'Estou cansado e preciso de me sentir melhor.',
        question: 'O que precisas mais neste momento?',
        options: [
          { key: 'parar', label: 'Preciso de parar e descansar.' },
          { key: 'desligar', label: 'Quero deixar o dia do lado de fora por um bocado.' },
          { key: 'continuidade', label: 'Isto já não é só um dia mau. Preciso de acompanhamento.' }
        ]
      },
      espaco: {
        label: 'Quero mudar a forma como me sinto no meu espaço.',
        question: 'O que queres mudar primeiro?',
        options: [
          { key: 'cheiro', label: 'Quero que a casa cheire melhor.' },
          { key: 'atmosfera', label: 'Quero criar outra atmosfera.' },
          { key: 'momento', label: 'Quero tornar um momento da casa mais especial.' }
        ]
      },
      aprender: {
        label: 'Quero aprender, perceber ou desenvolver alguma coisa.',
        question: 'O que queres aprender ou perceber?',
        options: [
          { key: 'tarot', label: 'Quero aprender Tarot a sério.' },
          { key: 'astrologia', label: 'Quero perceber melhor astrologia.' },
          { key: 'outra', label: 'É outra coisa.' }
        ]
      },
      presente: {
        label: 'Quero alguma coisa para mim ou para alguém.',
        question: 'Para quem é?',
        options: [
          { key: 'para_mim', label: 'É para mim.' },
          { key: 'para_outro', label: 'É para oferecer.' },
          { key: 'para_ambos', label: 'Quero alguma coisa para partilhar.' }
        ]
      },
      outro: {
        label: 'É outra coisa.',
        question: 'Qual destas opções se aproxima mais?',
        options: [
          { key: 'explorar', label: 'Quero ver o que a Maison tem.' },
          { key: 'nao_sei', label: 'Ainda não sei bem como explicar.' }
        ]
      }
    },

    results: {
      resolver_decisao: result(
        'Se procuras uma forma de olhar para a decisão com mais informação e estrutura, começa pela área de orientação. A Maison não decide por ti.',
        '#orientacao', 'Ver orientação'
      ),
      resolver_direcao: result(
        'Quando não sabes o que fazer a seguir, vale a pena perceber primeiro que tipo de ajuda procuras. Tarot, relatórios e análises estão na área de orientação.',
        '#orientacao', 'Ver orientação'
      ),
      resolver_bloqueio: result(
        'Se precisas de continuidade em vez de uma resposta isolada, vê os acompanhamentos, mentorias e formatos SOS disponíveis na Maison.',
        '#continuidade', 'Ver continuidade', '#orientacao', 'Ver orientação'
      ),

      relacao_compreensao: result(
        'Para questões de relação, a Maison tem consultas de Tarot, relatórios e análises. Começa por ver os formatos de orientação que já existem.',
        '#orientacao', 'Ver orientação'
      ),
      relacao_desligar: result(
        'Se esta pessoa continua a ocupar demasiado espaço na tua cabeça, não te vamos empurrar uma solução ao acaso. Vê orientação e continuidade e escolhe o formato que faz sentido para ti.',
        '#orientacao', 'Ver orientação', '#continuidade', 'Ver continuidade'
      ),
      relacao_incerteza: result(
        'Ficar, sair ou esperar são decisões diferentes. Se queres olhar para a situação antes de agir, começa pelas opções de orientação da Maison.',
        '#orientacao', 'Ver orientação'
      ),

      cansado_parar: result(
        'Se o que precisas é uma pausa concreta, começa pelo corpo. Escalda-pés, sais de banho, óleo de massagem e velas de massagem são algumas das opções reais da Maison.',
        '#produtos', 'Ver produtos'
      ),
      cansado_desligar: result(
        'Às vezes não é preciso resolver a vida inteira. É preciso criar um intervalo. Vê os produtos para corpo e ambiente e escolhe o que cabe no teu momento.',
        '#produtos', 'Ver produtos'
      ),
      cansado_continuidade: result(
        'Se procuras continuidade, vê os acompanhamentos personalizados e os formatos SOS. Escolhe apenas o que corresponde ao tipo de apoio que procuras.',
        '#continuidade', 'Ver continuidade'
      ),

      espaco_cheiro: result(
        'Se queres começar pelo cheiro, vê velas aromáticas, brumas, mikados e outras opções de ambiente já existentes na Maison.',
        '#produtos', 'Ver produtos'
      ),
      espaco_atmosfera: result(
        'Mudar a atmosfera não exige mudar a casa inteira. Começa por luz, aroma e pelos produtos que fazem diferença no uso real do espaço.',
        '#produtos', 'Ver produtos'
      ),
      espaco_momento: result(
        'Se queres tornar um momento da casa mais especial, começa pelos produtos de ambiente e corpo que já fazem parte da Maison.',
        '#produtos', 'Ver produtos'
      ),

      aprender_tarot: result(
        'Se queres aprender Tarot a sério, vê a área de continuidade. A mentoria é uma das ofertas reais da Maison.',
        '#continuidade', 'Ver mentorias'
      ),
      aprender_astrologia: result(
        'Se queres perceber melhor astrologia, começa pelos relatórios e análises disponíveis na área de orientação.',
        '#orientacao', 'Ver relatórios e análises'
      ),
      aprender_outra: result(
        'Ainda não há informação suficiente para te indicar uma oferta específica sem inventar. Explora as áreas reais da Maison e vê se alguma corresponde ao que procuras.',
        '#explorar', 'Explorar a Maison'
      ),

      presente_para_mim: result(
        'Se é para ti, não precisas de justificar a compra. Vê os produtos da Maison e escolhe pelo uso que lhes queres dar.',
        '#produtos', 'Ver produtos'
      ),
      presente_para_outro: result(
        'Não tens de oferecer qualquer coisa só para não aparecer de mãos vazias. Vê os produtos disponíveis e escolhe algo que a pessoa vá mesmo querer usar.',
        '#produtos', 'Ver produtos'
      ),
      presente_para_ambos: result(
        'Se é para partilhar, começa pelos produtos de ambiente, banho e corpo. Não vamos inventar um kit que ainda não existe.',
        '#produtos', 'Ver produtos'
      ),

      outro_explorar: result(
        'Perfeito. Vai direto às áreas da Maison e vê apenas aquilo que existe neste momento.',
        '#explorar', 'Explorar a Maison'
      ),
      outro_nao_sei: result(
        'Não te vamos empurrar uma resposta só para fechar o Farol. Explora a Maison ou recomeça e escolhe a opção que ficar mais perto do que estás a viver.',
        '#explorar', 'Explorar a Maison'
      )
    }
  };

  let currentStep = 1;
  let step1Choice = null;
  let step2Choice = null;

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

  function updateProgress(step) {
    progressDots.forEach((dot, index) => {
      dot.classList.toggle('farol__progress-dot--active', index < step);
    });
  }

  function showStep(stepNumber) {
    Object.values(steps).forEach(el => {
      if (el) el.classList.remove('farol__step--active');
    });
    if (!steps[stepNumber]) return;
    steps[stepNumber].classList.add('farol__step--active');
    currentStep = stepNumber;
    updateProgress(stepNumber);
  }

  function buildStep2(step1Key) {
    const data = FAROL_DATA.step1[step1Key];
    if (!data || !step2Question || !step2Options) return;

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
    const selected = FAROL_DATA.results[resultKey];

    if (!selected) {
      showResult(result(
        'Ainda não há informação suficiente para te indicar uma solução específica sem inventar. Vê o que existe na Maison neste momento.',
        '#explorar', 'Explorar a Maison'
      ));
      return;
    }

    showResult(selected);
  }

  function showResult(selected) {
    if (!step3Result) return;

    const ctaClass = selected.cta.style === 'primary' ? 'btn btn--primary' : 'btn btn--secondary';
    const secondary = selected.cta2
      ? `<a href="${selected.cta2.href}" class="${selected.cta2.style === 'primary' ? 'btn btn--primary' : 'btn btn--secondary'}">${selected.cta2.text}</a>`
      : '';

    step3Result.innerHTML = `
      <h3 class="farol__result-title">${selected.title}</h3>
      <p class="farol__result-text">${selected.text}</p>
      <div class="farol__result-actions">
        <a href="${selected.cta.href}" class="${ctaClass}">${selected.cta.text}</a>
        ${secondary}
      </div>
    `;

    showStep(3);
  }

  function resetFarol() {
    step1Choice = null;
    step2Choice = null;
    showStep(1);
  }

  if (steps[1]) {
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
  }

  if (back2) back2.addEventListener('click', () => showStep(1));
  if (back3) back3.addEventListener('click', resetFarol);

  window.Farol = {
    data: FAROL_DATA,
    reset: resetFarol,
    getState: () => ({ step: currentStep, step1: step1Choice, step2: step2Choice })
  };
})();
