import { ORACLE_TERRITORIES } from './oracle-territories.js';
import { VPC_OCEAN_SIGNALS } from './vpc-ocean-signals.generated.js';

const FAROL_MOMENTS=[
  {slug:'decisao',label:'Decisão',question:'O que te faria sair daqui diferente?'},
  {slug:'relacao',label:'Relação',question:'O que queres mesmo desta noite?'},
  {slug:'cansaco',label:'Cansaço',question:'O que o teu corpo te está a pedir sem palavras?'},
  {slug:'casa',label:'Casa',question:'O que devia mudar primeiro quando entras?'},
  {slug:'trabalho',label:'Trabalho',question:'O que está realmente a pedir movimento?'},
  {slug:'dinheiro',label:'Dinheiro',question:'O que está a pesar mais: os números ou o que eles fazem contigo?'},
  {slug:'eu',label:'Eu',question:'Onde é que te perdes primeiro?'},
  {slug:'desligar',label:'Desligar',question:'Como queres desaparecer daqui sem fugir de ti?'},
  {slug:'aprender',label:'Aprender',question:'O que queres conseguir dizer daqui a uns meses?'},
  {slug:'companhia',label:'Companhia',question:'O que te faria dizer “ainda bem que fui”?'},
  {slug:'presente',label:'Presente',question:'O que queres que a pessoa sinta antes de saber quanto custou?'}
];

const VPC_AXES=[
  {slug:'valorizacao',label:'Valorização'},
  {slug:'vinculo',label:'Vínculo'},
  {slug:'autoabandono',label:'Autoabandono'},
  {slug:'controlo',label:'Controlo'},
  {slug:'pertenca',label:'Pertença'},
  {slug:'sobrecarga',label:'Sobrecarga'},
  {slug:'direccao',label:'Direcção'},
  {slug:'seguranca',label:'Segurança'}
];


