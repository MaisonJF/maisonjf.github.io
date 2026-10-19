#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const OUTPUT=path.join(HERE,'ai-reader-panel.generated.json');
const CHECK=process.argv.includes('--check');
const stable=value=>JSON.stringify(value,null,2)+'\n';
const clean=value=>String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const readWindow=relative=>{
  const sandbox={window:{}};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT,relative),'utf8'),sandbox,{filename:relative});
  return sandbox.window;
};
const ebooks=readWindow('data/ebooks.js').MAISON_EBOOKS||[];
const pdiHtml=fs.readFileSync(path.join(ROOT,'para-de-ignorar/index.html'),'utf8');
const oracleHtml=fs.readFileSync(path.join(ROOT,'oraculo/index.html'),'utf8');
const pdiMeta=clean(pdiHtml.match(/<meta name="description" content="([^"]+)"/i)?.[1]||'');
const oracleMeta=clean(oracleHtml.match(/<meta name="description" content="([^"]+)"/i)?.[1]||'');
const previous=(()=>{try{return JSON.parse(fs.readFileSync(OUTPUT,'utf8'))}catch{return {assessments:[]}}})();
const previousById=new Map((previous.assessments||[]).map(x=>[x.id,x]));
const preserve=(id,base)=>{const old=previousById.get(id)||{};return {...base,status:old.status||'needs_editorial_review',...(old.reviewedAt?{reviewedAt:old.reviewedAt}:{}),...(old.reviewNote?{reviewNote:old.reviewNote}:{})}};

