/**
 * MAISON JF® | O Farol
 * Dor -> dor humana -> acolhimento -> solução Maison
 */
(function() {
  'use strict';

  const result = (title, text, primaryHref, primaryText, secondaryHref = null, secondaryText = null) => ({
    title,
    text,
    cta: { text: primaryText, href: primaryHref, style: 'primary' },
    cta2: secondaryHref && secondaryText ? { text: secondaryText, href: secondaryHref, style: 'secondary' } : null
  });

  const FAROL_DATA = {
    step1: {
      decisao: {
        question: 'O que te irrita mais nisto?',
        options: [
          { key: 'voltas', label: 'Dou voltas e volto sempre ao mesmo ponto.' },
          { key: 'medo', label: 'Sei o que quero, mas tenho medo de escolher mal.' },
          { key: 'urgente', label: 'Preciso de uma resposta e não quero ficar nisto mais uma semana.' }
        ]
      },
      relacao: {
        question: 'O que é que esta pessoa ainda te está a fazer?',
        options: [
          { key: 'cabeca', label: 'Ocupa-me a cabeça mais do que eu queria admitir.' },
          { key: 'decidir', label: 'Não sei se fico, se saio ou se espero.' },
          { key: 'entender', label: 'Só quero perceber o que raio se está a passar.' }
        ]
      },
      cansaco: {
        question: 'Cansado de quê?',
        options: [
          { key: 'corpo', label: 'O corpo está a pedir pausa.' },
          { key: 'cabeca', label: 'A cabeça não desliga nem quando o dia acaba.' },
          { key: 'demais', label: 'Isto já não é só cansaço de hoje. Anda a acumular.' }
        ]
      },
      casa: {
        question: 'O que queres sentir quando fechas a porta?',
        options: [
          { key: 'cheiro', label: 'Quero que cheire bem. Sem complicar.' },
          { key: 'parar', label: 'Quero entrar e sentir que posso finalmente parar.' },
          { key: 'mudar', label: 'Quero mudar o ambiente sem mudar a casa inteira.' }
        ]
      },
      aprender: {
        question: 'O que queres levar daqui?',
        options: [
          { key: 'tarot', label: 'Quero aprender Tarot a sério.' },
          { key: 'astrologia', label: 'Quero perceber melhor Astrologia.' },
          { key: 'outra', label: 'É outra coisa. Ainda estou a tentar perceber qual.' }
        ]
      },
      companhia: {
        question: 'O que te faria sair de casa?',
        options: [
          { key: 'evento', label: 'Tenho um evento ou compromisso e não quero ir sozinho.' },
          { key: 'sair', label: 'Apetece-me sair, mas sozinho perco logo a vontade.' },
          { key: 'falar', label: 'Quero companhia e conversa. Só isso.' }
        ]
      },
      presente: {
        question: 'Que tipo de presente queres evitar?',
        options: [
          { key: 'qualquer', label: 'Uma coisa qualquer comprada só para cumprir.' },
          { key: 'casa', label: 'Quero oferecer algo bonito para a casa.' },
          { key: 'corpo', label: 'Quero oferecer uma pausa ou um momento de cuidado.' }
        ]
      },
      outro: {
        question: 'Então vamos simplificar.',
        options: [
          { key: 'ver', label: 'Mostra-me o que a Maison tem.' },
          { key: 'falar', label: 'Prefiro explicar a uma pessoa.' }
        ]
      }
    },

    results: {
      decisao_voltas: result('Já pensaste nisto o suficiente sozinho.', 'Percebo. Quando a mesma pergunta volta sempre, mais pensamento nem sempre ajuda. Começa por uma consulta que te dê estrutura e outras perguntas, sem decidir por ti.', '#orientacao', 'Ver Tarot e consultas'),
      decisao_medo: result('O problema não é falta de opções. É o peso de escolher.', 'Não te vou dizer o que tens de fazer. Podemos olhar para cenários, receios e aquilo que estás a evitar para a decisão deixar de parecer um salto no escuro.', '#orientacao', 'Ver orientação'),
      decisao_urgente: result('Não queres uma tese. Queres desbloquear isto.', 'Se a questão é concreta e urgente, o Tarot Expresso foi pensado para perguntas pontuais. Se precisares de mais contexto, há formatos mais completos.', '#orientacao', 'Ver consultas'),

      relacao_cabeca: result('Essa pessoa já ocupa espaço suficiente sem pagar renda.', 'Se continuas a voltar à mesma conversa, mensagem ou hipótese, podemos começar por perceber o que te prende ali. Depois escolhes se precisas de uma consulta ou de acompanhamento.', '#orientacao', 'Ver orientação', '#continuidade', 'Ver acompanhamento'),
      relacao_decidir: result('Ficar, sair ou esperar não são a mesma decisão.', 'Vamos separar o que sentes, o que sabes e o que estás a imaginar. A Maison pode ajudar-te a olhar para a situação com mais estrutura, sem escolher por ti.', '#orientacao', 'Ver consultas'),
      relacao_entender: result('Às vezes o que mais cansa é não perceber.', 'Começa por uma consulta focada na situação. Se o assunto já se arrasta e uma resposta isolada não chega, há acompanhamento.', '#orientacao', 'Ver consultas', '#continuidade', 'Ver acompanhamento'),

      cansaco_corpo: result('O corpo já te avisou. Não esperes que grite.', 'Começa pequeno e concreto. Escalda-pés, óleo ou vela de massagem. Não resolvem tudo, mas criam uma pausa real hoje.', '#explorar', 'Ver produtos para o corpo'),
      cansaco_cabeca: result('O dia acabou. A tua cabeça ainda não.', 'Muda o primeiro pedaço da noite. Aroma, luz e um gesto simples podem ajudar a marcar a passagem entre estar em modo de fazer e estar em casa.', '#explorar', 'Ver produtos'),
      cansaco_demais: result('Se isto já vem de trás, uma pausa pode não chegar.', 'Podemos começar por perceber o que está a acumular e se precisas de acompanhamento continuado. Não tens de comprar um programa inteiro para fazer a primeira pergunta.', '#continuidade', 'Ver acompanhamento'),

      casa_cheiro: result('Óptimo. Então não compliquemos.', 'Bruma para mudar o ar depressa, difusor para manter o aroma ou vela para juntar cheiro e ambiente. Escolhe pelo uso, não pelo nome mais bonito.', '#explorar', 'Ver produtos'),
      casa_parar: result('Queres que a casa te diga: acabou por hoje.', 'Uma vela, um difusor, wax melts ou um escalda-pés podem ajudar a criar esse marco. O objectivo é simples: entrares e mudares de ritmo.', '#explorar', 'Ver produtos'),
      casa_mudar: result('Não precisas de redecorar a sala toda.', 'Começa pelo que muda mais depressa: cheiro, luz e a forma como usas o espaço. A Maison tem opções para isso.', '#explorar', 'Ver produtos'),

      aprender_tarot: result('Queres aprender Tarot. A sério.', 'Então não te vou mandar para três frases num ebook. A mentoria existe para aprendizagem estruturada e acompanhamento.', '#continuidade', 'Ver mentoria'),
      aprender_astrologia: result('Queres perceber o mapa, não decorar signos.', 'Há relatórios, análises e trabalho de Astrologia para aprofundar uma questão concreta ou um mapa maior.', '#servicos', 'Ver serviços'),
      aprender_outra: result('Ainda não tens de saber dar-lhe um nome.', 'Vê os serviços e, se nada encaixar, fala com a Maison. Primeiro percebemos o que procuras. Depois vemos se existe uma solução real.', '#servicos', 'Explorar serviços'),

      companhia_evento: result('Tens onde ir. Falta-te não ir sozinho.', 'A Companhia da Maison pode acompanhar-te em eventos, jantares e outros compromissos sociais. É companhia social, sem romance nem ambiguidades.', '#companhia', 'Ver Companhia'),
      companhia_sair: result('Às vezes o difícil é mesmo sair pela porta.', 'Se sozinho perdes a vontade, a Companhia da Maison existe para passeios, cinema, refeições e outras actividades simples.', '#companhia', 'Ver Companhia'),
      companhia_falar: result('Queres presença. Não uma história complicada.', 'Companhia, conversa e uma actividade combinada. Sem transformar isso noutra coisa.', '#companhia', 'Ver Companhia'),

      presente_qualquer: result('Então não ofereças uma coisa qualquer.', 'Escolhe pelo que a pessoa vai usar: casa, corpo, aroma ou pausa. Se não souberes, diz-nos para quem é e ajudamos-te a reduzir as opções.', '#explorar', 'Ver produtos'),
      presente_casa: result('Queres oferecer algo que fique na casa e seja usado.', 'Vela, bruma, difusor ou wax melts. Escolhe pelo tipo de uso e pelo orçamento.', '#explorar', 'Ver produtos'),
      presente_corpo: result('Queres oferecer uma desculpa para a pessoa parar.', 'Escalda-pés, óleo ou vela de massagem são opções simples e concretas.', '#explorar', 'Ver produtos'),

      outro_ver: result('Sem problema. Vai directo ao que existe.', 'Produtos, serviços, acompanhamento e Companhia estão reunidos no site. Começa pelo que te chama a atenção e vê se resolve alguma coisa real.', '#explorar', 'Explorar a Maison'),
      outro_falar: result('Às vezes é mais fácil explicar do que escolher.', 'Fala connosco. Diz o que se passa em português normal e vemos contigo se a Maison tem alguma coisa que faça sentido.', 'https://wa.me/351923318289?text=Ol%C3%A1%20Maison%20JF.%20Prefiro%20explicar%20o%20que%20se%20passa%20e%20pedir%20ajuda%20a%20escolher.', 'Falar com a Maison')
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
    progressDots.forEach((dot, index) => dot.classList.toggle('farol__progress-dot--active', index < step));
  }

  function showStep(stepNumber) {
    Object.values(steps).forEach(el => { if (el) el.classList.remove('farol__step--active'); });
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
      btn.innerHTML = `<span class="farol__option-text">${opt.label}</span><svg class="farol__option-arrow" viewBox="0 0 24 24" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
      btn.addEventListener('click', () => handleStep2Choice(opt.key));
      step2Options.appendChild(btn);
    });
    showStep(2);
  }

  function handleStep2Choice(step2Key) {
    step2Choice = step2Key;
    const selected = FAROL_DATA.results[`${step1Choice}_${step2Key}`];
    if (!selected) {
      showResult(result('Não te vou inventar uma resposta.', 'Fala com a Maison e explica o que procuras. Se houver uma solução real, dizemos-te qual. Se não houver, também.', 'https://wa.me/351923318289?text=Ol%C3%A1%20Maison%20JF.%20Preciso%20de%20ajuda%20a%20encontrar%20a%20op%C3%A7%C3%A3o%20certa.', 'Falar com a Maison'));
      return;
    }
    showResult(selected);
  }

  function showResult(selected) {
    if (!step3Result) return;
    const ctaClass = selected.cta.style === 'primary' ? 'btn btn--primary' : 'btn btn--secondary';
    const primaryExternal = selected.cta.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    const secondary = selected.cta2 ? `<a href="${selected.cta2.href}" class="${selected.cta2.style === 'primary' ? 'btn btn--primary' : 'btn btn--secondary'}">${selected.cta2.text}</a>` : '';
    step3Result.innerHTML = `<h3 class="farol__result-title">${selected.title}</h3><p class="farol__result-text">${selected.text}</p><div class="farol__result-actions"><a href="${selected.cta.href}" class="${ctaClass}"${primaryExternal}>${selected.cta.text}</a>${secondary}</div>`;
    showStep(3);
  }

  function resetFarol() {
    step1Choice = null;
    step2Choice = null;
    showStep(1);
  }

  if (steps[1]) {
    steps[1].querySelectorAll('[data-farol]').forEach(btn => {
      btn.addEventListener('click', () => buildStep2(btn.getAttribute('data-farol')));
    });
  }
  if (back2) back2.addEventListener('click', () => showStep(1));
  if (back3) back3.addEventListener('click', resetFarol);

  window.Farol = { data: FAROL_DATA, reset: resetFarol, getState: () => ({ step: currentStep, step1: step1Choice, step2: step2Choice }) };
})();
