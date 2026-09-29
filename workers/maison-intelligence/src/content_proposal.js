import { sha256Hex } from './core.js';

const EDITORIAL=Object.freeze({
  'adiar-o-sono-para-recuperar-autonomia':{
    axis:'cabeca',
    hook:'Não queres ficar acordado. Queres recuperar uma parte do dia que sentes que nunca foi tua.',
    body:'Quando o dia inteiro foi feito de obrigações, a noite pode parecer o primeiro momento realmente teu. O problema começa quando precisas de roubar esse tempo ao descanso.',
    caption:'Talvez não estejas a adiar o sono. Talvez estejas a tentar não entregar a última parte do dia.',
    visual:'luz baixa, fim de noite, uma pessoa finalmente sozinha num espaço calmo',
    destination:'/teste/'
  },
  'ansiedade-antecipatoria-na-transicao-domingo-semana':{
    axis:'cabeca',
    hook:'Às vezes a segunda-feira começa antes de o domingo acabar.',
    body:'Não porque haja algo para resolver agora. A cabeça apenas começa a viver mensagens, tarefas e reuniões antes de elas chegarem.',
    caption:'Preparar a semana é uma coisa. Perder o fim-de-semana para ela é outra.',
    visual:'fim de tarde de domingo, casa tranquila, telemóvel pousado e luz a desaparecer',
    destination:'/teste/'
  },
  'atencao-fragmentada-por-interrupcoes-digitais':{
    axis:'cabeca',
    hook:'Talvez o problema não seja o tempo de ecrã. Talvez seja nunca ficares tempo suficiente numa coisa só.',
    body:'Cada notificação parece pequena. Mas cada interrupção obriga a cabeça a largar um fio e reconstruí-lo outra vez.',
    caption:'Há cansaço que vem menos do que fizeste e mais das vezes que tiveste de recomeçar.',
    visual:'secretária simples, vários pequenos sinais digitais a interromper uma tarefa',
    destination:'/teste/'
  },
  'auto-silenciamento-para-preservar-o-vinculo':{
    axis:'cabeca',
    hook:'Se para manter a paz tens de desaparecer da conversa, isso também tem um custo.',
    body:'Há relações em que ninguém manda calar. Mesmo assim, aprendes a engolir necessidades, opiniões e desconforto para não arriscar a reacção do outro.',
    caption:'Paz não devia significar ausência da tua voz.',
    visual:'duas pessoas próximas, uma em silêncio, tensão contida e enquadramento íntimo',
    destination:'/teste/'
  },
  'autonomia-condicionada-pelo-medo-da-reaccao':{
    axis:'cabeca',
    hook:'Uma escolha deixa de parecer livre quando já estás a calcular o preço emocional da reacção do outro.',
    body:'Nem sempre existe uma proibição. Às vezes existe silêncio, culpa, frieza ou tensão suficiente para começares a mudar as tuas decisões antes de escolher.',
    caption:'Liberdade também se mede pelo que acontece depois de dizeres sim ou não.',
    visual:'porta entreaberta, pessoa prestes a sair, ambiente doméstico silencioso',
    destination:'/teste/'
  },
  'carga-mental-invisivel-da-casa':{
    axis:'casa',
    hook:'Fazer a tarefa não é o mesmo que carregar a responsabilidade de se lembrar dela.',
    body:'Há quem faça. E há quem repare, antecipe, planeie, confirme, delegue e mantenha tudo mentalmente aberto até alguém fazer.',
    caption:'O trabalho invisível continua a ser trabalho.',
    visual:'cozinha real ao fim do dia, lista mental sugerida por pequenos objectos por resolver',
    destination:'/teste/'
  },
  'cuidar-sem-desaparecer-no-papel-de-cuidador':{
    axis:'cabeca',
    hook:'Cuidar de alguém não devia exigir deixares de existir fora desse papel.',
    body:'O amor pode ser real e o cansaço também. Descansar, pedir ajuda ou proteger uma parte da tua vida não apaga o vínculo.',
    caption:'Há uma diferença entre cuidar e desaparecer dentro do cuidado.',
    visual:'gesto de cuidado numa casa, seguido de um momento breve de descanso sozinho',
    destination:'/teste/'
  },
  'culpa-ao-descansar-como-se-o-descanso-tivesse-de-ser-merecido':{
    axis:'cabeca',
    hook:'Se descansar te faz sentir culpado, talvez ainda estejas a trabalhar por dentro.',
    body:'Podes estar parado no sofá e continuar a fazer contas ao que devias produzir, acabar ou merecer antes de te permitires parar.',
    caption:'Descanso não é um prémio por teres chegado ao limite.',
    visual:'sofá, luz suave, chá ou livro, corpo parado mas mãos ainda inquietas',
    destination:'/teste/'
  },
  'doomscrolling-para-tentar-reduzir-incerteza':{
    axis:'cabeca',
    hook:'Há uma altura em que procurar mais informação já não te informa. Só te mantém em alerta.',
    body:'Continuas a deslizar porque parece que a próxima notícia vai finalmente dar controlo. Mas a corrente nunca termina.',
    caption:'Estar informado e ficar preso ao feed não são a mesma coisa.',
    visual:'rosto iluminado pelo telemóvel numa divisão escura, gesto de pousar o ecrã',
    destination:'/teste/'
  },
  'evitamento-financeiro-sob-escassez':{
    axis:'cabeca',
    hook:'Quando o dinheiro aperta, até abrir a conta pode parecer demasiado.',
    body:'A escassez ocupa espaço mental. E quanto mais pesado parece olhar para o problema, mais fácil fica adiar exactamente a decisão que precisava de atenção.',
    caption:'Evitar por sobrecarga não faz o problema desaparecer. Só o deixa sem nome.',
    visual:'mesa simples com contas fechadas, telemóvel pousado e gesto hesitante',
    destination:'/teste/'
  },
  'ficar-em-suspenso-enquanto-se-espera-uma-resposta-importante':{
    axis:'cabeca',
    hook:'Vigiar não faz a resposta chegar mais depressa.',
    body:'Depois de enviares a candidatura, fazeres o exame ou teres a conversa, há um ponto em que já fizeste a tua parte. Mesmo assim, a cabeça continua a verificar.',
    caption:'A vida não precisa de ficar parada enquanto a resposta ainda não chegou.',
    visual:'telemóvel sobre a mesa, pessoa afasta-se dele e volta a uma rotina simples',
    destination:'/teste/'
  },
  'luto-por-um-futuro-que-deixou-de-ser-possivel':{
    axis:'cabeca',
    hook:'Também se faz luto por coisas que nunca chegaram a acontecer.',
    body:'Há futuros que não acabaram porque os viveste. Acabaram porque, a certa altura, percebeste que já não podiam acontecer da mesma maneira.',
    caption:'Nem toda a perda tem fotografias. Algumas tinham apenas futuro.',
    visual:'janela, caixa com objectos vazia ou espaço doméstico quieto, sem dramatização excessiva',
    destination:'/teste/'
  },
  'micro-luxo-como-recompensa-e-ritual':{
    axis:'corpo',
    hook:'Nem todo o luxo precisa de mudar a tua vida. Às vezes basta mudar uma terça-feira.',
    body:'Um pequeno objecto, um aroma ou um ritual pode marcar uma vitória e dar forma a um momento que, de outra maneira, passava despercebido.',
    caption:'Pequeno não quer dizer irrelevante. Há prazeres que funcionam precisamente porque cabem na vida real.',
    visual:'pequeno produto Maison numa mesa elegante, gesto de acender, abrir ou usar',
    destination:'/produtos/'
  },
  'perda-ambigua-sem-fecho-claro':{
    axis:'cabeca',
    hook:'Há perdas que não acabam. Mudam de forma e deixam-te sem uma conclusão limpa.',
    body:'A pessoa, o vínculo ou o papel pode continuar presente de alguma maneira e, ao mesmo tempo, já não estar disponível como antes.',
    caption:'Nem sempre existe fecho. Às vezes existe apenas uma nova forma de continuar.',
    visual:'duas cadeiras, uma presença sugerida e outra ausência, luz natural',
    destination:'/teste/'
  },
  'precisar-de-solidao-para-recuperar-energia-social':{
    axis:'cabeca',
    hook:'Gostares das pessoas não significa teres energia para elas todos os dias.',
    body:'Há alturas em que silêncio, espaço e algumas horas sozinho não são rejeição. São a forma de voltares a ter alguma coisa para dar.',
    caption:'Precisar de espaço não é o mesmo que querer desaparecer.',
    visual:'pessoa sozinha em casa com luz confortável, telemóvel em modo silencioso',
    destination:'/teste/'
  },
  'presenca-que-ampara-sem-tentar-resolver':{
    axis:'cabeca',
    hook:'Nem sempre precisas de uma solução. Às vezes precisas que alguém fique.',
    body:'Quando estás assustado, cansado ou à espera, um conselho perfeito pode valer menos do que uma presença que não tenta corrigir-te.',
    caption:'Ouvir também é fazer alguma coisa.',
    visual:'duas pessoas sentadas lado a lado, gesto simples de presença e silêncio',
    destination:'/teste/'
  },
  'pressao-social-para-gastar-e-vergonha-de-dizer-nao':{
    axis:'cabeca',
    hook:'Há planos que ficam caros antes de chegares à conta.',
    body:'O preço também pode ser dizer que não cabe no orçamento, recear ficar de fora ou sentir que tens de gastar para provar que pertences.',
    caption:'Um limite financeiro não devia obrigar-te a desaparecer do grupo.',
    visual:'mesa de grupo, conta pousada, expressão contida e ambiente normal',
    destination:'/teste/'
  },
  'quando-o-que-funciona-na-relacao-se-torna-invisivel':{
    axis:'cabeca',
    hook:'É fácil contar o que faltou. O que funcionou muitas vezes já virou paisagem.',
    body:'O café que não veio chama atenção. O gesto que aparece todos os dias pode deixar de entrar no inventário.',
    caption:'Reconhecer o que funciona não apaga o que precisa de mudar.',
    visual:'pequeno gesto doméstico de cuidado, deixado discretamente para outra pessoa',
    destination:'/teste/'
  },
  'rituais-sensoriais-com-plantas-como-marcadores-de-transicao':{
    axis:'casa',
    hook:'Às vezes o corpo precisa de perceber que o dia mudou.',
    body:'Um aroma, água quente, uma vela ou um gesto repetido podem marcar a passagem entre trabalhar, chegar a casa e voltar a estar presente.',
    caption:'Não precisa de ser uma grande cerimónia. Precisa de ser um sinal que o corpo reconheça.',
    visual:'ritual Maison simples com aroma, vapor, vela ou elementos vegetais, estética premium',
    destination:'/produtos/'
  },
  'sobrecarga-de-escolha-quando-mais-opcoes-paralisam':{
    axis:'cabeca',
    hook:'Mais opções nem sempre dão mais liberdade. Às vezes só tornam mais difícil escolher.',
    body:'Comparas, voltas atrás, procuras mais uma alternativa e acabas menos confiante do que quando começaste.',
    caption:'Escolher também implica aceitar que alguma coisa fica de fora.',
    visual:'várias opções semelhantes numa mesa, mão hesitante e depois escolha simples',
    destination:'/teste/'
  },
  'solidao-com-contacto-sem-conexao-de-qualidade':{
    axis:'cabeca',
    hook:'Podes falar com muita gente e continuar sem sentir que alguém te vê.',
    body:'Quantidade de mensagens, convívios ou contactos não garante intimidade, reciprocidade ou apoio real.',
    caption:'Companhia e conexão não são sinónimos.',
    visual:'pessoa entre outras pessoas, foco visual nela apesar do movimento à volta',
    destination:'/teste/'
  },
  'telepressao-e-disponibilidade-permanente':{
    axis:'cabeca',
    hook:'Às vezes ninguém te pediu resposta imediata. Mesmo assim, a mensagem já ficou a ocupar espaço na tua cabeça.',
    body:'Responder depressa transforma-se em reflexo. Ficar offline começa a parecer culpa, descuido ou risco de falhar alguém.',
    caption:'Estar presente não devia significar estar sempre alcançável.',
    visual:'telemóvel com notificações, mão desliga o ecrã e regressa ao espaço real',
    destination:'/teste/'
  },
  'descoberta-organica-e-reconhecimento-da-maison':{
    axis:'transversal',
    hook:'Uma marca pode ter exactamente a resposta certa e continuar invisível para quem já a procura.',
    body:'Descoberta começa antes da compra. É aparecer no momento em que alguém procura uma linguagem, um gesto ou uma resposta que a Maison já sabe oferecer.',
    caption:'Ser encontrado é parte do produto.',
    visual:'pesquisa, ecrã com maison-jf.com e transição para activos reais da Maison',
    destination:'/'
  },
  'atelier-principios-transferiveis-e-dna-maison':{
    axis:'transversal',
    hook:'As melhores ideias raramente nascem do zero. Nascem de perceber por que certas coisas funcionam.',
    body:'A Maison pode estudar atenção, desejo, memória e cultura sem copiar a expressão de ninguém. O valor está em perceber o mecanismo e transformá-lo em linguagem própria.',
    caption:'Aprender o princípio. Recriar a expressão.',
    visual:'mesa de atelier com referências, notas, materiais e objectos Maison, sem mostrar marcas alheias',
    destination:'/'
  }
});