const PDI_CONVERSATION_SEEDS=[
  {slug:'primeiras-impressoes',label:'Primeiras Impressões',focus:'aquilo que cada pessoa reparou primeiro e o que mudou desde então'},
  {slug:'pequenas-manias',label:'Pequenas Manias',focus:'hábitos, gestos e detalhes quotidianos que irritam, divertem ou dão ternura'},
  {slug:'o-que-admiro-em-ti',label:'O que admiro em ti',focus:'qualidades, capacidades e formas de estar que merecem ser ditas em voz alta'},
  {slug:'humor-e-brincadeira',label:'Humor & Brincadeira',focus:'o que faz duas pessoas rir, provocar-se e voltar a sentir leveza juntas'},
  {slug:'desejo-e-iniciativa',label:'Desejo & Iniciativa',focus:'como cada pessoa vive atração, iniciativa, vontade e reciprocidade sem pressupor respostas'},
  {slug:'toque-e-proximidade',label:'Toque & Proximidade',focus:'formas de carinho, proximidade física e conforto que fazem sentido para cada pessoa'},
  {slug:'segredos-e-silencios',label:'Segredos & Silêncios',focus:'coisas que ficaram por dizer, não por obrigação de revelar, mas por falta de momento ou coragem'},
  {slug:'depois-da-discussao',label:'Depois da Discussão',focus:'como cada pessoa repara, regressa ao vínculo e percebe quando um conflito realmente terminou'},
  {slug:'pedir-e-receber',label:'Pedir & Receber',focus:'a dificuldade de pedir atenção, ajuda, carinho ou espaço e a forma como o outro responde'},
  {slug:'liberdade-dentro-da-relacao',label:'Liberdade dentro da Relação',focus:'individualidade, autonomia e espaço pessoal sem transformar distância em ameaça'},
  {slug:'rotina-e-tedio',label:'Rotina & Tédio',focus:'o que a rotina protege, o que adormece e aquilo que ainda pode surpreender'},
  {slug:'rituais-de-dois',label:'Rituais de Dois',focus:'pequenos hábitos partilhados que dão identidade, segurança ou prazer à relação'},
  {slug:'dinheiro-a-dois',label:'Dinheiro a Dois',focus:'gastos, poupança, ajuda, independência e expectativas financeiras entre duas pessoas'},
  {slug:'trabalho-entra-em-casa',label:'Quando o Trabalho Entra em Casa',focus:'o impacto do cansaço, horários, ambição e pressão profissional na relação'},
  {slug:'familias-que-entram-na-relacao',label:'Famílias que entram na Relação',focus:'expectativas familiares, lealdades, tradições e fronteiras entre o casal e as famílias'},
  {slug:'amigos-e-vida-social',label:'Amigos & Vida Social',focus:'amizades, saídas, grupos, prioridades e a forma como cada pessoa ocupa o mundo fora da relação'},
  {slug:'o-passado-que-ainda-aparece',label:'O Passado que Ainda Aparece',focus:'ex-relacionamentos, memórias e comparações que ainda influenciam a relação presente'},
  {slug:'telemovel-e-privacidade',label:'Telemóvel & Privacidade',focus:'mensagens, redes sociais, passwords, disponibilidade e limites digitais'},
  {slug:'distancia-e-presenca',label:'Distância & Presença',focus:'o que muda quando há distância física, emocional ou temporal entre duas pessoas'},
  {slug:'casa-e-convivencia',label:'Casa & Convivência',focus:'tarefas, espaço, descanso, organização e as pequenas negociações de viver juntos'},
  {slug:'sexo-sem-roteiro',label:'Intimidade sem Roteiro',focus:'conversa adulta sobre desejo, conforto, curiosidade e limites sem exigir desempenho nem detalhe explícito'},
  {slug:'futuro-imaginado',label:'Futuro Imaginado',focus:'os futuros que cada pessoa imagina, teme ou evita nomear'},
  {slug:'sonhos-e-planos-absurdos',label:'Sonhos & Planos Improváveis',focus:'coisas grandes, estranhas ou improváveis que cada pessoa ainda gostaria de viver'},
  {slug:'medos-que-nao-mostro',label:'Medos que Não Mostro',focus:'inseguranças, receios e vulnerabilidades que nem sempre aparecem por fora'},
  {slug:'como-gosto-de-ser-cuidado',label:'Como Gosto de Ser Cuidado',focus:'gestos de apoio, presença e cuidado que realmente chegam a cada pessoa'},
  {slug:'quando-preciso-de-espaco',label:'Quando Preciso de Espaço',focus:'como pedir distância temporária sem abandono, castigo ou leitura automática de rejeição'},
  {slug:'coisas-que-quero-viver-contigo',label:'Coisas que Quero Viver Contigo',focus:'experiências, lugares, rotinas e memórias que ainda gostariam de construir juntos'},
  {slug:'perguntas-que-nunca-fiz',label:'Perguntas que Nunca Fiz',focus:'curiosidades honestas que ficaram adiadas porque nunca apareceu o momento certo'}
];

