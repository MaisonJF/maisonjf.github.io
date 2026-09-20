/* MAISON JF® · Volta Para Casa · banco público de perguntas
   Banco grande e reutilizável. Cada sessão recebe uma amostra aleatória equilibrada.
   Não guarda respostas; serve apenas a apresentação dos testes públicos. */
(function(){
'use strict';

const attentionCore={
  inner:[
    {q:'Quando o dia começa a correr mal, o que te prende primeiro?',a:[
      {t:'Sentir que o esforço passou despercebido.',p:'seen',s:'self'},
      {t:'Notar alguém diferente e querer perceber logo porquê.',p:'attachment',s:'control'},
      {t:'Continuar a ajudar mesmo já sem margem.',p:'self',s:'load'},
      {t:'Tentar antecipar tudo o que ainda pode correr mal.',p:'control',s:'security'}]},
    {q:'Qual destas coisas te ocupa mais depressa a cabeça?',a:[
      {t:'Uma resposta fria de alguém cuja opinião me importa.',p:'seen',s:'attachment'},
      {t:'Uma mudança pequena na forma como alguém fala comigo.',p:'attachment',s:'control'},
      {t:'Ter de dizer não a alguém que conta comigo.',p:'self',s:'seen'},
      {t:'Não saber o que vai acontecer a seguir.',p:'control',s:'security'}]},
    {q:'Quando tens pouca energia, qual é o padrão mais teu?',a:[
      {t:'Ainda assim quero que se note que estou a fazer o meu melhor.',p:'seen',s:'load'},
      {t:'Fico mais sensível à distância de quem me importa.',p:'attachment',s:'belong'},
      {t:'Cuido do essencial dos outros e deixo-me para depois.',p:'self',s:'load'},
      {t:'Faço listas, cenários e planos para recuperar controlo.',p:'control',s:'direction'}]},
    {q:'O que mais facilmente transforma uma coisa pequena numa coisa grande?',a:[
      {t:'Sentir que fui ignorado ou desvalorizado.',p:'seen',s:'belong'},
      {t:'Um silêncio que não sei interpretar.',p:'attachment',s:'control'},
      {t:'Perceber que preciso de alguma coisa e ter de pedir.',p:'self',s:'seen'},
      {t:'Ficar sem informação suficiente para decidir.',p:'control',s:'security'}]},
    {q:'Num dia em que aparentemente está tudo normal, o que pode estragar o equilíbrio?',a:[
      {t:'Uma crítica que fica mais tempo do que devia.',p:'seen',s:'self'},
      {t:'Sentir alguém menos disponível.',p:'attachment',s:'belong'},
      {t:'Perceber que toda a gente precisa de alguma coisa de mim.',p:'self',s:'load'},
      {t:'Uma mudança de planos em cima da hora.',p:'control',s:'security'}]},
    {q:'Qual destas frases parece mais familiar por dentro?',a:[
      {t:'Se ninguém reparar, começo a duvidar se fiz bem.',p:'seen',s:'self'},
      {t:'Se a pessoa muda, eu noto antes de ela dizer.',p:'attachment',s:'control'},
      {t:'Posso aguentar mais um pouco.',p:'self',s:'load'},
      {t:'Se eu pensar o suficiente, talvez consiga evitar o pior.',p:'control',s:'security'}]},
    {q:'Quando alguma coisa te mexe, o que procuras primeiro?',a:[
      {t:'Reconhecimento de que aquilo que senti faz sentido.',p:'seen',s:'belong'},
      {t:'Um sinal de que a ligação continua bem.',p:'attachment',s:'security'},
      {t:'Uma maneira de não dar trabalho a ninguém.',p:'self',s:'seen'},
      {t:'Uma explicação que feche as pontas soltas.',p:'control',s:'direction'}]},
    {q:'O que te custa mais deixar simplesmente estar?',a:[
      {t:'A sensação de não ter sido visto.',p:'seen',s:'belong'},
      {t:'A dúvida sobre o que alguém sente por mim.',p:'attachment',s:'control'},
      {t:'A ideia de desapontar quem precisa de mim.',p:'self',s:'seen'},
      {t:'Uma pergunta sem resposta.',p:'control',s:'direction'}]},
    {q:'Quando estás vulnerável, qual destas necessidades aparece com mais força?',a:[
      {t:'Quero sentir que ainda tenho valor para alguém.',p:'seen',s:'attachment'},
      {t:'Quero sentir que a pessoa não foi embora por dentro.',p:'attachment',s:'belong'},
      {t:'Quero continuar funcional para não pesar nos outros.',p:'self',s:'load'},
      {t:'Quero saber exactamente com o que posso contar.',p:'control',s:'security'}]}
  ],
  ground:[
    {q:'Quando pensas nos próximos meses, o que pesa mais?',a:[
      {t:'Sentir que não tenho um lugar onde possa baixar a guarda.',p:'belong',s:'attachment'},
      {t:'Só de pensar no que tenho de manter, já fico cansado.',p:'load',s:'self'},
      {t:'Não saber se a vida que estou a construir é mesmo minha.',p:'direction',s:'seen'},
      {t:'Ficar sem margem, dinheiro, apoio ou chão.',p:'security',s:'control'}]},
    {q:'Qual destas preocupações te visita mais vezes?',a:[
      {t:'E se eu estiver rodeado e continuar sozinho?',p:'belong',s:'attachment'},
      {t:'E se eu não conseguir parar antes do corpo parar por mim?',p:'load',s:'self'},
      {t:'E se eu estiver a avançar na direcção errada?',p:'direction',s:'control'},
      {t:'E se alguma coisa mudar e eu não tiver margem?',p:'security',s:'control'}]},
    {q:'O que te faria respirar um pouco melhor hoje?',a:[
      {t:'Sentir que tenho mesmo com quem contar.',p:'belong',s:'attachment'},
      {t:'Não ter mais nada obrigatório durante algumas horas.',p:'load',s:'self'},
      {t:'Perceber qual é o próximo passo que é meu.',p:'direction',s:'control'},
      {t:'Ter uma reserva ou plano caso alguma coisa falhe.',p:'security',s:'control'}]},
    {q:'Quando imaginas uma vida mais leve, o que mudou primeiro?',a:[
      {t:'Tenho relações onde não preciso de me provar.',p:'belong',s:'seen'},
      {t:'O meu corpo já não vive sempre a pedir pausa.',p:'load',s:'self'},
      {t:'Estou a escolher por mim, não só a cumprir.',p:'direction',s:'seen'},
      {t:'Tenho margem suficiente para não viver em alerta.',p:'security',s:'control'}]},
    {q:'O que te rouba mais descanso mesmo quando nada está a acontecer?',a:[
      {t:'A sensação de não ter um lugar seguro entre pessoas.',p:'belong',s:'attachment'},
      {t:'A lista mental de tudo o que ainda falta fazer.',p:'load',s:'control'},
      {t:'A dúvida sobre o rumo que estou a tomar.',p:'direction',s:'control'},
      {t:'Imaginar o que pode faltar amanhã.',p:'security',s:'control'}]},
    {q:'Qual destas faltas seria mais difícil de tolerar?',a:[
      {t:'Ficar sem alguém com quem possa ser completamente eu.',p:'belong',s:'attachment'},
      {t:'Ficar sem energia para o básico.',p:'load',s:'self'},
      {t:'Ficar anos numa vida que não escolhi de verdade.',p:'direction',s:'seen'},
      {t:'Ficar sem base financeira ou apoio prático.',p:'security',s:'control'}]},
    {q:'Quando a vida aperta, onde sentes primeiro que falta espaço?',a:[
      {t:'Nas relações: parece que não há onde pousar.',p:'belong',s:'attachment'},
      {t:'No corpo: tudo parece demais.',p:'load',s:'self'},
      {t:'Na cabeça: não consigo ver para onde ir.',p:'direction',s:'control'},
      {t:'Na margem: tudo parece demasiado perto do limite.',p:'security',s:'control'}]},
    {q:'Se pudesses resolver só uma coisa antes do fim do mês, qual seria?',a:[
      {t:'Sentir-me mais acompanhado de verdade.',p:'belong',s:'attachment'},
      {t:'Recuperar energia e algum ritmo.',p:'load',s:'self'},
      {t:'Tomar uma decisão que anda suspensa.',p:'direction',s:'control'},
      {t:'Criar alguma segurança prática.',p:'security',s:'control'}]},
    {q:'Qual destas frases te dá mais vontade de dizer “sim, é isso”?',a:[
      {t:'Quero um lugar onde não tenha de representar.',p:'belong',s:'seen'},
      {t:'Quero parar antes de chegar ao limite.',p:'load',s:'self'},
      {t:'Quero saber para onde estou a levar a minha vida.',p:'direction',s:'control'},
      {t:'Quero deixar de viver como se o chão pudesse desaparecer amanhã.',p:'security',s:'control'}]}
  ],
  relation:[
    {q:'Quando não te sentes bem, o que faz mais falta?',a:[
      {t:'Que alguém veja mesmo o que estou a carregar.',p:'seen',s:'belong'},
      {t:'Um sinal claro de que a ligação continua.',p:'attachment',s:'security'},
      {t:'Presença verdadeira, não só pessoas por perto.',p:'belong',s:'attachment'},
      {t:'Espaço para parar sem sentir que estou a falhar.',p:'load',s:'self'}]},
    {q:'Qual destas situações te mexe mais?',a:[
      {t:'Fazer muito e ouvir pouco reconhecimento.',p:'seen',s:'self'},
      {t:'Alguém importante ficar inesperadamente distante.',p:'attachment',s:'belong'},
      {t:'Estar acompanhado e mesmo assim não me sentir incluído.',p:'belong',s:'seen'},
      {t:'Chegar ao fim do dia e perceber que ainda não parei.',p:'load',s:'self'}]},
    {q:'O que te faria sentir mais cuidado agora?',a:[
      {t:'Alguém reconhecer o que tenho feito.',p:'seen',s:'belong'},
      {t:'Alguém importante aproximar-se sem eu ter de pedir.',p:'attachment',s:'belong'},
      {t:'Ter companhia onde eu possa simplesmente existir.',p:'belong',s:'attachment'},
      {t:'Alguém aliviar-me uma coisa concreta.',p:'load',s:'self'}]},
    {q:'Quando te sentes em baixo, qual destas coisas piora tudo?',a:[
      {t:'Sentir que ninguém percebe a dimensão do que estou a viver.',p:'seen',s:'belong'},
      {t:'Não saber se alguém ainda está emocionalmente perto.',p:'attachment',s:'security'},
      {t:'Não saber a quem ligar sem sentir que incomodo.',p:'belong',s:'self'},
      {t:'Ter de continuar a funcionar como se tivesse energia.',p:'load',s:'self'}]},
    {q:'O que te faz sentir mais sozinho?',a:[
      {t:'Ser invisível mesmo quando estou a fazer tudo.',p:'seen',s:'belong'},
      {t:'A distância de uma pessoa específica.',p:'attachment',s:'belong'},
      {t:'Estar num grupo e sentir que não tenho lugar.',p:'belong',s:'seen'},
      {t:'Ter tanta coisa em cima que nem consigo chegar aos outros.',p:'load',s:'self'}]},
    {q:'Qual destas coisas te custa mais pedir?',a:[
      {t:'Que reconheçam o que faço.',p:'seen',s:'self'},
      {t:'Que alguém fique um pouco mais perto.',p:'attachment',s:'belong'},
      {t:'Companhia sem ter de justificar porquê.',p:'belong',s:'self'},
      {t:'Ajuda prática porque já não consigo fazer tudo.',p:'load',s:'self'}]},
    {q:'Numa semana difícil, qual destas ausências notas primeiro?',a:[
      {t:'Falta de reconhecimento.',p:'seen',s:'belong'},
      {t:'Falta de sinais de proximidade.',p:'attachment',s:'security'},
      {t:'Falta de alguém com quem eu possa baixar a guarda.',p:'belong',s:'attachment'},
      {t:'Falta de tempo para recuperar.',p:'load',s:'self'}]},
    {q:'O que te faria dizer “finalmente alguém percebeu”?',a:[
      {t:'Alguém nomear exactamente o esforço que tenho feito.',p:'seen',s:'belong'},
      {t:'Alguém perceber que a distância me mexeu.',p:'attachment',s:'belong'},
      {t:'Alguém ficar comigo sem me pedir performance.',p:'belong',s:'seen'},
      {t:'Alguém dizer “deixa, eu trato disto”.',p:'load',s:'self'}]},
    {q:'Se hoje só pudesses receber uma coisa de alguém, qual escolhias?',a:[
      {t:'Reconhecimento sincero.',p:'seen',s:'belong'},
      {t:'Reaproximação.',p:'attachment',s:'security'},
      {t:'Companhia tranquila.',p:'belong',s:'attachment'},
      {t:'Alívio concreto.',p:'load',s:'self'}]}
  ],
  choice:[
    {q:'Quando tens de escolher algo importante, o que te prende mais?',a:[
      {t:'O efeito que a minha escolha vai ter nos outros.',p:'self',s:'seen'},
      {t:'As vidas diferentes que podia ter.',p:'direction',s:'control'},
      {t:'Precisar de informação suficiente para não me arrepender.',p:'control',s:'security'},
      {t:'O medo de mexer no pouco chão que já tenho.',p:'security',s:'direction'}]},
    {q:'Quando aparece uma oportunidade nova, o que te trava?',a:[
      {t:'Pensar em quem posso desiludir se escolher por mim.',p:'self',s:'seen'},
      {t:'Não saber se aquilo combina com a vida que quero.',p:'direction',s:'control'},
      {t:'Não ter dados suficientes para prever o resultado.',p:'control',s:'security'},
      {t:'O risco de perder estabilidade.',p:'security',s:'control'}]},
    {q:'O que torna uma decisão simples muito mais pesada?',a:[
      {t:'Sentir que alguém vai ficar pior por minha causa.',p:'self',s:'seen'},
      {t:'Não saber o que quero para além do que esperam de mim.',p:'direction',s:'seen'},
      {t:'Haver demasiadas variáveis que não consigo controlar.',p:'control',s:'security'},
      {t:'Não ter margem para uma escolha correr mal.',p:'security',s:'control'}]},
    {q:'Quando estás entre duas opções, o que costumas fazer?',a:[
      {t:'Pergunto-me qual pesa menos nos outros.',p:'self',s:'seen'},
      {t:'Tento perceber qual delas parece mais minha.',p:'direction',s:'self'},
      {t:'Procuro mais informação antes de avançar.',p:'control',s:'security'},
      {t:'Tendo a escolher a que ameaça menos o que já tenho.',p:'security',s:'control'}]},
    {q:'Qual destas perguntas aparece mais nas tuas decisões?',a:[
      {t:'Quem vai precisar de mim se eu fizer isto?',p:'self',s:'seen'},
      {t:'É mesmo isto que eu quero?',p:'direction',s:'self'},
      {t:'O que é que eu ainda não estou a ver?',p:'control',s:'security'},
      {t:'E se depois me faltar chão?',p:'security',s:'control'}]},
    {q:'Se tivesses de mudar de rumo amanhã, o que seria mais difícil?',a:[
      {t:'Lidar com a sensação de abandonar alguém.',p:'self',s:'seen'},
      {t:'Admitir que o caminho anterior já não me serve.',p:'direction',s:'seen'},
      {t:'Aceitar que não consigo prever tudo.',p:'control',s:'security'},
      {t:'Sair de uma base conhecida sem garantia.',p:'security',s:'control'}]},
    {q:'O que te faz adiar mais uma escolha?',a:[
      {t:'A culpa de me pôr primeiro.',p:'self',s:'seen'},
      {t:'Ainda não saber o que quero ser a seguir.',p:'direction',s:'seen'},
      {t:'Sentir que me falta uma peça de informação.',p:'control',s:'security'},
      {t:'O receio de ficar sem margem para corrigir.',p:'security',s:'control'}]},
    {q:'Qual destas frases descreve melhor a tua indecisão?',a:[
      {t:'Se escolher por mim, alguém pode sentir que escolhi contra ele.',p:'self',s:'seen'},
      {t:'Tenho opções, mas não sei qual delas me pertence.',p:'direction',s:'self'},
      {t:'Ainda não tenho certezas suficientes.',p:'control',s:'security'},
      {t:'Não posso dar-me ao luxo de escolher mal.',p:'security',s:'control'}]},
    {q:'O que gostarias de ter antes de decidir?',a:[
      {t:'Permissão para não cuidar de toda a gente primeiro.',p:'self',s:'seen'},
      {t:'Clareza sobre aquilo que é realmente meu.',p:'direction',s:'self'},
      {t:'Uma resposta sem zonas cinzentas.',p:'control',s:'security'},
      {t:'Uma rede de segurança se a escolha não resultar.',p:'security',s:'control'}]}
  ]
};

const attentionRoute=[
  {q:'Quando queres sair do mesmo sítio, o que te ajuda de verdade?',a:[
    {t:'Falar até a confusão ganhar nome.',r:'talk'},
    {t:'Saber que não tenho de resolver tudo num dia.',r:'continuity'},
    {t:'Mudar alguma coisa concreta no corpo, no espaço ou na rotina.',r:'gesture'},
    {t:'Ter algo a que possa voltar sozinho.',r:'selfpaced'}]},
  {q:'Quando dizes “isto fez-me bem”, o que normalmente aconteceu?',a:[
    {t:'Saí com mais clareza.',r:'talk'},
    {t:'Não fiquei sozinho a tentar manter a mudança.',r:'continuity'},
    {t:'Senti diferença no corpo, no ambiente ou no dia.',r:'gesture'},
    {t:'Fiquei com algo para reler, repetir ou revisitar.',r:'selfpaced'}]},
  {q:'Quando uma coisa te pesa durante dias, qual ajuda costuma funcionar melhor?',a:[
    {t:'Conversar com alguém que me ajude a organizar.',r:'talk'},
    {t:'Ter acompanhamento durante algum tempo.',r:'continuity'},
    {t:'Fazer uma mudança concreta e sentir o efeito.',r:'gesture'},
    {t:'Explorar sozinho ao meu ritmo.',r:'selfpaced'}]},
  {q:'Se tivesses uma hora só para ti, o que escolherias?',a:[
    {t:'Uma conversa que me pusesse as ideias no lugar.',r:'talk'},
    {t:'Definir um plano que não acabasse naquela hora.',r:'continuity'},
    {t:'Um ritual, cuidado ou gesto físico.',r:'gesture'},
    {t:'Uma leitura, jogo ou ferramenta que pudesse guardar.',r:'selfpaced'}]},
  {q:'O que te dá mais sensação de avanço?',a:[
    {t:'Conseguir dizer em voz alta aquilo que estava confuso.',r:'talk'},
    {t:'Ter alguém a acompanhar os próximos passos.',r:'continuity'},
    {t:'Mudar alguma coisa que consigo tocar, ver ou sentir.',r:'gesture'},
    {t:'Descobrir algo sozinho e voltar quando precisar.',r:'selfpaced'}]},
  {q:'Quando precisas de apoio, qual formato te deixa mais à vontade?',a:[
    {t:'Uma conversa directa.',r:'talk'},
    {t:'Um percurso com continuidade.',r:'continuity'},
    {t:'Uma experiência prática.',r:'gesture'},
    {t:'Algo discreto que faço sozinho.',r:'selfpaced'}]},
  {q:'O que te faz sentir que uma resposta valeu a pena?',a:[
    {t:'Fez-me ver a situação de outra maneira.',r:'talk'},
    {t:'Continuou comigo depois daquele momento.',r:'continuity'},
    {t:'Mudou o meu ambiente, corpo ou rotina.',r:'gesture'},
    {t:'Posso voltar a ela sempre que quiser.',r:'selfpaced'}]},
  {q:'Quando estás saturado de pensar, o que preferes?',a:[
    {t:'Falar com alguém e simplificar.',r:'talk'},
    {t:'Ter apoio regular para não voltar ao mesmo ponto.',r:'continuity'},
    {t:'Fazer qualquer coisa concreta em vez de pensar mais.',r:'gesture'},
    {t:'Abrir uma ferramenta e explorar sozinho.',r:'selfpaced'}]},
  {q:'Qual destas formas de cuidado parece mais tua?',a:[
    {t:'Ser ouvido e responder a perguntas boas.',r:'talk'},
    {t:'Ter alguém por perto durante um período.',r:'continuity'},
    {t:'Criar um gesto ou ritual no quotidiano.',r:'gesture'},
    {t:'Ter uma experiência privada ao meu ritmo.',r:'selfpaced'}]},
  {q:'O que preferes receber quando não sabes por onde começar?',a:[
    {t:'Uma conversa orientada.',r:'talk'},
    {t:'Uma estrutura que continue nos dias seguintes.',r:'continuity'},
    {t:'Uma acção simples para fazer já.',r:'gesture'},
    {t:'Uma porta para explorar sem pressão.',r:'selfpaced'}]},
  {q:'Quando algo te toca, como gostas de continuar?',a:[
    {t:'Falando sobre isso.',r:'talk'},
    {t:'Mantendo contacto ao longo do tempo.',r:'continuity'},
    {t:'Transformando em gesto.',r:'gesture'},
    {t:'Guardando algo para revisitar.',r:'selfpaced'}]},
  {q:'Se não pudesses escolher pela cabeça, qual destes formatos te chamava primeiro?',a:[
    {t:'Uma conversa.',r:'talk'},
    {t:'Uma presença continuada.',r:'continuity'},
    {t:'Um objecto, ritual ou experiência concreta.',r:'gesture'},
    {t:'Uma leitura ou ferramenta individual.',r:'selfpaced'}]}
];

const apego=[
  ["A pessoa demora mais do que o normal a responder. O que acontece dentro de ti?",[
    ["secure","Assumo que pode estar ocupada e sigo o meu dia."],["anxious","Começo a procurar sinais de que alguma coisa mudou."],["avoidant","Até agradeço o espaço. Não gosto de estar sempre disponível."],["fearful","Quero escrever outra vez. E afastar-me antes que doa."]]],
  ["Quando alguém começa mesmo a aproximar-se…",[
    ["secure","Gosto da proximidade sem sentir que tenho de desaparecer dentro dela."],["anxious","Fico atento a qualquer sinal de afastamento."],["avoidant","Começo a sentir falta do tempo em que ninguém esperava tanto de mim."],["fearful","Era isto que eu queria. E, mesmo assim, fico inquieto."]]],
  ["Depois de uma discussão importante, qual é o teu impulso?",[
    ["secure","Preciso de algum tempo, mas quero voltar e reparar o que ficou."],["anxious","Quero resolver já. O silêncio custa-me mais do que a discussão."],["avoidant","Quero fechar o assunto e recuperar espaço."],["fearful","Quero que venha atrás de mim. E também quero desaparecer."]]],
  ["Alguém diz claramente que gosta de ti. O que aparece logo a seguir?",[
    ["secure","Acredito no que vejo e deixo o tempo confirmar."],["anxious","Sabe bem. E uma parte de mim pergunta quanto tempo vai durar."],["avoidant","Gosto. Mas também sinto uma pressão difícil de explicar."],["fearful","É o que eu queria ouvir. Mesmo assim, não relaxo totalmente."]]],
  ["Se alguém importante te pede mais proximidade emocional…",[
    ["secure","Tento perceber o que precisa sem deixar de ser eu."],["anxious","Quero dar tudo para não criar distância."],["avoidant","Sinto que estão a entrar demasiado no meu espaço."],["fearful","Quero corresponder, mas assusta-me o que isso pode exigir."]]],
  ["Quando sentes a outra pessoa mais distante…",[
    ["secure","Pergunto e observo antes de inventar uma resposta."],["anxious","A minha cabeça procura logo o que fiz de errado."],["avoidant","Também me afasto. Se quer espaço, terá espaço."],["fearful","Fico entre correr atrás e cortar antes de ser deixado."]]],
  ["O que te assusta mais numa relação?",[
    ["secure","Deixarmos de conseguir falar com verdade."],["anxious","Deixar de ser escolhido."],["avoidant","Perder liberdade e ficar preso a expectativas."],["fearful","Precisar de alguém que depois possa magoar-me."]]],
  ["Quando és tu que precisas de apoio…",[
    ["secure","Consigo pedir, mesmo sem gostar de depender demasiado."],["anxious","Quero pedir. E preciso de sentir que a pessoa quer mesmo ficar."],["avoidant","Tento resolver sozinho antes de envolver alguém."],["fearful","Quero apoio, mas mostrar que preciso deixa-me demasiado exposto."]]],
  ["Se a relação está tranquila durante algum tempo…",[
    ["secure","Consigo aproveitar a tranquilidade."],["anxious","Uma parte de mim fica à espera de quando vai mudar."],["avoidant","É mais fácil quando ninguém exige demasiado de mim."],["fearful","Uma parte relaxa. Outra começa a procurar o perigo."]]],
  ["Qual destas te custa mais admitir?",[
    ["secure","Posso gostar muito de alguém sem me abandonar."],["anxious","Nenhuma prova de amor me fecha a dúvida para sempre."],["avoidant","Às vezes chamo liberdade ao medo de precisar de alguém."],["fearful","Quero que fiquem. Nem sempre sei o que fazer quando ficam."]]],
  ["Recebes uma mensagem muito carinhosa. Como reage o teu corpo primeiro?",[
    ["secure","Sinto o carinho e recebo-o."],["anxious","Sabe-me bem e quero mais sinais de que é mesmo verdade."],["avoidant","Gosto, mas sinto vontade de baixar a intensidade."],["fearful","Quero acreditar e, ao mesmo tempo, fico alerta."]]],
  ["A pessoa quer passar mais tempo contigo do que estavas à espera.",[
    ["secure","Negocio o tempo de forma natural."],["anxious","Fico contente e reorganizo tudo para caber."],["avoidant","Sinto o meu espaço a encolher."],["fearful","Quero dizer sim, mas uma parte minha já quer uma saída."]]],
  ["Quando alguém te pergunta directamente “o que precisas de mim?”…",[
    ["secure","Consigo responder com alguma honestidade."],["anxious","Quero pedir segurança sem parecer demasiado."],["avoidant","Tenho dificuldade em saber porque estou habituado a resolver sozinho."],["fearful","Quero dizer. Mas dizer parece dar demasiado poder à pessoa."]]],
  ["Depois de um encontro muito bom, o que acontece no dia seguinte?",[
    ["secure","Fico contente e continuo a minha vida."],["anxious","Quero perceber rapidamente se a pessoa sentiu o mesmo."],["avoidant","Preciso de espaço para voltar a mim."],["fearful","Revivo tudo e também procuro razões para não me entusiasmar."]]],
  ["Quando a outra pessoa precisa de espaço…",[
    ["secure","Tento respeitar sem assumir automaticamente rejeição."],["anxious","Custa-me não interpretar como afastamento."],["avoidant","Percebo bem. Às vezes até sinto alívio."],["fearful","Quero respeitar, mas sinto-me em risco de ser abandonado."]]],
  ["Se alguém te desaponta numa coisa pequena…",[
    ["secure","Digo o que senti e vejo o que acontece."],["anxious","Pergunto-me se é sinal de uma mudança maior."],["avoidant","Baixo expectativas para não depender tanto."],["fearful","Fico magoado e sinto vontade de fechar a porta antes de piorar."]]],
  ["Quando gostas mesmo de alguém, o que muda em ti?",[
    ["secure","Aproximo-me sem deixar tudo o resto desaparecer."],["anxious","A pessoa começa a ocupar muito espaço mental."],["avoidant","Começo a vigiar quanto de mim estou a dar."],["fearful","Quero proximidade e começo a imaginar como me posso magoar."]]],
  ["Se a pessoa não concorda contigo numa coisa importante…",[
    ["secure","A diferença não me faz duvidar automaticamente da ligação."],["anxious","Preciso de perceber se isso cria distância entre nós."],["avoidant","Prefiro não transformar tudo numa conversa emocional."],["fearful","A diferença pode parecer um aviso de que afinal não estamos seguros."]]],
  ["Quando alguém te elogia de forma muito íntima…",[
    ["secure","Recebo sem precisar de desmontar o elogio."],["anxious","Guardo aquilo como prova de que ainda sou importante."],["avoidant","Fico desconfortável com tanta exposição emocional."],["fearful","Quero acreditar, mas uma parte desconfia do que vem depois."]]],
  ["A pessoa cancela um plano em cima da hora.",[
    ["secure","Fico chateado se for preciso, mas não faço disso uma história inteira."],["anxious","Começo a pensar se perdeu vontade de estar comigo."],["avoidant","Reorganizo-me e até agradeço ter recuperado tempo."],["fearful","Sinto rejeição e também vontade de fingir que não me importa."]]],
  ["Quando notas que estás a depender emocionalmente de alguém…",[
    ["secure","Tento equilibrar apoio e autonomia."],["anxious","Quero ter ainda mais certeza de que a pessoa fica."],["avoidant","Sinto vontade de recuperar independência rapidamente."],["fearful","Preciso da pessoa e isso assusta-me bastante."]]],
  ["Qual destas situações te dá mais paz?",[
    ["secure","Poder estar perto e separado sem que isso ameace a relação."],["anxious","Receber sinais frequentes de que continuo a ser escolhido."],["avoidant","Saber que ninguém vai invadir o meu espaço."],["fearful","Sentir proximidade sem ter de ficar vulnerável demais."]]],
  ["Se alguém quer conhecer-te muito profundamente…",[
    ["secure","Vou abrindo espaço ao ritmo que fizer sentido."],["anxious","Quero que conheça tudo e me aceite na mesma."],["avoidant","Uma parte de mim quer manter zonas só minhas."],["fearful","Quero ser conhecido e tenho medo do que fará com o que descobrir."]]],
  ["Quando a relação entra numa fase mais séria…",[
    ["secure","Penso no que queremos construir sem perder a minha vida própria."],["anxious","Sinto alívio por haver mais definição."],["avoidant","A definição pode começar a parecer peso."],["fearful","Quero a segurança da definição e assusta-me ficar preso nela."]]],
  ["Se alguém te diz “preciso de ti”…",[
    ["secure","Posso estar presente sem achar que tenho de salvar tudo."],["anxious","Sinto-me importante e quero garantir que não falho."],["avoidant","A frase pode soar como responsabilidade a mais."],["fearful","Sabe bem ser necessário e assusta-me o que isso cria."]]],
  ["Quando sentes ciúme, o que fazes primeiro?",[
    ["secure","Tento perceber o que é meu e o que é realmente sinal da relação."],["anxious","Procuro rapidamente confirmação de que continuo a ser escolhido."],["avoidant","Tento não mostrar que me afectou."],["fearful","Quero aproximar-me e afastar-me ao mesmo tempo."]]],
  ["Quando há muita intimidade durante vários dias seguidos…",[
    ["secure","Gosto e também sei pedir algum tempo meu."],["anxious","Quero aproveitar porque não sei quando volta a haver tanta proximidade."],["avoidant","Começo a precisar de distância para respirar."],["fearful","Sinto-me muito ligado e isso começa a assustar-me."]]],
  ["Se a pessoa passa um dia inteiro sem te procurar…",[
    ["secure","Posso notar, mas não assumo logo uma conclusão."],["anxious","Fico atento a todos os sinais do dia seguinte."],["avoidant","Não me incomoda muito; também gosto de autonomia."],["fearful","Sinto falta e preparo-me para fingir que não."]]],
  ["Quando tens medo de perder alguém…",[
    ["secure","Tento falar e agir sem me perder no medo."],["anxious","Procuro proximidade e garantias."],["avoidant","Tento convencer-me de que não preciso assim tanto."],["fearful","Posso agarrar e cortar quase ao mesmo tempo."]]],
  ["Se alguém te oferece ajuda antes de pedires…",[
    ["secure","Aceito se fizer sentido."],["anxious","Sinto carinho e quero perceber se vai continuar disponível."],["avoidant","Tenho tendência a dizer que não é preciso."],["fearful","Quero aceitar, mas sinto-me vulnerável por precisar."]]],
  ["O que acontece quando percebes que a pessoa tem vida própria para além de ti?",[
    ["secure","Parece-me normal e saudável."],["anxious","Às vezes pergunto-me onde fico eu nessa vida."],["avoidant","É importante para mim que cada um tenha o seu espaço."],["fearful","Quero liberdade para ambos, mas a distância pode activar medo."]]],
  ["Depois de te expores emocionalmente, como ficas?",[
    ["secure","Talvez vulnerável, mas não necessariamente arrependido."],["anxious","Quero saber depressa como a pessoa recebeu aquilo."],["avoidant","Posso arrepender-me de ter mostrado tanto."],["fearful","Quero acolhimento e, ao mesmo tempo, desejo esconder-me."]]],
  ["Quando alguém tenta reparar um erro contigo…",[
    ["secure","Observo a reparação e deixo o tempo mostrar consistência."],["anxious","Quero acreditar e preciso de sinais repetidos."],["avoidant","Posso aceitar, mas mantenho alguma distância."],["fearful","Quero voltar a confiar e continuo preparado para me proteger."]]],
  ["Se tivesses de resumir o amor seguro numa frase, qual seria mais próxima de ti?",[
    ["secure","Podemos escolher-nos sem deixar de ser dois."],["anxious","Quero saber que continuas aqui mesmo quando não vejo."],["avoidant","Quero amar sem perder o meu espaço."],["fearful","Quero ficar sem sentir que ficar me põe em perigo."]]],
  ["Quando alguém te diz que precisa de falar contigo mais tarde…",[
    ["secure","Espero pela conversa sem escrever o fim da história."],["anxious","A minha cabeça começa imediatamente a imaginar o pior."],["avoidant","Preferia que dissesse logo ou nem fizesse tanto suspense."],["fearful","Quero saber já e também tenho vontade de desaparecer antes da conversa."]]],
  ["O que mais te ajuda a confiar numa relação?",[
    ["secure","Coerência entre palavras, actos e tempo."],["anxious","Sinais frequentes de presença e escolha."],["avoidant","Respeito pelo meu espaço e autonomia."],["fearful","Sentir que posso aproximar-me sem ser ferido nem preso."]]]
];

const afeto=[
  ['Num dia mau, o que te chega mais fundo?',[
    ['palavras','Ouvir uma frase que mostre que alguém reparou mesmo em mim.'],['tempo','Ter alguém comigo sem pressa nem distrações.'],['gestos','Alguém tirar-me uma pequena coisa de cima sem eu pedir.'],['toque','Um abraço demorado sem precisar de explicar tudo.'],['simbolos','Receber um detalhe escolhido porque a pessoa se lembrou de mim.']]],
  ['Depois de uma semana caótica, o que te faz sentir mais ligado?',[
    ['palavras','Uma mensagem que diga exactamente aquilo que eu precisava de ouvir.'],['tempo','Tempo só nosso, sem telemóveis a roubar atenção.'],['gestos','Chegar e perceber que alguém tratou de uma coisa por mim.'],['toque','Ficar perto, encostados, de mãos dadas ou abraçados.'],['simbolos','Um pequeno detalhe que diga “pensei em ti”.']]],
  ['Quando alguém pede desculpa, o que te faz acreditar mais?',[
    ['palavras','Ouvir a pessoa dizer claramente o que percebeu e o que sente.'],['tempo','Ela ficar e conversar sem fugir ao assunto.'],['gestos','Ver uma mudança concreta depois da conversa.'],['toque','Voltar à proximidade física quando ambos estamos prontos.'],['simbolos','Um pequeno gesto que marque cuidado e reparação.']]],
  ['Num aniversário, o que te toca mais?',[
    ['palavras','Uma mensagem pessoal que eu queira guardar.'],['tempo','Ter tempo inteiro planeado para nós.'],['gestos','A pessoa ter organizado coisas para eu só aproveitar.'],['toque','Abraços, proximidade e carinho durante o dia.'],['simbolos','Abrir algo escolhido mesmo a pensar em mim.']]],
  ['Quando uma relação esfria, o que notas primeiro que desapareceu?',[
    ['palavras','As palavras de carinho, reconhecimento ou afecto.'],['tempo','Os momentos em que estamos realmente presentes.'],['gestos','Os pequenos cuidados que antes aconteciam sem pedir.'],['toque','O contacto, os abraços e a proximidade física.'],['simbolos','Os sinais de “lembrei-me de ti” quando não estou.']]],
  ['Se alguém quiser surpreender-te, qual ganha?',[
    ['palavras','Uma mensagem que eu vá reler mais tarde.'],['tempo','Levar-me para algum lado e ficar mesmo comigo.'],['gestos','Fazer por mim uma coisa que sabe que me pesa.'],['toque','Criar um momento de proximidade e carinho.'],['simbolos','Dar-me uma coisa pequena, mas estranhamente certeira.']]],
  ['O que te faz pensar “esta pessoa conhece-me mesmo”?',[
    ['palavras','Dizer algo tão específico que eu percebo que reparou.'],['tempo','Saber quando eu preciso de atenção inteira.'],['gestos','Antecipar uma necessidade sem eu ter de pedir.'],['toque','Saber quando eu preciso de um abraço ou de proximidade.'],['simbolos','Escolher um detalhe que só faz sentido porque me conhece.']]],
  ['Depois de uma discussão, o que reconstrói ligação mais depressa?',[
    ['palavras','Dizermos claramente o que sentimos e o que muda daqui para a frente.'],['tempo','Ficarmos juntos até a distância baixar.'],['gestos','A pessoa mostrar na prática que ouviu o que eu disse.'],['toque','Voltarmos ao contacto físico quando ambos queremos.'],['simbolos','Um sinal concreto de “não me esqueci de nós”.']]],
  ['O que mais facilmente te faz sentir ignorado?',[
    ['palavras','Nunca ouvir carinho ou reconhecimento, mesmo quando existe.'],['tempo','Estar com alguém que está sempre metade noutro sítio.'],['gestos','Ter de pedir várias vezes aquilo que parecia cuidado básico.'],['toque','Sentir a proximidade física desaparecer sem conversa.'],['simbolos','Nunca existir aquele pequeno “vi isto e lembrei-me de ti”.']]],
  ['Se só pudesses pedir uma coisa esta semana, qual seria?',[
    ['palavras','Que alguém me dissesse claramente o que sente por mim.'],['tempo','Algumas horas de atenção inteira com alguém importante.'],['gestos','Uma ajuda concreta que me aliviasse mesmo.'],['toque','Um abraço, colo ou contacto de que tenho sentido falta.'],['simbolos','Uma pequena coisa escolhida especificamente para mim.']]],
  ['Quando chegas a casa exausto, qual gesto te saberia melhor?',[
    ['palavras','Ouvir “eu vejo o quanto fizeste hoje”.'],['tempo','Sentar com alguém sem pressa nenhuma.'],['gestos','Descobrir que alguém já tratou de uma tarefa chata.'],['toque','Receber um abraço antes de qualquer pergunta.'],['simbolos','Encontrar um pequeno detalhe deixado para mim.']]],
  ['Qual destas coisas guardarias por mais tempo na memória?',[
    ['palavras','Uma frase dita no momento exacto.'],['tempo','Uma tarde inteira sem distrações.'],['gestos','Uma ajuda que chegou antes de eu pedir.'],['toque','Um abraço que me fez baixar a guarda.'],['simbolos','Um objecto pequeno com uma história só nossa.']]],
  ['Quando estás ansioso, o que te regula mais?',[
    ['palavras','Ouvir uma voz calma dizer que não estou sozinho nisto.'],['tempo','Ter alguém presente até eu voltar a mim.'],['gestos','A pessoa ajudar a resolver uma coisa concreta.'],['toque','Sentir contacto físico seguro.'],['simbolos','Ter por perto algo que me lembre da pessoa.']]],
  ['O que torna uma despedida menos fria?',[
    ['palavras','Dizer claramente o que aquele momento significou.'],['tempo','Não ter pressa de ir embora.'],['gestos','Fazer alguma coisa prática para facilitar o depois.'],['toque','Um abraço que dure mais um pouco.'],['simbolos','Levar comigo algo que marque aquele encontro.']]],
  ['Num reencontro depois de muito tempo, o que procuras primeiro?',[
    ['palavras','Ouvir que a pessoa sentiu a minha falta.'],['tempo','Ter tempo suficiente para recuperar a proximidade.'],['gestos','Perceber nos cuidados que ainda me conhece.'],['toque','Abraçar e sentir que a distância acabou por um momento.'],['simbolos','Trocar ou mostrar algo guardado daquele tempo.']]],
  ['Qual destas coisas te faria sentir mais celebrado?',[
    ['palavras','Ouvir alguém falar de mim com carinho e detalhe.'],['tempo','Ter um dia pensado à minha volta.'],['gestos','Não ter de organizar nada porque alguém tratou de tudo.'],['toque','Receber muito carinho físico.'],['simbolos','Receber algo escolhido com atenção ao que eu gosto.']]],
  ['Quando estás doente ou em baixo, qual cuidado pesa mais?',[
    ['palavras','Perguntarem como estou e dizerem que ficam por perto.'],['tempo','Fazerem-me companhia sem me exigir conversa.'],['gestos','Trazerem-me o que preciso e tratarem do prático.'],['toque','Um toque na mão, na testa ou um abraço.'],['simbolos','Deixarem-me uma coisa pequena para me fazer sentir lembrado.']]],
  ['O que te faria sentir mais amado sem custar quase dinheiro nenhum?',[
    ['palavras','Uma carta ou mensagem escrita com verdade.'],['tempo','Uma caminhada só para estarmos juntos.'],['gestos','Fazer por mim uma tarefa que detesto.'],['toque','Deitar a cabeça no colo de alguém.'],['simbolos','Uma fotografia, flor ou coisa mínima guardada para mim.']]],
  ['Quando tens uma boa notícia, como gostas que alguém reaja?',[
    ['palavras','Dizer claramente que está orgulhoso de mim.'],['tempo','Parar o que está a fazer para celebrar comigo.'],['gestos','Transformar a notícia num pequeno momento especial.'],['toque','Abraçar-me com entusiasmo.'],['simbolos','Marcar a ocasião com um detalhe que eu possa guardar.']]],
  ['Quando falhas numa coisa importante, o que te faz sentir mais acolhido?',[
    ['palavras','Ouvir que o meu valor não mudou por causa disto.'],['tempo','Ter alguém comigo enquanto digiro o que aconteceu.'],['gestos','Alguém ajudar-me no passo seguinte sem me julgar.'],['toque','Um abraço antes de começarmos a resolver.'],['simbolos','Um pequeno sinal de “continuo a acreditar em ti”.']]],
  ['Num domingo sem planos, o que te faria sentir mais perto de alguém?',[
    ['palavras','Conversar sobre coisas que normalmente não dizemos.'],['tempo','Passar horas juntos sem agenda.'],['gestos','Cozinhar ou tratar de coisas um para o outro.'],['toque','Ficar encostados no sofá ou deitados juntos.'],['simbolos','Fazer ou escolher alguma coisa para guardar daquele dia.']]],
  ['O que mais te convence de que alguém se lembrou de ti durante o dia?',[
    ['palavras','Uma mensagem espontânea e específica.'],['tempo','A pessoa guardar um momento do dia para mim.'],['gestos','Fazer alguma coisa que facilite o meu dia.'],['toque','Procurar proximidade quando nos vemos.'],['simbolos','Trazer-me algo pequeno porque viu e pensou em mim.']]],
  ['Quando alguém regressa de viagem, o que te toca mais?',[
    ['palavras','Ouvir as coisas de que sentiu falta em mim.'],['tempo','Reservar tempo para estarmos juntos logo depois.'],['gestos','Voltar e ajudar a retomar a rotina comigo.'],['toque','O abraço do reencontro.'],['simbolos','Trazer um detalhe escolhido durante a viagem.']]],
  ['Qual destas formas de “estou aqui” te chega mais?',[
    ['palavras','Dizer “liga-me se precisares, a sério”.'],['tempo','Aparecer e ficar.'],['gestos','Perguntar “o que posso fazer por ti?” e fazer mesmo.'],['toque','Segurar-me a mão ou abraçar-me.'],['simbolos','Deixar-me algo que eu possa ter por perto.']]],
  ['Quando tens medo de não ser importante, o que te acalma mais?',[
    ['palavras','Ouvir exactamente o lugar que tenho na vida da pessoa.'],['tempo','Ver que ela escolhe passar tempo comigo.'],['gestos','Notar que conta comigo nas pequenas decisões.'],['toque','Sentir que a proximidade física continua espontânea.'],['simbolos','Receber sinais concretos de que se lembrou de mim.']]],
  ['O que mais te faria sentir “foi mesmo pensado para mim”?',[
    ['palavras','Uma dedicatória impossível de copiar para outra pessoa.'],['tempo','Um plano construído à volta do que eu gosto.'],['gestos','Um cuidado adaptado exactamente ao que preciso.'],['toque','Um momento de proximidade no meu ritmo.'],['simbolos','Um presente pequeno, mas com um detalhe muito meu.']]],
  ['Se alguém tivesse só dez minutos para te mostrar carinho, o que escolherias?',[
    ['palavras','Dizer-me o que sente sem rodeios.'],['tempo','Estar comigo sem olhar para mais nada.'],['gestos','Resolver uma pequena coisa que me pesa.'],['toque','Abraçar-me e ficar ali.'],['simbolos','Dar-me um bilhete ou detalhe que eu possa guardar.']]],
  ['Quando alguém te conhece há anos, o que ainda te emociona?',[
    ['palavras','Continuar a dizer coisas que não dá por garantidas.'],['tempo','Continuar a escolher tempo só nosso.'],['gestos','Continuar a reparar nas pequenas necessidades.'],['toque','Continuar a procurar proximidade física.'],['simbolos','Continuar a trazer pequenas lembranças com significado.']]],
  ['Qual destas ausências te dói mais numa relação longa?',[
    ['palavras','Deixarmos de dizer coisas bonitas ou importantes.'],['tempo','Já quase nunca termos tempo realmente nosso.'],['gestos','Os cuidados práticos desaparecerem.'],['toque','O contacto físico tornar-se raro.'],['simbolos','Nunca mais existir um detalhe inesperado.']]],
  ['O que faz um presente ter valor para ti?',[
    ['palavras','A mensagem que vem com ele.'],['tempo','O tempo que a pessoa gastou a pensar ou preparar.'],['gestos','Perceber que resolve ou melhora algo real na minha vida.'],['toque','Criar uma experiência sensorial ou de proximidade.'],['simbolos','Carregar uma memória ou significado só nosso.']]],
  ['Quando alguém te diz “amo-te”, o que faz a frase assentar?',[
    ['palavras','A forma e a verdade com que é dita.'],['tempo','O tempo que a pessoa realmente me dá.'],['gestos','Aquilo que faz quando eu preciso.'],['toque','A proximidade física que acompanha a frase.'],['simbolos','Os pequenos sinais que deixam memória.']]],
  ['Qual destas coisas te faria sentir mais escolhido?',[
    ['palavras','Ser nomeado e reconhecido claramente.'],['tempo','A pessoa reservar espaço real para mim.'],['gestos','Priorizar uma necessidade minha sem eu insistir.'],['toque','Procurar o meu contacto espontaneamente.'],['simbolos','Escolher algo que só faria sentido para mim.']]],
  ['Quando estás longe de alguém de quem gostas, o que mata mais saudades?',[
    ['palavras','Mensagens e áudios com sentimento real.'],['tempo','Chamadas em que a pessoa está mesmo presente.'],['gestos','Pequenas ajudas ou surpresas à distância.'],['toque','Saber que vamos recuperar proximidade física quando nos virmos.'],['simbolos','Ter comigo algo ligado à pessoa.']]],
  ['Quando alguém entra em tua casa, o que seria um gesto de afecto forte?',[
    ['palavras','Dizer algo bonito sobre o espaço que criei.'],['tempo','Ficar sem pressa e fazer-se presente.'],['gestos','Ajudar espontaneamente numa coisa prática.'],['toque','Cumprimentar com calor e proximidade.'],['simbolos','Trazer um pequeno detalhe pensado para a casa ou para mim.']]],
  ['Qual destas coisas te faz sentir mais seguro no afecto?',[
    ['palavras','Saber com palavras onde estou na vida da pessoa.'],['tempo','A consistência de ela aparecer e estar.'],['gestos','A repetição dos pequenos cuidados.'],['toque','A proximidade física tranquila.'],['simbolos','Ter sinais e memórias concretas da ligação.']]],
  ['No fim de um dia bom juntos, o que prolonga mais a sensação?',[
    ['palavras','Uma frase que resuma o que aquele dia significou.'],['tempo','Ficar mais um pouco em vez de acabar depressa.'],['gestos','A pessoa tratar de um último cuidado antes de ir.'],['toque','Um beijo ou abraço demorado.'],['simbolos','Ficar com uma fotografia, bilhete ou pequeno objecto daquele dia.']]]
];

function shuffle(items){
  const a=items.slice();
  for(let i=a.length-1;i>0;i--){
    let j;
    if(globalThis.crypto&&typeof globalThis.crypto.getRandomValues==='function'){
      const n=new Uint32Array(1);globalThis.crypto.getRandomValues(n);j=n[0]%(i+1);
    }else j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function pickAttentionCore(){
  const selected=[];
  Object.values(attentionCore).forEach(group=>selected.push(...shuffle(group).slice(0,3)));
  return shuffle(selected);
}

function pick(test,count){
  if(test==='attention-core')return pickAttentionCore();
  if(test==='attention-route')return shuffle(attentionRoute).slice(0,count||2);
  if(test==='apego')return shuffle(apego).slice(0,count||10);
  if(test==='afeto')return shuffle(afeto).slice(0,count||10);
  return [];
}

window.MAISON_TEST_QUESTION_BANK={
  version:'2026-09-21-v1',
  counts:{
    attentionCore:Object.values(attentionCore).reduce((n,g)=>n+g.length,0),
    attentionRoute:attentionRoute.length,
    apego:apego.length,
    afeto:afeto.length
  },
  attentionCore,attentionRoute,apego,afeto,pick,pickAttentionCore,shuffle
};
})();