const bookPerspectives={
  'para-de-ignorar':[
    {id:'practical-reflection',label:'Leitor que procura reflexão prática',appeal:'A proposta é direta: reconhecer o que está a ser ignorado e transformar atenção em reflexão. Isso torna a promessa fácil de perceber.',question:'Antes de comprar, este leitor procuraria o índice e um exercício de amostra para avaliar se o livro entrega passos concretos, além de uma mensagem forte.'},
    {id:'time-poor-reader',label:'Leitor com pouco tempo',appeal:'O título é memorável e a premissa comunica rapidamente o tema, o que pode atrair quem quer começar por uma questão concreta.',question:'A descrição não indica a extensão, a estrutura ou o tempo de leitura. Uma amostra curta ajudaria a perceber se o formato cabe numa rotina ocupada.'},
    {id:'self-help-sceptic',label:'Leitor crítico de livros de desenvolvimento pessoal',appeal:'A linguagem parece afastar-se de fórmulas excessivamente abstratas e convida a olhar para situações reconhecíveis.',question:'Este perfil procuraria exemplos específicos, limites claros e exercícios úteis, para garantir que a abordagem não culpa o leitor por dificuldades complexas.'}
  ],
  'raio-azul':[
    {id:'spiritual-practice',label:'Leitor interessado em espiritualidade aplicada',appeal:'A combinação descrita de vontade, proteção, direção e prática pode atrair quem procura ligar uma linguagem espiritual a momentos do quotidiano.',question:'Um índice e uma página de amostra ajudariam a perceber como a tradição é explicada e que práticas concretas o volume oferece.'},
    {id:'human-language',label:'Leitor que prefere espiritualidade em linguagem acessível',appeal:'A promessa de aproximar tradição espiritual, reflexão e prática com linguagem humana é um ponto de entrada claro.',question:'A descrição não permite avaliar a profundidade histórica ou a consistência das práticas. Uma nota sobre fontes e enquadramento aumentaria a confiança.'},
    {id:'careful-sceptic',label:'Leitor curioso, mas cauteloso',appeal:'O posicionamento pode interessar a quem quer explorar simbolismo sem transformar a leitura numa obrigação de acreditar em tudo.',question:'Seria útil distinguir explicitamente reflexão simbólica, tradição e afirmações factuais, para o leitor saber que tipo de abordagem vai encontrar.'}
  ],
  'virgulas-do-destino-o-turista':[
    {id:'mystery-reader',label:'Leitor de mistério e destino',appeal:'Desejo, destino, mistério e um encontro que deixa perguntas depois da última página formam uma promessa narrativa fácil de comunicar.',question:'Uma sinopse mais detalhada, sem revelar reviravoltas, ajudaria a perceber o tom, o conflito central e o tipo de mistério.'},
    {id:'character-driven',label:'Leitor focado em personagens',appeal:'A ideia de um encontro que continua a levantar perguntas sugere espaço para ambiguidade e interpretação, algo apelativo para quem gosta de conversar sobre personagens.',question:'A descrição não dá ainda informação sobre o protagonista, o ritmo ou o ponto de vista. Uma primeira página seria mais útil do que um elogio genérico.'},
    {id:'new-series-reader',label:'Leitor que está a descobrir a saga',appeal:'O facto de ser apresentado como o primeiro livro da saga pode convidar a entrar num universo com continuação.',question:'Uma nota que explique se o volume tem um arco narrativo satisfatório por si só ajudaria quem tem receio de começar uma série.'}
  ],
  'virgulas-do-destino-meandros-da-vida':[
    {id:'emotional-fiction',label:'Leitor de ficção emocional',appeal:'A ligação entre perda, desejo e recomeço oferece um eixo emocional identificável e pode interessar a quem procura ficção centrada em mudanças pessoais.',question:'Seria útil mostrar um excerto para avaliar a voz narrativa, o ritmo e o equilíbrio entre drama e desenvolvimento das personagens.'},
    {id:'symbolic-reader',label:'Leitor interessado em Tarot e simbolismo',appeal:'A presença de Tarot na descrição pode diferenciar o livro para quem gosta de narrativas onde o simbolismo participa na história.',question:'A sinopse não mostra ainda como o Tarot entra na narrativa. Um exemplo breve permitiria perceber se é elemento estrutural, ambiente ou tema secundário.'},
    {id:'story-structure',label:'Leitor atento à estrutura',appeal:'A viagem para Portugal após uma tragédia pessoal oferece um ponto de partida concreto e um movimento narrativo reconhecível.',question:'Antes de recomendar a amigos, este perfil procuraria perceber o conflito principal e o grau de autonomia deste volume em relação aos restantes livros.'}
  ]
};
const assessments=[];
for(const book of ebooks.filter(x=>x.status==='published')){
  const profiles=bookPerspectives[book.slug]||[
    {id:'curious-reader',label:'Leitor curioso',appeal:'A descrição apresenta uma promessa editorial identificável e permite perceber a que tipo de interesse pode responder.',question:'Uma sinopse detalhada, um índice e uma amostra ajudariam a avaliar a profundidade da obra.'},
    {id:'critical-reader',label:'Leitor crítico',appeal:'O tema pode atrair leitores que procuram uma perspetiva própria, desde que a obra a desenvolva de forma consistente.',question:'A descrição de catálogo, por si só, não permite avaliar qualidade de escrita, ritmo ou utilidade do conteúdo.'},
    {id:'value-conscious',label:'Leitor que compara antes de comprar',appeal:'A coleção e o formato digital tornam a obra fácil de situar no catálogo.',question:'Uma amostra e informação clara sobre extensão, estrutura e público indicado tornariam a decisão de compra mais informada.'}
  ];
  for(const profile of profiles){
    const id='ai_reader_'+book.slug+'_'+profile.id;
    assessments.push(preserve(id,{
      id,type:'simulated_editorial_reading',
      assetType:'ebook',assetSlug:book.slug,assetTitle:book.title,
      simulatedProfile:profile.label,
      editorialNote:profile.appeal,
      constructiveQuestion:profile.question,
      sourceBasis:'data/ebooks.js catalogue description only',
      sourceExcerpt:String(book.description||'').slice(0,700),
      fullManuscriptReviewed:false,
      actualReader:false,verifiedPurchase:false,realCustomer:false,
      testimonial:false,starRating:null,
      disclosure:'SIMULAÇÃO EDITORIAL GERADA POR IA. Não é um testemunho de cliente nem um relato de leitura integral; baseia-se apenas na descrição de catálogo disponível.',
      publicationPolicy:'internal_only_until_human_review_and_explicit_AI_disclosure',
      status:'needs_editorial_review',
      approvalRequired:true,automaticPublication:false
    }));
  }
}
const productPerspectives=[
  {assetType:'game',slug:'para-de-ignorar',title:'PÁRA DE IGNORAR! — A dois e Grupo & Festa',sourceBasis:'public sales page, game mode contract and theme catalogue',excerpt:pdiMeta,
    profiles:[
      {id:'party-host',label:'Pessoa que organiza noites com amigos',appeal:'A escolha entre modo a dois e grupo, a rotação de vez e os desafios curtos podem tornar o jogo mais fácil de encaixar num jantar ou numa festa.',question:'Para perceber o valor antes de comprar, este perfil procuraria ver uma ronda completa e saber quantos temas e perguntas estão efetivamente disponíveis no modo público.'},
      {id:'quiet-group',label:'Pessoa que prefere jogos sem pressão social',appeal:'A opção de passar, o uso de números em vez de nomes e a promessa de não guardar respostas são sinais positivos para quem não gosta de ser obrigado a expor-se.',question:'Convém deixar muito claro que ninguém tem de contar segredos, beber, tocar em alguém ou aceitar desafios desconfortáveis.'},
      {id:'duo-conversation',label:'Duas pessoas à procura de uma conversa diferente',appeal:'Uma pergunta de cada vez e a alternância de turnos podem ajudar a sair de conversas automáticas sem exigir que as duas pessoas respondam sempre a tudo.',question:'Seria útil mostrar como funciona a sessão a dois e diferenciar as perguntas de conversa dos desafios de festa.'}
    ]},
  {assetType:'oracle',slug:'oraculo-maison-jf',title:'Oráculo MAISON JF®',sourceBasis:'public Oracle catalogue description and territory metadata',excerpt:oracleMeta,
    profiles:[
      {id:'symbolic-reflection',label:'Pessoa que procura reflexão simbólica',appeal:'A organização por territórios permite escolher uma questão concreta em vez de receber uma mensagem completamente genérica.',question:'A comunicação deve explicar que o Oráculo apoia reflexão e não garante previsões, diagnósticos ou decisões certas.'},
      {id:'practical-reader',label:'Pessoa que prefere perguntas práticas',appeal:'O uso de perguntas e diferentes perspetivas pode ajudar a organizar pensamentos sobre uma situação.',question:'Uma amostra de leitura, com explicação clara de como os blocos são escolhidos e como a pessoa mantém a própria agência, aumentaria a transparência.'},
      {id:'careful-reader',label:'Pessoa cautelosa com serviços espirituais',appeal:'O catálogo pode oferecer uma linguagem simbólica para pensar temas pessoais sem precisar de tratar cada resposta como uma verdade literal.',question:'É importante distinguir interpretação simbólica de factos e deixar explícito que a decisão final pertence sempre à pessoa.'}
    ]}
];
for(const asset of productPerspectives){
  for(const profile of asset.profiles){
    const id='ai_reader_'+asset.slug+'_'+profile.id;
    assessments.push(preserve(id,{
      id,type:'simulated_editorial_reading',
      assetType:asset.assetType,assetSlug:asset.slug,assetTitle:asset.title,
      simulatedProfile:profile.label,editorialNote:profile.appeal,constructiveQuestion:profile.question,
      sourceBasis:asset.sourceBasis,sourceExcerpt:asset.excerpt,
      fullManuscriptReviewed:false,actualReader:false,verifiedPurchase:false,realCustomer:false,
      testimonial:false,starRating:null,
      disclosure:'SIMULAÇÃO EDITORIAL GERADA POR IA. Não é um testemunho de cliente nem uma experiência real de compra ou utilização; baseia-se na informação pública do produto disponível.',
      publicationPolicy:'internal_only_until_human_review_and_explicit_AI_disclosure',
      status:'needs_editorial_review',approvalRequired:true,automaticPublication:false
    }));
  }
}
assessments.sort((a,b)=>a.id.localeCompare(b.id));
const payload={
  schema_version:'ai_reader_panel_v1',
  visibility:'internal-editorial',
  purpose:'Avaliação preliminar de posicionamento e fricção comercial; nunca simular clientes reais.',
  sources:['data/ebooks.js','para-de-ignorar/index.html','oraculo/index.html'],
  contract:{
    syntheticProfilesOnly:true,
    actualReaderClaims:false,
    verifiedPurchaseClaims:false,
    fakeTestimonialsForbidden:true,
    fullManuscriptClaims:false,
    publicDisplayAllowed:false,
    disclosureRequired:true,
    humanReviewRequired:true,
    starRatingsAllowed:false
  },
  summary:{
    assessments:assessments.length,
    ebooks:assessments.filter(x=>x.assetType==='ebook').length,
    games:assessments.filter(x=>x.assetType==='game').length,
    oracle:assessments.filter(x=>x.assetType==='oracle').length,
    requiringReview:assessments.filter(x=>x.approvalRequired).length,
    fullManuscriptsReviewed:assessments.filter(x=>x.fullManuscriptReviewed).length,
    realCustomers:assessments.filter(x=>x.realCustomer).length
  },
  assessments
};
const rendered=stable(payload);
if(CHECK){
  const current=JSON.parse(fs.readFileSync(OUTPUT,'utf8'));
  if(stable(current)!==rendered)throw new Error('ai_reader_panel_out_of_sync');
  console.log('AI reader panel: OK');
}else{
  fs.writeFileSync(OUTPUT,rendered);
  console.log(JSON.stringify(payload.summary));
}