const PDI_GROUP_SEEDS=[
  {slug:'quem-conhece-quem',label:'Quem Conhece Quem?',focus:'o grupo tenta adivinhar preferências, hábitos e pequenas surpresas de quem está a jogar'},
  {slug:'historias-de-festa',label:'Histórias de Festa',focus:'histórias leves de saídas, encontros e planos inesperados, sem expor terceiros'},
  {slug:'confissoes-leves',label:'Confissões Leves',focus:'admissões inofensivas e engraçadas, com liberdade para passar'},
  {slug:'quem-faria-isso',label:'Quem Faria Isso?',focus:'situações hipotéticas e cómicas sobre improviso, viagens, atrasos e pequenas manias'},
  {slug:'memorias-e-nostalgia',label:'Memórias & Nostalgia',focus:'músicas, objetos, modas e momentos que cada pessoa associa a diferentes fases da vida'},
  {slug:'gostos-impopulares',label:'Gostos Impopulares',focus:'preferências pessoais divertidas, sem transformar discordância em ataque'},
  {slug:'opinioes-que-defendo',label:'Opiniões que Defendo',focus:'paixões e opiniões inofensivas que cada pessoa defenderia num debate de 30 segundos'},
  {slug:'dilemas-absurdos',label:'Dilemas Absurdos',focus:'escolhas imaginárias, contraditórias e cómicas sem consequências reais'},
  {slug:'viagens-improvaveis',label:'Viagens Improváveis',focus:'destinos, planos e companheiros ideais para uma escapadinha improvisada'},
  {slug:'planos-de-ultima-hora',label:'Planos de Última Hora',focus:'como cada pessoa improvisa, organiza, se atrasa ou salva um plano de grupo'},
  {slug:'musica-cinema-series',label:'Música, Cinema & Séries',focus:'bandas sonoras, guilty pleasures, papéis e universos da cultura pop que unem o grupo'},
  {slug:'talentos-inuteis',label:'Talentos Inúteis',focus:'competências sem utilidade prática, truques parvos e especialidades improváveis'},
  {slug:'pequenas-vergonhas',label:'Pequenas Vergonhas',focus:'momentos embaraçosos leves que a própria pessoa escolhe contar ou passar'},
  {slug:'escolhas-impossiveis',label:'Escolhas Impossíveis',focus:'dilemas divertidos entre duas opções estranhas, sem respostas certas'},
  {slug:'primeira-impressao-do-grupo',label:'Primeira Impressão do Grupo',focus:'o que cada pessoa reparou primeiro e como essa impressão mudou com o tempo'},
  {slug:'amigos-sem-filtro',label:'Amigos sem Filtro',focus:'perguntas honestas entre amigos com espaço para humor, cuidado e passar sem explicações'},
  {slug:'energia-de-festa',label:'Energia de Festa',focus:'como cada pessoa contribui para a energia da noite, escolhe música ou muda os planos'},
  {slug:'adivinha-a-resposta',label:'Adivinha a Resposta',focus:'o grupo tenta prever respostas leves antes de quem recebe a pergunta falar'},
  {slug:'conselhos-que-ninguem-pediu',label:'Conselhos que Ninguém Pediu',focus:'conselhos cómicos e não solicitados sobre situações pequenas e imaginárias'},
  {slug:'se-eu-fosse',label:'Se Eu Fosse...',focus:'identidades hipotéticas, profissões, personagens e versões exageradas de si'},
  {slug:'o-nosso-grupo-em-filme',label:'O Nosso Grupo em Filme',focus:'elenco, títulos, géneros e cenas inventadas para a história do grupo'},
  {slug:'competicao-sem-importancia',label:'Competição sem Importância',focus:'mini disputas verbais e votações leves em que não há vencedores importantes'},
  {slug:'a-proxima-aventura',label:'A Próxima Aventura',focus:'ideias de passeios, desafios e experiências acessíveis que o grupo gostaria de fazer'},
  {slug:'prazeres-secretos',label:'Prazeres Secretos',focus:'músicas, snacks, programas e hábitos inofensivos de que cada pessoa gosta sem grande defesa'},
  {slug:'conversas-de-mesa',label:'Conversas de Mesa',focus:'perguntas curiosas e rápidas para manter a conversa viva numa mesa ou festa'},
  {slug:'o-que-nos-une',label:'O que nos Une',focus:'pequenas coincidências, gostos partilhados e diferenças que tornam o grupo interessante'},
  {slug:'historias-em-30-segundos',label:'Histórias em 30 Segundos',focus:'relatos curtos, humorísticos e voluntários em que ninguém precisa de revelar segredos'},
  {slug:'batalha-de-playlists',label:'Batalha de Playlists',focus:'escolher músicas para cenas inventadas, moods improváveis e momentos épicos do grupo'},
  {slug:'karaoke-sem-microfone',label:'Karaoke sem Microfone',focus:'cantarolar, descrever ou representar músicas sem precisar de cantar bem nem usar equipamento'},
  {slug:'tribunal-das-opinioes',label:'Tribunal das Opiniões',focus:'defender durante 20 segundos uma opinião divertida e sem consequências, com direito a réplica'},
  {slug:'pitch-de-30-segundos',label:'Pitch de 30 Segundos',focus:'vender ideias absurdas como se fossem negócios revolucionários, usando criatividade e humor'},
  {slug:'publicidade-impossivel',label:'Publicidade Impossível',focus:'inventar anúncios para objetos comuns com funcionalidades ridículas e slogans memoráveis'},
  {slug:'manual-de-sobrevivencia-social',label:'Manual de Sobrevivência Social',focus:'criar regras cómicas para sobreviver a situações sociais imaginárias e pequenos imprevistos'},
  {slug:'duelo-de-imitacoes',label:'Duelo de Imitações',focus:'imitar personagens fictícias, sons ou situações sem gozar com características pessoais'},
  {slug:'emoji-humano',label:'Emoji Humano',focus:'representar emoções, títulos ou situações apenas com gestos e expressões, sem obrigação de participar'},
  {slug:'quem-sobrevivia-no-reality',label:'Quem Sobrevivia no Reality?',focus:'imaginar papéis num reality fictício com provas inofensivas, alianças cómicas e reviravoltas'},
  {slug:'banda-sonora-da-vida',label:'Banda Sonora da Vida',focus:'atribuir músicas a entradas triunfais, falhanços leves e cenas quotidianas inventadas'},
  {slug:'superpoderes-inuteis',label:'Superpoderes Inúteis',focus:'inventar poderes extraordinários que só resolvem problemas absurdos ou demasiado específicos'},
  {slug:'inventar-tradicoes',label:'Inventar Tradições',focus:'criar rituais de grupo completamente novos para aniversários, jantares e noites memoráveis'},
  {slug:'o-pior-melhor-plano',label:'O Pior Melhor Plano',focus:'transformar uma ideia péssima num plano surpreendentemente divertido, acessível e sem riscos'},
  {slug:'leiloes-de-talentos',label:'Leilão de Talentos',focus:'apresentar talentos reais ou inventados em modo leilão, sem competição séria nem humilhação'},
  {slug:'tradutor-de-situacoes',label:'Tradutor de Situações',focus:'traduzir frases banais para versões dramáticas, épicas ou absurdamente honestas'},
  {slug:'o-objeto-tem-a-palavra',label:'O Objeto Tem a Palavra',focus:'imaginar o que diria um objeto da sala depois de assistir à noite inteira'},
  {slug:'roteiro-de-ferias-caoticas',label:'Roteiro de Férias Caóticas',focus:'planear férias imaginárias com orçamento limitado, regras absurdas e prioridades incompatíveis'},
  {slug:'desafio-do-minuto',label:'Desafio do Minuto',focus:'resolver desafios verbais curtos de criatividade, associação e improviso sem materiais'},
  {slug:'memes-ao-vivo',label:'Memes ao Vivo',focus:'transformar situações quotidianas em legendas, memes ou manchetes inventadas sem publicar imagens de ninguém'},
  {slug:'o-chefe-por-um-dia',label:'Chefe por um Dia',focus:'inventar regras disparatadas para um restaurante, hotel ou empresa imaginária'},
  {slug:'manual-de-etiqueta-absurda',label:'Etiqueta Absurda',focus:'criar regras de etiqueta impossíveis para elevadores, jantares, viagens e encontros imaginários'},
  {slug:'detetives-do-nada',label:'Detetives do Nada',focus:'resolver mistérios inofensivos a partir de pistas inventadas e teorias cada vez mais improváveis'},
  {slug:'a-voz-do-documentario',label:'A Voz do Documentário',focus:'narrar ações banais do grupo como se fossem uma série documental épica'},
  {slug:'troca-de-perspetiva',label:'Troca de Perspetiva',focus:'imaginar como diferentes personagens fictícias interpretariam o mesmo acontecimento banal'},
  {slug:'o-concurso-dos-slogans',label:'O Concurso dos Slogans',focus:'criar slogans rápidos para objetos, hábitos e ideias inventadas e votar no mais inesperado'},
  {slug:'mapa-de-aventuras-locais',label:'Mapa de Aventuras Locais',focus:'inventar pequenas aventuras de baixo custo para descobrir lugares e experiências perto do grupo'},
  {slug:'historia-com-reviravolta',label:'História com Reviravolta',focus:'construir uma história coletiva em que cada pessoa acrescenta uma frase e uma reviravolta'},
  {slug:'o-conselho-de-personagens',label:'O Conselho de Personagens',focus:'pedir conselhos imaginários a personagens fictícias para dilemas triviais e divertidos'},
  {slug:'noticias-do-futuro',label:'Notícias do Futuro',focus:'inventar manchetes absurdas sobre o grupo daqui a dez anos sem fazer previsões pessoais invasivas'}
];

