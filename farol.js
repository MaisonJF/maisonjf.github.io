/**
 * MAISON JF® | O Farol
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
      decisao_voltas: result('Já fizeste a lista dos prós e contras. Continuas sem conseguir escolher.', 'Já tens informação. O que não tens é descanso. Uma Consulta pode ajudar-te a olhar para o que estás a evitar e para o que realmente queres, sem decidir por ti.', 'servicos.html#tarot', 'Ver Tarot e Consultas'),
      decisao_medo: result('Sabes o que queres. O que te assusta é seres tu a carregar a consequência.', 'Quando imaginas todas as maneiras de a escolha correr mal, ficar parado parece mais seguro. Podemos olhar para cenários, receios e aquilo que estás a evitar, sem escolher por ti.', 'servicos.html#tarot', 'Ver Orientação'),
      decisao_urgente: result('Não queres uma tese. Queres desbloquear isto.', 'Se a questão é concreta e urgente, o Tarot Expresso foi pensado para perguntas pontuais. Se precisares de mais contexto, há formatos mais completos.', 'servicos.html#tarot', 'Ver Consultas'),

      relacao_cabeca: result('Já não falas com essa pessoa o tempo todo. Mas falas com ela na tua cabeça.', 'Relees mensagens, refazes conversas e imaginas respostas que talvez nunca venham. Uma Consulta pode ajudar a perceber o que te prende ali; se isto já se arrasta, há Acompanhamento.', 'servicos.html#tarot', 'Ver Orientação', 'servicos.html#acompanhamento', 'Ver Acompanhamento'),
      relacao_decidir: result('Ficar, sair ou esperar não são a mesma decisão.', 'Se qualquer escolha te parece perigosa, vais continuar parado. Uma Consulta ajuda-te a olhar para o que existe de facto, para o que temes e para o que queres, sem decidir por ti.', 'servicos.html#tarot', 'Ver Consultas'),
      relacao_entender: result('Às vezes o que mais cansa é não perceber.', 'Começa por uma Consulta focada na situação. Se o assunto já se arrasta e uma resposta isolada não chega, há Acompanhamento.', 'servicos.html#tarot', 'Ver Consultas', 'servicos.html#acompanhamento', 'Ver Acompanhamento'),

      cansaco_corpo: result('Chegas ao fim do dia e já não tens nada para ti.', 'Quando até descansar parece esforço, não precisas de transformar a vida toda hoje. Podes começar com um Escalda-Pés, Óleo de Massagem ou, sob consulta, um Banho de Ervas.', 'produtos.html#escalda-pes', 'Ver Produtos para o Corpo'),
      cansaco_cabeca: result('O corpo chegou a casa. A cabeça ainda está lá.', 'Se ainda estás a responder mentalmente à conversa, ao trabalho ou ao problema, a noite nunca começou verdadeiramente. Aroma, luz e ambiente podem ajudar a marcar esse corte.', 'produtos.html#brumas', 'Ver Produtos'),
      cansaco_demais: result('Se isto já vem de trás, uma pausa pode não chegar.', 'Se acordas cansado antes de o dia começar, isto já não é só o cansaço de hoje. Podes começar por uma conversa e perceber se precisas de continuidade.', 'servicos.html#acompanhamento', 'Ver Acompanhamento'),

      casa_cheiro: result('Óptimo. Então não compliquemos.', 'Bruma para mudar o ar depressa, água de lençóis para o quarto ou, em breve, uma nova Vela Aromática de Outono. Escolhe pelo uso, não pelo nome mais bonito.', 'produtos.html', 'Ver Produtos'),
      casa_parar: result('Queres que a casa te diga: acabou por hoje.', 'Uma bruma, uma água de lençóis ou um Escalda-Pés podem ajudar a criar esse marco. E as novas Velas Aromáticas chegam com a edição de Outono.', 'produtos.html', 'Ver Produtos'),
      casa_mudar: result('Não precisas de redecorar a sala toda.', 'Começa pelo que muda mais depressa: cheiro, luz e a forma como usas o espaço. A Maison tem opções para isso.', 'produtos.html', 'Ver Produtos'),

      aprender_tarot: result('Queres aprender Tarot. A sério.', 'Então não te vou mandar para três frases num ebook. A Mentoria existe para aprendizagem estruturada e acompanhamento.', 'servicos.html#acompanhamento', 'Ver Mentoria'),
      aprender_astrologia: result('Queres perceber o mapa, não decorar signos.', 'Há Relatórios, Análises e Trabalho de Astrologia para aprofundar uma questão concreta ou um mapa maior.', 'servicos.html', 'Ver Serviços'),
      aprender_outra: result('Ainda não tens de saber dar-lhe um nome.', 'Vê os serviços e, se nada encaixar, fala com a Maison. Primeiro percebemos o que procuras. Depois vemos se existe uma solução real.', 'servicos.html', 'Explorar Serviços'),

      companhia_evento: result('Já tens o convite. O que ainda não tens é vontade de chegar sozinho.', 'Se já pensaste em inventar uma desculpa só para não aparecer sozinho, a Companhia pode acompanhar-te em Eventos, Jantares e outros Compromissos Sociais, sem romance nem ambiguidades.', 'companhia.html', 'Ver Companhia'),
      companhia_sair: result('Queres ir. Mas já estás a inventar razões para ficar em casa.', 'Não tens de transformar companhia numa relação para ter alguém ao lado. A Companhia existe para Passeios, Cinema, Refeições e outras Actividades simples.', 'companhia.html', 'Ver Companhia'),
      companhia_falar: result('Queres presença. Não uma história complicada.', 'Companhia, conversa e uma actividade combinada. Sem transformar isso noutra coisa.', 'companhia.html', 'Ver Companhia'),

      presente_qualquer: result('Então não ofereças uma coisa qualquer.', 'Escolhe pelo que a pessoa vai usar: casa, corpo, aroma ou pausa. Se não souberes, diz-nos para quem é e ajudamos-te a reduzir as opções.', 'produtos.html', 'Ver Produtos'),
      presente_casa: result('Queres oferecer algo que fique na casa e seja usado.', 'Bruma, água de lençóis, uma peça decorativa em jesmonite sob consulta ou, em breve, uma vela da edição de Outono. Escolhe pelo tipo de uso e pelo orçamento.', 'produtos.html', 'Ver Produtos'),
      presente_corpo: result('Queres oferecer uma desculpa para a pessoa parar.', 'Escalda-Pés, Óleo de Massagem ou um Banho de Ervas sob consulta são opções simples e concretas.', 'produtos.html', 'Ver Produtos'),

      outro_ver: result('Sem problema. Vai directo ao que existe.', 'Produtos, Serviços, Acompanhamento e Companhia estão reunidos no site. Começa pelo que te chama a atenção e vê se resolve alguma coisa real.', 'produtos.html', 'Explorar a Maison'),
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