function priority(alert){
  return Math.max(0,Math.min(100,Number(alert?.ocean_alert_priority ?? alert?.strength ?? 0)));
}
function safeText(value,max=600){
  return String(value||'').replace(/[—–]/g,',').replace(/\s+/g,' ').trim().slice(0,max);
}
export async function buildEditorialProposal({brainAlert,oceanContext}={}){
  if(!brainAlert||!oceanContext)return null;
  const score=priority(brainAlert);
  if(score<70)return null;
  const card=EDITORIAL[oceanContext.oceanKey];
  if(!card)return null;
  const identity={
    ocean:oceanContext.oceanKey,
    alert:brainAlert.observation_id,
    kind:brainAlert.ocean_alert_kind,
    priority:score
  };
  const proposalId='cntp_'+(await sha256Hex(JSON.stringify(identity))).slice(0,32);
  const high=score>=85;
  return {
    contract_version:'BRAIN-CONTENT-PROPOSAL-1.0',
    proposal_id:proposalId,
    state:'ready_for_editorial_review',
    source:{
      ocean_key:oceanContext.oceanKey,
      alert_id:brainAlert.observation_id,
      evidence_refs:[...(brainAlert.evidence_refs||[])],
      independent_roots:[...(brainAlert.independent_roots||[])],
      priority:score,
      alert_kind:brainAlert.ocean_alert_kind
    },
    editorial_decision:{
      worth_attention_today:high,
      priority_band:high?'today':'queue',
      reason:high?'strong_relevance_or_commercial_signal':'relevant_signal_waiting_for_editorial_slot',
      format:'short_video',
      channels:['instagram_reels','tiktok','youtube_shorts'],
      axis:card.axis,
      intent:brainAlert.ocean_alert_kind==='commercial_opportunity'?'commercial':'recognition'
    },
    draft:{
      hook:safeText(card.hook),
      spoken_body:safeText(card.body,1200),
      caption:safeText(card.caption,800),
      cta_text:'Vê em maison-jf.com',
      on_screen_url:'maison-jf.com'
    },
    visual_brief:{
      subject:safeText(card.visual,500),
      setting:'vertical 9:16, cortes curtos de 1 a 3 segundos, composição limpa e cinematográfica',
      mood:'Maison JF, premium, íntimo, preciso, sem excesso visual',
      farol_symbol:true,
      persistent_brand_url:'maison-jf.com'
    },
    destination:{
      approved_existing_path:card.destination,
      may_create_new_offer:false
    },
    context_note:{
      source_signal:safeText(brainAlert.response_excerpt,900),
      matched_terms:[...(oceanContext.matchedTerms||[])].slice(0,8)
    },
    gates:{
      human_editorial_review_required:true,
      automatic_publication:false,
      automatic_scheduling:false,
      paid_generation_authorized:false,
      spend_authorized:false
    },
    next_step:'video_draft_after_editorial_review'
  };
}