const MAISON_NATIVE_SEEDS=[
  {
    slug:'o-que-nunca-te-perguntei',
    label:'O que nunca te perguntei',
    focus:'aquilo que sempre quiseste saber sobre alguém sem encontrares a forma de perguntar'
  },
  {
    slug:'o-que-nunca-disse',
    label:'O que nunca te disse',
    focus:'aquilo que ficou por dizer por medo, vergonha, timing ou falta de palavras'
  },
  {
    slug:'se-eu-pudesse-perguntar',
    label:'Se eu pudesse perguntar',
    focus:'perguntas que normalmente ficam presas entre curiosidade, intimidade e receio da resposta'
  }
];

export function buildPdiThemeSourceSignals(){
  const signals=[];

  for(const territory of ORACLE_TERRITORIES){
    signals.push({
      source:'oracle',
      sourceId:territory.slug,
      slug:territory.slug,
      label:territory.label,
      family:territory.group,
      focus:territory.focus,
      signal:territory.signal,
      hidden:territory.hidden
    });
  }

  for(const moment of FAROL_MOMENTS){
    signals.push({
      source:'farol',
      sourceId:moment.slug,
      slug:moment.slug,
      label:moment.label,
      family:'Momento humano',
      focus:moment.question
    });
  }

  for(const axis of VPC_AXES){
    signals.push({
      source:'volta-para-casa',
      sourceId:axis.slug,
      slug:axis.slug,
      label:axis.label,
      family:'Dor dominante',
      focus:'eixo recorrente de reconhecimento pessoal'
    });
  }

  for(const seed of PDI_CONVERSATION_SEEDS){
    signals.push({
      source:'pdi-conversation',
      sourceId:seed.slug,
      slug:seed.slug,
      label:seed.label,
      family:'Conversa a dois',
      focus:seed.focus
    });
  }

  for(const seed of PDI_GROUP_SEEDS){
    signals.push({
      source:'pdi-group',
      sourceId:seed.slug,
      slug:seed.slug,
      label:seed.label,
      family:'Amigos, Grupos & Festas',
      focus:seed.focus
    });
  }

  for(const seed of MAISON_NATIVE_SEEDS){
    signals.push({
      source:'maison-native',
      sourceId:seed.slug,
      slug:seed.slug,
      label:seed.label,
      family:'Não dito',
      focus:seed.focus
    });
  }

  for(const ocean of VPC_OCEAN_SIGNALS){
    for(const theme of ocean.themes||[]){
      const slug=normalize(theme);
      signals.push({
        source:'ocean',
        sourceId:ocean.id+':'+slug,
        slug,
        label:humanLabel(theme),
        family:'Ocean MAISON',
        focus:ocean.intent||ocean.painLanguage||'',
        oceanId:ocean.id
      });
    }
  }

  return signals;
}

export function groupExactThemeSignals(signals=buildPdiThemeSourceSignals()){
  const grouped=new Map();
  for(const signal of signals){
    const key=normalize(signal.label);
    if(!grouped.has(key)){
      grouped.set(key,{
        candidateKey:key,
        preferredLabel:signal.label,
        slugs:[],
        sources:[],
        evidence:[]
      });
    }
    const item=grouped.get(key);
    if(!item.slugs.includes(signal.slug))item.slugs.push(signal.slug);
    if(!item.sources.includes(signal.source))item.sources.push(signal.source);
    item.evidence.push({
      source:signal.source,
      sourceId:signal.sourceId,
      focus:signal.focus||'',
      family:signal.family||''
    });
  }
  return [...grouped.values()];
}

export function pdiThemeSourceStats(){
  const signals=buildPdiThemeSourceSignals();
  return {
    totalSignals:signals.length,
    oracle:signals.filter(x=>x.source==='oracle').length,
    farol:signals.filter(x=>x.source==='farol').length,
    voltaParaCasa:signals.filter(x=>x.source==='volta-para-casa').length,
    maisonNative:signals.filter(x=>x.source==='maison-native').length,
    pdiConversation:signals.filter(x=>x.source==='pdi-conversation').length,
    ocean:signals.filter(x=>x.source==='ocean').length,
    exactGroups:groupExactThemeSignals(signals).length
  };
}

function humanLabel(value){
  const text=String(value||'').trim();
  return text?text.charAt(0).toLocaleUpperCase('pt-PT')+text.slice(1):text;
}

function normalize(value){
  return String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/&/g,' e ')
    .replace(/[^a-z0-9]+/g,' ')
    .trim()
    .replace(/\s+/g,'-');
}
