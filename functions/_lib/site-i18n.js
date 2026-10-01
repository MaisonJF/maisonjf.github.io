import { ORACLE_TERRITORIES } from './oracle-territories.js';
import { ORACLE_PUBLIC_COPY, oracleLocaleTermMap } from './oracle-public-locales.js';

/*
MAISON JF® · Public-site localization contract
PT-PT remains the canonical editorial source. PT-BR, EN and ES are localized
renderings served at real locale-prefixed URLs by Cloudflare Pages middleware.
No automatic machine translation occurs at request time.
*/

export const MAISON_SITE_LOCALES=Object.freeze({
  'pt-PT':{prefix:'',label:'PT',htmlLang:'pt-PT',ogLocale:'pt_PT'},
  'pt-BR':{prefix:'/pt-br',label:'BR',htmlLang:'pt-BR',ogLocale:'pt_BR'},
  en:{prefix:'/en',label:'EN',htmlLang:'en',ogLocale:'en_US'},
  es:{prefix:'/es',label:'ES',htmlLang:'es',ogLocale:'es_ES'}
});

export const MAISON_SITE_TARGET_LOCALES=Object.freeze(['pt-BR','en','es']);

export function normalizePublicSitePath(pathname='/'){
  let path=String(pathname||'/').split('?')[0].split('#')[0]||'/';
  path=path.replace(/\/index\.html$/i,'/');
  path=path.replace(/\.html$/i,'');
  if(!path.startsWith('/'))path='/'+path;
  path=path.replace(/\/{2,}/g,'/');
  if(path!=='/'&&path.endsWith('/'))return path;
  return path;
}

export function splitMaisonLocalePath(pathname='/'){
  const path=String(pathname||'/');
  for(const [locale,config] of Object.entries(MAISON_SITE_LOCALES)){
    if(!config.prefix)continue;
    if(path===config.prefix||path===config.prefix+'/'){
      return {locale,sourcePath:'/',localized:true};
    }
    if(path.startsWith(config.prefix+'/')){
      const stripped=path.slice(config.prefix.length)||'/';
      return {locale,sourcePath:stripped,localized:true};
    }
  }
  return {locale:'pt-PT',sourcePath:path||'/',localized:false};
}

export function localizedPath(sourcePath,locale){
  const config=MAISON_SITE_LOCALES[locale]||MAISON_SITE_LOCALES['pt-PT'];
  const clean=normalizePublicSitePath(sourcePath);
  if(locale==='pt-PT')return clean;
  return config.prefix+(clean==='/'?'/':clean);
}

export function localizedAbsoluteUrl(sourcePath,locale,origin='https://maison-jf.com'){
  return String(origin).replace(/\/$/,'')+localizedPath(sourcePath,locale);
}

export function localeAlternates(sourcePath,origin='https://maison-jf.com'){
  return [
    ['pt-PT',localizedAbsoluteUrl(sourcePath,'pt-PT',origin)],
    ['pt-BR',localizedAbsoluteUrl(sourcePath,'pt-BR',origin)],
    ['en',localizedAbsoluteUrl(sourcePath,'en',origin)],
    ['es',localizedAbsoluteUrl(sourcePath,'es',origin)],
    ['x-default',localizedAbsoluteUrl(sourcePath,'pt-PT',origin)]
  ];
}

const COMMON={
  'pt-BR':{
    'O Farol':'O Farol',
    'Volta Para Casa':'Volta Para Casa',
    'Produtos':'Produtos',
    'Serviços':'Serviços',
    'Profissionais':'Profissionais',
    'Contacto':'Contato',
    'Imprensa':'Imprensa',
    'Envios':'Envios',
    'Legal & Privacidade':'Legal & Privacidade',
    'Informação Legal':'Informação Legal',
    'Explorar':'Explorar',
    'Presença':'Presença',
    'Casa':'Casa',
    'Corpo':'Corpo',
    'Cabeça':'Mente',
    'SEGUE O FAROL':'SIGA O FAROL',
    'Descobrir →':'Descobrir →',
    'Abrir →':'Abrir →',
    'Voltar':'Voltar',
    'Fechar ×':'Fechar ×',
    'Marca registada na União Europeia':'Marca registrada na União Europeia',
    'Todos os direitos reservados.':'Todos os direitos reservados.'
  },
  en:{
    'O Farol':'The Lighthouse',
    'Volta Para Casa':'Come Back Home',
    'Produtos':'Products',
    'Serviços':'Services',
    'Profissionais':'Professionals',
    'Contacto':'Contact',
    'Imprensa':'Press',
    'Envios':'Shipping',
    'Legal & Privacidade':'Legal & Privacy',
    'Informação Legal':'Legal Information',
    'Explorar':'Explore',
    'Maison':'Maison',
    'Presença':'Presence',
    'Casa':'Home',
    'Corpo':'Body',
    'Cabeça':'Mind',
    'SEGUE O FAROL':'FOLLOW THE LIGHTHOUSE',
    'PROFISSIONAIS →':'PROFESSIONALS →',
    'Descobrir →':'Discover →',
    'Abrir →':'Open →',
    'ENTRAR →':'ENTER →',
    'COMEÇAR →':'START →',
    'Ver disponibilidade':'Check availability',
    'Voltar':'Back',
    'Recomeçar':'Start again',
    'Fechar ×':'Close ×',
    'Informação útil':'Useful information',
    'Marca registada na União Europeia':'Registered trademark in the European Union',
    'Todos os direitos reservados.':'All rights reserved.'
  },
  es:{
    'O Farol':'El Faro',
    'Volta Para Casa':'Vuelve a Casa',
    'Produtos':'Productos',
    'Serviços':'Servicios',
    'Profissionais':'Profesionales',
    'Contacto':'Contacto',
    'Imprensa':'Prensa',
    'Envios':'Envíos',
    'Legal & Privacidade':'Legal y Privacidad',
    'Informação Legal':'Información Legal',
    'Explorar':'Explorar',
    'Maison':'Maison',
    'Presença':'Presencia',
    'Casa':'Casa',
    'Corpo':'Cuerpo',
    'Cabeça':'Mente',
    'SEGUE O FAROL':'SIGUE EL FARO',
    'PROFISSIONAIS →':'PROFESIONALES →',
    'Descobrir →':'Descubrir →',
    'Abrir →':'Abrir →',
    'ENTRAR →':'ENTRAR →',
    'COMEÇAR →':'EMPEZAR →',
    'Ver disponibilidade':'Ver disponibilidad',
    'Voltar':'Volver',
    'Recomeçar':'Empezar de nuevo',
    'Fechar ×':'Cerrar ×',
    'Informação útil':'Información útil',
    'Marca registada na União Europeia':'Marca registrada en la Unión Europea',
    'Todos os direitos reservados.':'Todos los derechos reservados.'
  }
};

const HOME={
  'pt-BR':{
    'MAISON JF® | PÁRA DE IGNORAR! Volta Para Casa.':'MAISON JF® | PARE DE IGNORAR! Volte Para Casa.',
    'O que estás a ignorar? Entra na MAISON JF® por Casa, Corpo, Cabeça ou Presença. PÁRA DE IGNORAR. Volta Para Casa.':'O que você está ignorando? Entre na MAISON JF® por Casa, Corpo, Mente ou Presença. PARE DE IGNORAR. Volte Para Casa.',
    'O QUE ESTÁS A IGNORAR?':'O QUE VOCÊ ESTÁ IGNORANDO?',
    'Crio produtos e serviços para te ajudar a perceber o que se passa contigo. E o que podes fazer depois de saberes isso.':'Crio produtos e serviços para ajudar você a entender o que está acontecendo consigo. E o que pode fazer depois de saber isso.',
    'Não sei por onde começar.':'Não sei por onde começar.',
    'Quero perceber o que se passa comigo.':'Quero entender o que está acontecendo comigo.',
    'EXPLORA A MAISON':'EXPLORE A MAISON',
    'Já sei o que procuro.':'Já sei o que procuro.',
    'As quatro portas da Maison':'As quatro portas da Maison',
    'Quero voltar a gostar de chegar a casa.':'Quero voltar a gostar de chegar em casa.',
    'O meu corpo está a pedir que eu pare.':'Meu corpo está pedindo para eu parar.',
    'Preciso de perceber o que fazer com isto.':'Preciso entender o que fazer com isso.',
    'Não quero passar por isto sozinho.':'Não quero passar por isso sozinho.',
    'Explora a Maison':'Explore a Maison',
    'Já sabes o que procuras?':'Já sabe o que procura?',
    'Então não te vou fazer perder tempo.':'Então não vou fazer você perder tempo.',
    'O teu cliente sente o espaço antes de comprar.':'Seu cliente sente o espaço antes de comprar.',
    'Aroma, toque e pequenos rituais para criar uma experiência que fica.':'Aroma, toque e pequenos rituais para criar uma experiência que permanece.',
    'Aroma, toque e pequenos rituais. Porque há espaços de onde sais e outros que levas contigo.':'Aroma, toque e pequenos rituais. Porque há espaços de onde você sai e outros que leva consigo.',
    'QUERO SABER MAIS →':'QUERO SABER MAIS →',
    'PÁRA DE IGNORAR.':'PARE DE IGNORAR.',
    'Marca registada na União Europeia · Certificação PME pelo IAPMEI.':'Marca registrada na União Europeia · Certificação PME pelo IAPMEI.'
  },
  en:{
    'MAISON JF® | PÁRA DE IGNORAR! Volta Para Casa.':'MAISON JF® | STOP IGNORING IT. Come Back Home.',
    'O que estás a ignorar? Entra na MAISON JF® por Casa, Corpo, Cabeça ou Presença. PÁRA DE IGNORAR. Volta Para Casa.':'What are you ignoring? Enter MAISON JF® through Home, Body, Mind or Presence. STOP IGNORING IT. Come Back Home.',
    'O QUE ESTÁS A IGNORAR?':'WHAT ARE YOU IGNORING?',
    'Crio produtos e serviços para te ajudar a perceber o que se passa contigo. E o que podes fazer depois de saberes isso.':"I make products and services to help you understand what's going on with you. And what you can do once you know.",
    'SEGUE O FAROL':'FOLLOW THE LIGHTHOUSE',
    'Não sei por onde começar.':"I don't know where to start.",
    'VOLTA PARA CASA':'COME BACK HOME',
    'Quero perceber o que se passa comigo.':'I want to understand what is going on with me.',
    'EXPLORA A MAISON':'EXPLORE THE MAISON',
    'Já sei o que procuro.':'I already know what I am looking for.',
    'As quatro portas da Maison':'The four doors of the Maison',
    'Quero voltar a gostar de chegar a casa.':'I want to enjoy coming home again.',
    'O meu corpo está a pedir que eu pare.':'My body is asking me to stop.',
    'Preciso de perceber o que fazer com isto.':'I need to understand what to do with this.',
    'Não quero passar por isto sozinho.':"I don't want to go through this alone.",
    'Explora a Maison':'Explore the Maison',
    'Já sabes o que procuras?':'Do you already know what you are looking for?',
    'Então não te vou fazer perder tempo.':"Then I won't waste your time.",
    'Profissionais · B2B':'Professionals · B2B',
    'O teu cliente sente o espaço antes de comprar.':'Your client feels the space before they buy.',
    'Aroma, toque e pequenos rituais para criar uma experiência que fica.':'Scent, touch and small rituals that create an experience that stays with them.',
    'Aroma, toque e pequenos rituais. Porque há espaços de onde sais e outros que levas contigo.':'Scent, touch and small rituals. Because some spaces you leave, and others you carry with you.',
    'QUERO SABER MAIS →':'I WANT TO KNOW MORE →',
    'VER B2B':'VIEW B2B',
    'PÁRA DE IGNORAR.':'STOP IGNORING IT.',
    'Marca registada na União Europeia · Certificação PME pelo IAPMEI.':'Registered trademark in the European Union · SME certification by IAPMEI.'
  },
  es:{
    'MAISON JF® | PÁRA DE IGNORAR! Volta Para Casa.':'MAISON JF® | DEJA DE IGNORARLO. Vuelve a Casa.',
    'O que estás a ignorar? Entra na MAISON JF® por Casa, Corpo, Cabeça ou Presença. PÁRA DE IGNORAR. Volta Para Casa.':'¿Qué estás ignorando? Entra en MAISON JF® por Casa, Cuerpo, Mente o Presencia. DEJA DE IGNORARLO. Vuelve a Casa.',
    'O QUE ESTÁS A IGNORAR?':'¿QUÉ ESTÁS IGNORANDO?',
    'Crio produtos e serviços para te ajudar a perceber o que se passa contigo. E o que podes fazer depois de saberes isso.':'Creo productos y servicios para ayudarte a entender qué te está pasando. Y qué puedes hacer después de saberlo.',
    'SEGUE O FAROL':'SIGUE EL FARO',
    'Não sei por onde começar.':'No sé por dónde empezar.',
    'VOLTA PARA CASA':'VUELVE A CASA',
    'Quero perceber o que se passa comigo.':'Quiero entender qué me está pasando.',
    'EXPLORA A MAISON':'EXPLORA LA MAISON',
    'Já sei o que procuro.':'Ya sé lo que busco.',
    'As quatro portas da Maison':'Las cuatro puertas de la Maison',
    'Quero voltar a gostar de chegar a casa.':'Quiero volver a disfrutar de llegar a casa.',
    'O meu corpo está a pedir que eu pare.':'Mi cuerpo me está pidiendo que pare.',
    'Preciso de perceber o que fazer com isto.':'Necesito entender qué hacer con esto.',
    'Não quero passar por isto sozinho.':'No quiero pasar por esto solo.',
    'Explora a Maison':'Explora la Maison',
    'Já sabes o que procuras?':'¿Ya sabes lo que buscas?',
    'Então não te vou fazer perder tempo.':'Entonces no voy a hacerte perder el tiempo.',
    'Profissionais · B2B':'Profesionales · B2B',
    'O teu cliente sente o espaço antes de comprar.':'Tu cliente siente el espacio antes de comprar.',
    'Aroma, toque e pequenos rituais para criar uma experiência que fica.':'Aroma, tacto y pequeños rituales para crear una experiencia que permanece.',
    'Aroma, toque e pequenos rituais. Porque há espaços de onde sais e outros que levas contigo.':'Aroma, tacto y pequeños rituales. Porque hay espacios de los que sales y otros que te llevas contigo.',
    'QUERO SABER MAIS →':'QUIERO SABER MÁS →',
    'VER B2B':'VER B2B',
    'PÁRA DE IGNORAR.':'DEJA DE IGNORARLO.',
    'Marca registada na União Europeia · Certificação PME pelo IAPMEI.':'Marca registrada en la Unión Europea · Certificación PME por IAPMEI.'
  }
};

const TESTE={
  'pt-BR':{
    'Volta Para Casa é uma experiência MAISON JF® com três portas: Atenção, Apego e Afecto. Escolhe a que mais te chama, descobre o teu resultado e continua pelo que fizer sentido.':'Volta Para Casa é uma experiência MAISON JF® com três portas: Atenção, Apego e Afeto. Escolha a que mais chama você, descubra seu resultado e continue pelo que fizer sentido.',
    'Já estás em Casa.':'Você já está em Casa.',
    'Escolhe uma porta.':'Escolha uma porta.',
    'A que te chamar primeiro.':'A que chamar você primeiro.',
    'As três portas de Volta Para Casa':'As três portas de Volta Para Casa',
    'PORTA · ATENÇÃO':'PORTA · ATENÇÃO',
    'O que está a pedir mais atenção?':'O que está pedindo mais atenção?',
    'O que pesa. O que insiste. O que pede espaço.':'O que pesa. O que insiste. O que pede espaço.',
    'PORTA · APEGO':'PORTA · APEGO',
    'O que fazes quando alguém te importa?':'O que você faz quando alguém importa para você?',
    'Proximidade. Distância. Medo de perder.':'Proximidade. Distância. Medo de perder.',
    'PORTA · AFECTO':'PORTA · AFETO',
    'Como reconheces que alguém gosta de ti?':'Como você reconhece que alguém gosta de você?',
    'Palavras. Tempo. Gestos. Presença.':'Palavras. Tempo. Gestos. Presença.'
  },
  en:{
    'Volta Para Casa | MAISON JF®':'Come Back Home | MAISON JF®',
    'Volta Para Casa é uma experiência MAISON JF® com três portas: Atenção, Apego e Afecto. Escolhe a que mais te chama, descobre o teu resultado e continua pelo que fizer sentido.':'Come Back Home is a MAISON JF® experience with three doors: Attention, Attachment and Affection. Choose the one that calls to you first, discover your result and continue with what makes sense.',
    'VOLTA PARA CASA':'COME BACK HOME',
    'Já estás em Casa.':'You are already Home.',
    'Escolhe uma porta.':'Choose a door.',
    'A que te chamar primeiro.':'Whichever calls to you first.',
    'As três portas de Volta Para Casa':'The three doors of Come Back Home',
    'PORTA · ATENÇÃO':'DOOR · ATTENTION',
    'O que está a pedir mais atenção?':'What is asking for more attention?',
    'O que pesa. O que insiste. O que pede espaço.':'What weighs on you. What keeps returning. What needs space.',
    'PORTA · APEGO':'DOOR · ATTACHMENT',
    'O que fazes quando alguém te importa?':'What do you do when someone matters to you?',
    'Proximidade. Distância. Medo de perder.':'Closeness. Distance. Fear of losing.',
    'PORTA · AFECTO':'DOOR · AFFECTION',
    'Como reconheces que alguém gosta de ti?':'How do you recognise that someone cares about you?',
    'Palavras. Tempo. Gestos. Presença.':'Words. Time. Gestures. Presence.'
  },
  es:{
    'Volta Para Casa | MAISON JF®':'Vuelve a Casa | MAISON JF®',
    'Volta Para Casa é uma experiência MAISON JF® com três portas: Atenção, Apego e Afecto. Escolhe a que mais te chama, descobre o teu resultado e continua pelo que fizer sentido.':'Vuelve a Casa es una experiencia MAISON JF® con tres puertas: Atención, Apego y Afecto. Elige la que más te llame, descubre tu resultado y continúa por donde tenga sentido.',
    'VOLTA PARA CASA':'VUELVE A CASA',
    'Já estás em Casa.':'Ya estás en Casa.',
    'Escolhe uma porta.':'Elige una puerta.',
    'A que te chamar primeiro.':'La que te llame primero.',
    'As três portas de Volta Para Casa':'Las tres puertas de Vuelve a Casa',
    'PORTA · ATENÇÃO':'PUERTA · ATENCIÓN',
    'O que está a pedir mais atenção?':'¿Qué está pidiendo más atención?',
    'O que pesa. O que insiste. O que pede espaço.':'Lo que pesa. Lo que insiste. Lo que pide espacio.',
    'PORTA · APEGO':'PUERTA · APEGO',
    'O que fazes quando alguém te importa?':'¿Qué haces cuando alguien te importa?',
    'Proximidade. Distância. Medo de perder.':'Cercanía. Distancia. Miedo a perder.',
    'PORTA · AFECTO':'PUERTA · AFECTO',
    'Como reconheces que alguém gosta de ti?':'¿Cómo reconoces que alguien te quiere?',
    'Palavras. Tempo. Gestos. Presença.':'Palabras. Tiempo. Gestos. Presencia.'
  }
};

const PRODUCTS={
  'pt-BR':{
    'Produtos MAISON JF® físicos e digitais para Casa, Corpo, Cabeça e Presença.':'Produtos MAISON JF® físicos e digitais para Casa, Corpo, Mente e Presença.',
    'Casa · Corpo · Cabeça · Presença':'Casa · Corpo · Mente · Presença',
    'Há coisas que se sentem':'Há coisas que se sentem',
    'antes de se explicarem.':'antes de serem explicadas.',
    'Escolhe pelo que queres sentir agora.':'Escolha pelo que você quer sentir agora.',
    'Produtos digitais':'Produtos digitais',
    'Também há coisas que não chegam numa caixa.':'Também há coisas que não chegam em uma caixa.',
    'Jogo digital':'Jogo digital',
    '28 perguntas. Duas pessoas. O que ainda não perguntaste.':'28 perguntas. Duas pessoas. O que você ainda não perguntou.',
    'Ver o jogo →':'Ver o jogo →',
    'Produto digital':'Produto digital',
    'Pensa na pergunta. Escolhe o território. Abre outra perspectiva.':'Pense na pergunta. Escolha o território. Abra outra perspectiva.',
    'Abrir o Oráculo →':'Abrir o Oráculo →',
    'Biblioteca · ebooks':'Biblioteca · ebooks',
    'Para ler e voltar.':'Para ler e voltar.',
    'Histórias e livros para quando não queres uma resposta rápida.':'Histórias e livros para quando você não quer uma resposta rápida.',
    'Entrar na Biblioteca →':'Entrar na Biblioteca →',
    'Ver carrinho':'Ver carrinho',
    'Todos':'Todos',
    'Curadoria Maison':'Curadoria Maison',
    'Coisas que pertencem ao nosso universo.':'Coisas que pertencem ao nosso universo.',
    'Coisas que pertencem ao meu universo.':'Coisas que pertencem ao meu universo.',
    'As peças que vês aqui são criadas à mão por ':'As peças que você vê aqui são criadas à mão por ',
    ', e eu escolhi-as para fazerem parte da curadoria da Maison JF.':', e eu as escolhi para fazerem parte da curadoria da Maison JF.',
    'Cada peça é feita individualmente, por isso pequenas variações fazem parte do seu carácter.':'Cada peça é feita individualmente, por isso pequenas variações fazem parte do seu caráter.',
    'São criadas sob encomenda e podem ser adquiridas através da Maison JF.':'São criadas sob encomenda e podem ser adquiridas através da Maison JF.',
    'Peças, matérias e pequenos objetos escolhidos pela Maison. Algumas existem em poucas unidades. Outras nascem apenas por encomenda.':'Peças, materiais e pequenos objetos escolhidos pela Maison. Algumas existem em poucas unidades. Outras nascem apenas sob encomenda.',
    'Ainda não sabes?':'Ainda não sabe?',
    'Não escolhas à força.':'Não escolha à força.',
    'Diz ao Farol o que queres sentir.':'Diga ao Farol o que você quer sentir.',
    'Envios e portes':'Envios e frete',
    'Condições da Maison':'Condições da Maison'
  },
  en:{
    'Produtos | MAISON JF®':'Products | MAISON JF®',
    'Produtos MAISON JF® físicos e digitais para Casa, Corpo, Cabeça e Presença.':'Physical and digital MAISON JF® products for Home, Body, Mind and Presence.',
    'Casa · Corpo · Cabeça · Presença':'Home · Body · Mind · Presence',
    'Há coisas que se sentem':'Some things are felt',
    'antes de se explicarem.':'before they can be explained.',
    'Escolhe pelo que queres sentir agora.':'Choose by what you want to feel right now.',
    'Produtos digitais':'Digital products',
    'Também há coisas que não chegam numa caixa.':'Some things do not arrive in a box.',
    'Jogo digital':'Digital game',
    '28 perguntas. Duas pessoas. O que ainda não perguntaste.':'28 questions. Two people. What you still have not asked.',
    'Ver o jogo →':'See the game →',
    'Produto digital':'Digital product',
    'Pensa na pergunta. Escolhe o território. Abre outra perspectiva.':'Think of the question. Choose the territory. Open another perspective.',
    'Abrir o Oráculo →':'Open the Oracle →',
    'Biblioteca · ebooks':'Library · ebooks',
    'Para ler e voltar.':'To read and return to.',
    'Histórias e livros para quando não queres uma resposta rápida.':'Stories and books for when you do not want a quick answer.',
    'Entrar na Biblioteca →':'Enter the Library →',
    'Ver carrinho':'View cart',
    'Todos':'All',
    'Curadoria Maison':'Maison Curatorship',
    'Coisas que pertencem ao nosso universo.':'Things that belong in our universe.',
    'Coisas que pertencem ao meu universo.':'Things that belong in my world.',
    'As peças que vês aqui são criadas à mão por ':'The pieces you see here are handmade by ',
    ', e eu escolhi-as para fazerem parte da curadoria da Maison JF.':', and I chose them to be part of the Maison JF curation.',
    'Cada peça é feita individualmente, por isso pequenas variações fazem parte do seu carácter.':'Each piece is made individually, so small variations are part of its character.',
    'São criadas sob encomenda e podem ser adquiridas através da Maison JF.':'They are made to order and can be purchased through Maison JF.',
    'Peças, matérias e pequenos objetos escolhidos pela Maison. Algumas existem em poucas unidades. Outras nascem apenas por encomenda.':'Pieces, materials and small objects chosen by the Maison. Some exist in very limited quantities. Others are made only to order.',
    'A começar pela Jesmonite. Depois, cristais, pulseiras e outras peças que fizerem sentido aqui — sem as transformar em produtos de fabrico Maison.':'Starting with Jesmonite. Then crystals, bracelets and other pieces that belong here, without turning them into Maison-manufactured products.',
    'Ainda não sabes?':'Still not sure?',
    'Não escolhas à força.':"Don't force the choice.",
    'Diz ao Farol o que queres sentir.':'Tell the Lighthouse what you want to feel.',
    'Envios e portes':'Shipping',
    'Condições da Maison':'Maison terms'
  },
  es:{
    'Produtos | MAISON JF®':'Productos | MAISON JF®',
    'Produtos MAISON JF® físicos e digitais para Casa, Corpo, Cabeça e Presença.':'Productos físicos y digitales MAISON JF® para Casa, Cuerpo, Mente y Presencia.',
    'Casa · Corpo · Cabeça · Presença':'Casa · Cuerpo · Mente · Presencia',
    'Há coisas que se sentem':'Hay cosas que se sienten',
    'antes de se explicarem.':'antes de poder explicarlas.',
    'Escolhe pelo que queres sentir agora.':'Elige por lo que quieres sentir ahora.',
    'Produtos digitais':'Productos digitales',
    'Também há coisas que não chegam numa caixa.':'También hay cosas que no llegan en una caja.',
    'Jogo digital':'Juego digital',
    '28 perguntas. Duas pessoas. O que ainda não perguntaste.':'28 preguntas. Dos personas. Lo que todavía no has preguntado.',
    'Ver o jogo →':'Ver el juego →',
    'Produto digital':'Producto digital',
    'Pensa na pergunta. Escolhe o território. Abre outra perspectiva.':'Piensa en la pregunta. Elige el territorio. Abre otra perspectiva.',
    'Abrir o Oráculo →':'Abrir el Oráculo →',
    'Biblioteca · ebooks':'Biblioteca · ebooks',
    'Para ler e voltar.':'Para leer y volver.',
    'Histórias e livros para quando não queres uma resposta rápida.':'Historias y libros para cuando no quieres una respuesta rápida.',
    'Entrar na Biblioteca →':'Entrar en la Biblioteca →',
    'Ver carrinho':'Ver carrito',
    'Todos':'Todos',
    'Curadoria Maison':'Curaduría Maison',
    'Coisas que pertencem ao nosso universo.':'Cosas que pertenecen a nuestro universo.',
    'Coisas que pertencem ao meu universo.':'Cosas que pertenecen a mi universo.',
    'As peças que vês aqui são criadas à mão por ':'Las piezas que ves aquí están hechas a mano por ',
    ', e eu escolhi-as para fazerem parte da curadoria da Maison JF.':', y yo las elegí para formar parte de la curaduría de Maison JF.',
    'Cada peça é feita individualmente, por isso pequenas variações fazem parte do seu carácter.':'Cada pieza se hace individualmente, por eso las pequeñas variaciones forman parte de su carácter.',
    'São criadas sob encomenda e podem ser adquiridas através da Maison JF.':'Se hacen por encargo y pueden adquirirse a través de Maison JF.',
    'Peças, matérias e pequenos objetos escolhidos pela Maison. Algumas existem em poucas unidades. Outras nascem apenas por encomenda.':'Piezas, materiales y pequeños objetos elegidos por la Maison. Algunos existen en pocas unidades. Otros nacen únicamente por encargo.',
    'A começar pela Jesmonite. Depois, cristais, pulseiras e outras peças que fizerem sentido aqui — sem as transformar em produtos de fabrico Maison.':'Empezando por Jesmonite. Después, cristales, pulseras y otras piezas que tengan sentido aquí, sin convertirlas en productos fabricados por la Maison.',
    'Ainda não sabes?':'¿Todavía no lo sabes?',
    'Não escolhas à força.':'No elijas a la fuerza.',
    'Diz ao Farol o que queres sentir.':'Dile al Faro lo que quieres sentir.',
    'Envios e portes':'Envíos',
    'Condições da Maison':'Condiciones de la Maison'
  }
};

const SERVICES={
  'pt-BR':{
    'Consulta de Tarot, Acompanhamento, Presença e pedidos personalizados MAISON JF®.':'Consulta de Tarot, Acompanhamento, Presença e pedidos personalizados MAISON JF®.',
    'Há qualquer coisa que ainda está contigo.':'Há alguma coisa que ainda está com você.',
    'Começa pelo que já sabes que te trouxe aqui.':'Comece pelo que você já sabe que trouxe você até aqui.',
    'Consulta de Tarot':'Consulta de Tarot',
    'Uma consulta. Outro ângulo.':'Uma consulta. Outro ângulo.',
    'Marcar consulta →':'Agendar consulta →',
    'Tenho uma dúvida':'Tenho uma dúvida',
    'Uma consulta para trazer contexto à tua pergunta, organizar o que está misturado e abrir outras formas de olhar para a situação.':'Uma consulta para trazer contexto à sua pergunta, organizar o que está misturado e abrir outras formas de olhar para a situação.',
    'O Tarot é usado como ferramenta de reflexão e orientação. Não decide por ti, não garante acontecimentos futuros e não substitui acompanhamento clínico quando necessário.':'O Tarot é usado como ferramenta de reflexão e orientação. Não decide por você, não garante acontecimentos futuros e não substitui acompanhamento clínico quando necessário.',
    'Uso o Tarot como ferramenta de reflexão e orientação. Não decide por ti, não garante acontecimentos futuros e não substitui acompanhamento clínico quando necessário.':'Uso o Tarot como ferramenta de reflexão e orientação. Ele não decide por você, não garante acontecimentos futuros e não substitui acompanhamento clínico quando necessário.',
    'Outros caminhos':'Outros caminhos',
    'Só quando fazem sentido.':'Só quando fizerem sentido.',
    'A Maison acompanha de outras formas quando a situação pede continuidade, presença ou um pedido específico.':'A Maison acompanha de outras formas quando a situação pede continuidade, presença ou um pedido específico.',
    'Também posso acompanhar-te de outras formas quando a situação pede continuidade, presença ou um pedido específico.':'Também posso acompanhar você de outras formas quando a situação pede continuidade, presença ou um pedido específico.',
    'Falar comigo →':'Falar comigo →',
    'Quero perceber como funciona →':'Quero entender como funciona →',
    'Ver como funciona →':'Ver como funciona →',
    'Quero explicar a intenção →':'Quero explicar a intenção →',
    'Quero explicar o pedido →':'Quero explicar o pedido →',
    'Continuidade':'Continuidade',
    'Acompanhamento':'Acompanhamento',
    'Falar connosco →':'Falar conosco →',
    'Estrutura':'Estrutura',
    'Mentoria':'Mentoria',
    'Perceber como funciona →':'Entender como funciona →',
    'Não quero atravessar isto sozinho.':'Não quero atravessar isso sozinho.',
    'Ritual Personalizado':'Ritual Personalizado',
    'Explicar a intenção →':'Explicar a intenção →',
    'Pedidos especiais':'Pedidos especiais',
    'Nem tudo vem pronto.':'Nem tudo vem pronto.',
    'Explicar o pedido →':'Explicar o pedido →'
  },
  en:{
    'Serviços | MAISON JF®':'Services | MAISON JF®',
    'Consulta de Tarot, Acompanhamento, Presença e pedidos personalizados MAISON JF®.':'Tarot consultations, ongoing support, Presence and personalised MAISON JF® requests.',
    'Serviços · MAISON JF®':'Services · MAISON JF®',
    'Há qualquer coisa que ainda está contigo.':'Something is still with you.',
    'Começa pelo que já sabes que te trouxe aqui.':'Start with what you already know brought you here.',
    'Consulta de Tarot':'Tarot Consultation',
    'Uma consulta. Outro ângulo.':'One consultation. Another angle.',
    'Marcar consulta →':'Book a consultation →',
    'Tenho uma dúvida':'I have a question',
    'Uma consulta para trazer contexto à tua pergunta, organizar o que está misturado e abrir outras formas de olhar para a situação.':'A consultation to bring context to your question, organise what feels tangled and open other ways of looking at the situation.',
    'O Tarot é usado como ferramenta de reflexão e orientação. Não decide por ti, não garante acontecimentos futuros e não substitui acompanhamento clínico quando necessário.':'Tarot is used as a tool for reflection and orientation. It does not decide for you, guarantee future events or replace clinical care when needed.',
    'Uso o Tarot como ferramenta de reflexão e orientação. Não decide por ti, não garante acontecimentos futuros e não substitui acompanhamento clínico quando necessário.':'I use Tarot as a tool for reflection and orientation. It does not decide for you, guarantee future events or replace clinical care when needed.',
    'Outros caminhos':'Other paths',
    'Só quando fazem sentido.':'Only when they make sense.',
    'A Maison acompanha de outras formas quando a situação pede continuidade, presença ou um pedido específico.':'The Maison can accompany you in other ways when the situation calls for continuity, presence or a specific request.',
    'Também posso acompanhar-te de outras formas quando a situação pede continuidade, presença ou um pedido específico.':'I can also stay with you in other ways when the situation calls for continuity, presence or a specific request.',
    'Falar comigo →':'Talk to me →',
    'Quero perceber como funciona →':'I want to understand how it works →',
    'Ver como funciona →':'See how it works →',
    'Quero explicar a intenção →':'I want to explain the intention →',
    'Quero explicar o pedido →':'I want to explain the request →',
    'Continuidade':'Continuity',
    'Acompanhamento':'Ongoing Support',
    'Falar connosco →':'Talk to us →',
    'Estrutura':'Structure',
    'Mentoria':'Mentoring',
    'Perceber como funciona →':'See how it works →',
    'Não quero atravessar isto sozinho.':"I don't want to go through this alone.",
    'Ritual':'Ritual',
    'Ritual Personalizado':'Personalised Ritual',
    'Explicar a intenção →':'Explain the intention →',
    'Pedidos especiais':'Special requests',
    'Nem tudo vem pronto.':'Not everything comes ready-made.',
    'Explicar o pedido →':'Explain the request →'
  },
  es:{
    'Serviços | MAISON JF®':'Servicios | MAISON JF®',
    'Consulta de Tarot, Acompanhamento, Presença e pedidos personalizados MAISON JF®.':'Consulta de Tarot, acompañamiento, Presencia y pedidos personalizados MAISON JF®.',
    'Serviços · MAISON JF®':'Servicios · MAISON JF®',
    'Há qualquer coisa que ainda está contigo.':'Hay algo que todavía sigue contigo.',
    'Começa pelo que já sabes que te trouxe aqui.':'Empieza por lo que ya sabes que te ha traído hasta aquí.',
    'Consulta de Tarot':'Consulta de Tarot',
    'Uma consulta. Outro ângulo.':'Una consulta. Otro ángulo.',
    'Marcar consulta →':'Reservar consulta →',
    'Tenho uma dúvida':'Tengo una duda',
    'Uma consulta para trazer contexto à tua pergunta, organizar o que está misturado e abrir outras formas de olhar para a situação.':'Una consulta para dar contexto a tu pregunta, ordenar lo que está mezclado y abrir otras formas de mirar la situación.',
    'O Tarot é usado como ferramenta de reflexão e orientação. Não decide por ti, não garante acontecimentos futuros e não substitui acompanhamento clínico quando necessário.':'El Tarot se utiliza como herramienta de reflexión y orientación. No decide por ti, no garantiza acontecimientos futuros ni sustituye la atención clínica cuando sea necesaria.',
    'Uso o Tarot como ferramenta de reflexão e orientação. Não decide por ti, não garante acontecimentos futuros e não substitui acompanhamento clínico quando necessário.':'Uso el Tarot como herramienta de reflexión y orientación. No decide por ti, no garantiza acontecimientos futuros ni sustituye la atención clínica cuando sea necesaria.',
    'Outros caminhos':'Otros caminos',
    'Só quando fazem sentido.':'Solo cuando tienen sentido.',
    'A Maison acompanha de outras formas quando a situação pede continuidade, presença ou um pedido específico.':'La Maison acompaña de otras formas cuando la situación pide continuidad, presencia o una petición concreta.',
    'Também posso acompanhar-te de outras formas quando a situação pede continuidade, presença ou um pedido específico.':'También puedo acompañarte de otras formas cuando la situación pide continuidad, presencia o una petición concreta.',
    'Falar comigo →':'Hablar conmigo →',
    'Quero perceber como funciona →':'Quiero entender cómo funciona →',
    'Ver como funciona →':'Ver cómo funciona →',
    'Quero explicar a intenção →':'Quiero explicar la intención →',
    'Quero explicar o pedido →':'Quiero explicar el pedido →',
    'Continuidade':'Continuidad',
    'Acompanhamento':'Acompañamiento',
    'Falar connosco →':'Hablar con nosotros →',
    'Estrutura':'Estructura',
    'Mentoria':'Mentoría',
    'Perceber como funciona →':'Ver cómo funciona →',
    'Não quero atravessar isto sozinho.':'No quiero atravesar esto solo.',
    'Ritual Personalizado':'Ritual Personalizado',
    'Explicar a intenção →':'Explicar la intención →',
    'Pedidos especiais':'Pedidos especiales',
    'Nem tudo vem pronto.':'No todo viene ya hecho.',
    'Explicar o pedido →':'Explicar el pedido →'
  }
};

const FAROL={
  'pt-BR':{
    'O Farol | Encontra o próximo passo | MAISON JF®':'O Farol | Encontre o próximo passo | MAISON JF®',
    'Não sabes o que precisas? Começa pelo que não te deixa em paz. O Farol parte daquilo que estás a viver e orienta-te para o objecto, leitura, experiência ou serviço MAISON JF® que pode fazer sentido agora.':'Não sabe do que precisa? Comece pelo que não deixa você em paz. O Farol parte do que você está vivendo e orienta para o objeto, leitura, experiência ou serviço MAISON JF® que pode fazer sentido agora.',
    '← Voltar à MAISON JF®':'← Voltar à MAISON JF®',
    'Há uma coisa que não te larga. Começa por aí.':'Há uma coisa que não larga você. Comece por aí.',
    'Não precisas de saber o que procuras. Diz-me só o que anda a ocupar-te a cabeça.':'Você não precisa saber o que procura. Só me diga o que anda ocupando a sua cabeça.',
    'Não tens de saber o que procuras. Basta saber o que não te larga.':'Você não precisa saber o que procura. Basta saber o que não larga você.',
    'Escolhe a frase que já te passou pela cabeça. O resto vem depois.':'Escolha a frase que já passou pela sua cabeça. O resto vem depois.',
    'Seguir o Farol':'Seguir o Farol',
    'Já sei o que procuro →':'Já sei o que procuro →',
    'Qual destas frases podia ser tua?':'Qual destas frases poderia ser sua?',
    'Não procures a resposta certa. Escolhe a que te apanhou.':'Não procure a resposta certa. Escolha a que pegou em você.',
    'É outra coisa →':'É outra coisa →',
    'Vamos perceber melhor.':'Vamos entender melhor.',
    'O Farol orienta. Não diagnostica nem substitui apoio profissional quando necessário.':'O Farol orienta. Não diagnostica nem substitui apoio profissional quando necessário.',
    'Volta Para Casa.':'Volte Para Casa.'
  },
  en:{
    'O Farol | Encontra o próximo passo | MAISON JF®':'The Lighthouse | Find the next step | MAISON JF®',
    'Não sabes o que precisas? Começa pelo que não te deixa em paz. O Farol parte daquilo que estás a viver e orienta-te para o objecto, leitura, experiência ou serviço MAISON JF® que pode fazer sentido agora.':'Not sure what you need? Start with what will not leave you alone. The Lighthouse begins with what you are living through and points you towards the MAISON JF® object, reading, experience or service that may make sense now.',
    '← Voltar à MAISON JF®':'← Back to MAISON JF®',
    'Há uma coisa que não te larga. Começa por aí.':"There's something that won't leave you alone. Start there.",
    'Não precisas de saber o que procuras. Diz-me só o que anda a ocupar-te a cabeça.':"You don't need to know what you're looking for. Just tell me what's been taking up space in your head.",
    'Não tens de saber o que procuras. Basta saber o que não te larga.':"You don't have to know what you are looking for. You only need to know what will not let go.",
    'Escolhe a frase que já te passou pela cabeça. O resto vem depois.':'Choose the sentence that has already crossed your mind. The rest comes later.',
    'Seguir o Farol':'Follow the Lighthouse',
    'Já sei o que procuro →':'I already know what I need →',
    'Qual destas frases podia ser tua?':'Which of these could have been yours?',
    'Não procures a resposta certa. Escolhe a que te apanhou.':"Don't look for the right answer. Choose the one that caught you.",
    'É outra coisa →':'It is something else →',
    'Vamos perceber melhor.':"Let's understand it better.",
    'O Farol orienta. Não diagnostica nem substitui apoio profissional quando necessário.':'The Lighthouse offers orientation. It does not diagnose or replace professional support when needed.',
    'Volta Para Casa.':'Come Back Home.'
  },
  es:{
    'O Farol | Encontra o próximo passo | MAISON JF®':'El Faro | Encuentra el siguiente paso | MAISON JF®',
    'Não sabes o que precisas? Começa pelo que não te deixa em paz. O Farol parte daquilo que estás a viver e orienta-te para o objecto, leitura, experiência ou serviço MAISON JF® que pode fazer sentido agora.':'¿No sabes qué necesitas? Empieza por lo que no te deja en paz. El Faro parte de lo que estás viviendo y te orienta hacia el objeto, lectura, experiencia o servicio MAISON JF® que puede tener sentido ahora.',
    '← Voltar à MAISON JF®':'← Volver a MAISON JF®',
    'Há uma coisa que não te larga. Começa por aí.':'Hay algo que no te suelta. Empieza por ahí.',
    'Não precisas de saber o que procuras. Diz-me só o que anda a ocupar-te a cabeça.':'No necesitas saber qué buscas. Dime solo qué te está ocupando la cabeza.',
    'Não tens de saber o que procuras. Basta saber o que não te larga.':'No tienes que saber qué buscas. Basta con saber qué no te suelta.',
    'Escolhe a frase que já te passou pela cabeça. O resto vem depois.':'Elige la frase que ya te ha pasado por la cabeza. El resto viene después.',
    'Seguir o Farol':'Seguir el Faro',
    'Já sei o que procuro →':'Ya sé lo que busco →',
    'Qual destas frases podia ser tua?':'¿Cuál de estas frases podría ser tuya?',
    'Não procures a resposta certa. Escolhe a que te apanhou.':'No busques la respuesta correcta. Elige la que te atrapó.',
    'É outra coisa →':'Es otra cosa →',
    'Vamos perceber melhor.':'Vamos a entenderlo mejor.',
    'O Farol orienta. Não diagnostica nem substitui apoio profissional quando necessário.':'El Faro orienta. No diagnostica ni sustituye el apoyo profesional cuando sea necesario.',
    'Volta Para Casa.':'Vuelve a Casa.'
  }
};




const PDI={
  'pt-BR':{
    'PÁRA DE IGNORAR! | Jogo digital MAISON JF®':'PARE DE IGNORAR! | Jogo digital MAISON JF®',
    'PÁRA DE IGNORAR!: 28 perguntas. Duas pessoas. Aquilo que sempre quiseste saber, sem saber como perguntar.':'PARE DE IGNORAR!: 28 perguntas. Duas pessoas. Aquilo que você sempre quis saber, sem saber como perguntar.',
    '28 perguntas · duas pessoas':'28 perguntas · duas pessoas',
    'PÁRA DE':'PARE DE',
    'IGNORAR!':'IGNORAR!',
    'Aquilo que sempre quiseste saber.':'Aquilo que você sempre quis saber.',
    'Sem saber como perguntar.':'Sem saber como perguntar.',
    'Escolher tema':'Escolher tema',
    'Uma sessão. Uma conversa que pode mudar qualquer coisa.':'Uma sessão. Uma conversa que pode mudar alguma coisa.',
    'Como funciona':'Como funciona',
    'Pergunta.':'Pergunte.',
    'Não prepares a resposta.':'Não prepare a resposta.',
    'Responde. Ou passa.':'Responda. Ou passe.',
    'Sem justificações.':'Sem justificativas.',
    'Troquem.':'Troquem.',
    'Agora é a vez do outro.':'Agora é a vez da outra pessoa.',
    'Cada tema · 28 perguntas · 5 €':'Cada tema · 28 perguntas · 5 €',
    'Escolhe por onde entrar':'Escolha por onde entrar',
    'Escolhe onde dói.':'Escolha onde dói.',
    'Ou onde tens curiosidade.':'Ou onde você tem curiosidade.',
    'Uma conversa de cada vez.':'Uma conversa de cada vez.',
    'A carregar':'Carregando',
    'Só um instante…':'Só um instante…',
    'A promessa do jogo':'A promessa do jogo',
    'Outra vez. Outra conversa.':'Outra vez. Outra conversa.',
    'Quando voltas, o jogo procura primeiro perguntas que ainda não viste.':'Quando você volta, o jogo procura primeiro perguntas que ainda não viu.',
    'Guarda o caminho. Nunca as respostas.':'Guarda o caminho. Nunca as respostas.',
    'Há sempre alguma coisa que ainda não perguntaste.':'Sempre há alguma coisa que você ainda não perguntou.',
    'Entre vocês':'Entre vocês',
    'Tens coragem de jogar isto comigo?':'Você tem coragem de jogar isso comigo?',
    'O que disserem fica entre vocês. A Maison não pede nem guarda as respostas.':'O que vocês disserem fica entre vocês. A Maison não pede nem guarda as respostas.',
    'Privacidade →':'Privacidade →'
  },
  en:{
    'PÁRA DE IGNORAR! | Jogo digital MAISON JF®':'STOP IGNORING IT! | MAISON JF® digital game',
    'PÁRA DE IGNORAR!: 28 perguntas. Duas pessoas. Aquilo que sempre quiseste saber, sem saber como perguntar.':'STOP IGNORING IT!: 28 questions. Two people. What you always wanted to know, without knowing how to ask.',
    '28 perguntas · duas pessoas':'28 questions · two people',
    'PÁRA DE':'STOP',
    'IGNORAR!':'IGNORING IT!',
    'Aquilo que sempre quiseste saber.':'What you always wanted to know.',
    'Sem saber como perguntar.':'Without knowing how to ask.',
    'Escolher tema':'Choose a theme',
    'Uma sessão. Uma conversa que pode mudar qualquer coisa.':'One session. One conversation that can change something.',
    'Como funciona':'How it works',
    'Pergunta.':'Ask.',
    'Não prepares a resposta.':"Don't prepare the answer.",
    'Responde. Ou passa.':'Answer. Or pass.',
    'Sem justificações.':'No explanations required.',
    'Troquem.':'Switch.',
    'Agora é a vez do outro.':"Now it's the other person's turn.",
    'Cada tema · 28 perguntas · 5 €':'Each theme · 28 questions · €5',
    'Escolhe por onde entrar':'Choose where to enter',
    'Escolhe onde dói.':'Choose where it hurts.',
    'Ou onde tens curiosidade.':'Or where you are curious.',
    'Uma conversa de cada vez.':'One conversation at a time.',
    'A carregar':'Loading',
    'Só um instante…':'Just a moment…',
    'A promessa do jogo':'The promise of the game',
    'Outra vez. Outra conversa.':'Again. Another conversation.',
    'Quando voltas, o jogo procura primeiro perguntas que ainda não viste.':'When you come back, the game looks first for questions you have not seen yet.',
    'Guarda o caminho. Nunca as respostas.':'Keep the path. Never the answers.',
    'Há sempre alguma coisa que ainda não perguntaste.':'There is always something you still have not asked.',
    'Entre vocês':'Between you',
    'Tens coragem de jogar isto comigo?':'Do you dare to play this with me?',
    'O que disserem fica entre vocês. A Maison não pede nem guarda as respostas.':'What you say stays between you. The Maison does not ask for or store your answers.',
    'Privacidade →':'Privacy →'
  },
  es:{
    'PÁRA DE IGNORAR! | Jogo digital MAISON JF®':'¡DEJA DE IGNORARLO! | Juego digital MAISON JF®',
    'PÁRA DE IGNORAR!: 28 perguntas. Duas pessoas. Aquilo que sempre quiseste saber, sem saber como perguntar.':'¡DEJA DE IGNORARLO!: 28 preguntas. Dos personas. Lo que siempre quisiste saber, sin saber cómo preguntar.',
    '28 perguntas · duas pessoas':'28 preguntas · dos personas',
    'PÁRA DE':'DEJA DE',
    'IGNORAR!':'¡IGNORARLO!',
    'Aquilo que sempre quiseste saber.':'Lo que siempre quisiste saber.',
    'Sem saber como perguntar.':'Sin saber cómo preguntar.',
    'Escolher tema':'Elegir tema',
    'Uma sessão. Uma conversa que pode mudar qualquer coisa.':'Una sesión. Una conversación que puede cambiar algo.',
    'Como funciona':'Cómo funciona',
    'Pergunta.':'Pregunta.',
    'Não prepares a resposta.':'No prepares la respuesta.',
    'Responde. Ou passa.':'Responde. O pasa.',
    'Sem justificações.':'Sin justificaciones.',
    'Troquem.':'Cambiad.',
    'Agora é a vez do outro.':'Ahora le toca a la otra persona.',
    'Cada tema · 28 perguntas · 5 €':'Cada tema · 28 preguntas · 5 €',
    'Escolhe por onde entrar':'Elige por dónde entrar',
    'Escolhe onde dói.':'Elige dónde duele.',
    'Ou onde tens curiosidade.':'O donde tienes curiosidad.',
    'Uma conversa de cada vez.':'Una conversación cada vez.',
    'A carregar':'Cargando',
    'Só um instante…':'Solo un momento…',
    'A promessa do jogo':'La promesa del juego',
    'Outra vez. Outra conversa.':'Otra vez. Otra conversación.',
    'Quando voltas, o jogo procura primeiro perguntas que ainda não viste.':'Cuando vuelves, el juego busca primero preguntas que todavía no has visto.',
    'Guarda o caminho. Nunca as respostas.':'Guarda el camino. Nunca las respuestas.',
    'Há sempre alguma coisa que ainda não perguntaste.':'Siempre hay algo que todavía no has preguntado.',
    'Entre vocês':'Entre vosotros',
    'Tens coragem de jogar isto comigo?':'¿Te atreves a jugar esto conmigo?',
    'O que disserem fica entre vocês. A Maison não pede nem guarda as respostas.':'Lo que digáis queda entre vosotros. La Maison no pide ni guarda las respuestas.',
    'Privacidade →':'Privacidad →'
  }
};

const EBOOKS={
  'pt-BR':{
    'Universos MAISON JF®: obras publicadas e sagas inéditas das Éditions Maison JF.':'Universos MAISON JF®: obras publicadas e sagas inéditas das Éditions Maison JF.',
    'Universos.':'Universos.',
    'Histórias que continuam depois da última página.':'Histórias que continuam depois da última página.',
    'Escrevo histórias que continuam depois da última página.':'Escrevo histórias que continuam depois da última página.',
    'Ainda não viste tudo.':'Você ainda não viu tudo.',
    'Há histórias, experiências e livros que ainda estou a construir.':'Há histórias, experiências e livros que ainda estou construindo.',
    'Clica nos posters. Eu conto-te o resto.':'Clique nos pôsteres. Eu conto o resto para você.',
    'Casos, decisões e múltiplos caminhos. Aqui és tu que entras na história.':'Casos, decisões e múltiplos caminhos. Aqui é você que entra na história.',
    'Livros sobre aquilo que pensas, sentes e fazes. Sem fingir que é tudo bonito.':'Livros sobre aquilo que você pensa, sente e faz. Sem fingir que é tudo bonito.',
    'Já publicados':'Já publicados',
    'Livros publicados':'Livros publicados',
    'Éditions Maison JF apresenta':'Éditions Maison JF apresenta',
    'Universos por revelar.':'Universos por revelar.',
    'Histórias, experiências e livros que continuam depois da última página.':'Histórias, experiências e livros que continuam depois da última página.',
    'Ficção':'Ficção',
    'Sagas e histórias que atravessam mundos.':'Sagas e histórias que atravessam mundos.',
    'Clica nos posters para saberes mais sobre cada saga!':'Clique nos pôsteres para saber mais sobre cada saga!',
    'Livros Interactivos':'Livros Interativos',
    'Casos, decisões e múltiplos caminhos.':'Casos, decisões e múltiplos caminhos.',
    'Sem Filtros':'Sem Filtros',
    'Livros sobre aquilo que pensamos, sentimos e fazemos. Sem fingir que é tudo bonito.':'Livros sobre aquilo que pensamos, sentimos e fazemos. Sem fingir que é tudo bonito.',
    'Descobrir →':'Descobrir →',
    'Éditions Maison JF · Brevemente':'Éditions Maison JF · Em breve',
    'Ampliar 100%':'Ampliar 100%',
    'Fechar poster ampliado':'Fechar pôster ampliado',
    'Imagem ampliada; use as setas para percorrer':'Imagem ampliada; use as setas para percorrer'
  },
  en:{
    'Universos | MAISON JF®':'Universes | MAISON JF®',
    'Universos MAISON JF®: obras publicadas e sagas inéditas das Éditions Maison JF.':'MAISON JF® universes: published works and unreleased sagas from Éditions Maison JF.',
    'Universos.':'Universes.',
    'Histórias que continuam depois da última página.':'Stories that continue after the last page.',
    'Escrevo histórias que continuam depois da última página.':'I write stories that continue after the last page.',
    'Ainda não viste tudo.':"You haven't seen everything yet.",
    'Há histórias, experiências e livros que ainda estou a construir.':"There are stories, experiences and books I'm still building.",
    'Clica nos posters. Eu conto-te o resto.':'Click the posters. I’ll tell you the rest.',
    'Casos, decisões e múltiplos caminhos. Aqui és tu que entras na história.':'Cases, decisions and multiple paths. Here, you are the one who steps into the story.',
    'Livros sobre aquilo que pensas, sentes e fazes. Sem fingir que é tudo bonito.':'Books about what you think, feel and do. Without pretending it is all beautiful.',
    'Já publicados':'Published',
    'Livros publicados':'Published books',
    'Éditions Maison JF apresenta':'Éditions Maison JF presents',
    'Universos por revelar.':'Universes yet to be revealed.',
    'Histórias, experiências e livros que continuam depois da última página.':'Stories, experiences and books that continue after the last page.',
    'Ficção':'Fiction',
    'Sagas e histórias que atravessam mundos.':'Sagas and stories that cross worlds.',
    'Clica nos posters para saberes mais sobre cada saga!':'Click the posters to discover more about each saga!',
    'Livros Interactivos':'Interactive Books',
    'Casos, decisões e múltiplos caminhos.':'Cases, decisions and multiple paths.',
    'Sem Filtros':'Unfiltered',
    'Livros sobre aquilo que pensamos, sentimos e fazemos. Sem fingir que é tudo bonito.':'Books about what we think, feel and do. Without pretending everything is beautiful.',
    'Descobrir →':'Discover →',
    'Éditions Maison JF · Brevemente':'Éditions Maison JF · Coming soon',
    'Ampliar 100%':'Zoom 100%',
    'Fechar poster ampliado':'Close enlarged poster',
    'Imagem ampliada; use as setas para percorrer':'Enlarged image; use the arrow keys to move around'
  },
  es:{
    'Universos | MAISON JF®':'Universos | MAISON JF®',
    'Universos MAISON JF®: obras publicadas e sagas inéditas das Éditions Maison JF.':'Universos MAISON JF®: obras publicadas y sagas inéditas de Éditions Maison JF.',
    'Universos.':'Universos.',
    'Histórias que continuam depois da última página.':'Historias que continúan después de la última página.',
    'Escrevo histórias que continuam depois da última página.':'Escribo historias que continúan después de la última página.',
    'Ainda não viste tudo.':'Todavía no lo has visto todo.',
    'Há histórias, experiências e livros que ainda estou a construir.':'Hay historias, experiencias y libros que todavía estoy construyendo.',
    'Clica nos posters. Eu conto-te o resto.':'Haz clic en los pósteres. Yo te cuento el resto.',
    'Casos, decisões e múltiplos caminhos. Aqui és tu que entras na história.':'Casos, decisiones y múltiples caminos. Aquí eres tú quien entra en la historia.',
    'Livros sobre aquilo que pensas, sentes e fazes. Sem fingir que é tudo bonito.':'Libros sobre lo que piensas, sientes y haces. Sin fingir que todo es bonito.',
    'Já publicados':'Ya publicados',
    'Livros publicados':'Libros publicados',
    'Éditions Maison JF apresenta':'Éditions Maison JF presenta',
    'Universos por revelar.':'Universos por revelar.',
    'Histórias, experiências e livros que continuam depois da última página.':'Historias, experiencias y libros que continúan después de la última página.',
    'Ficção':'Ficción',
    'Sagas e histórias que atravessam mundos.':'Sagas e historias que atraviesan mundos.',
    'Clica nos posters para saberes mais sobre cada saga!':'¡Haz clic en los pósteres para saber más sobre cada saga!',
    'Livros Interactivos':'Libros Interactivos',
    'Casos, decisões e múltiplos caminhos.':'Casos, decisiones y múltiples caminos.',
    'Sem Filtros':'Sin Filtros',
    'Livros sobre aquilo que pensamos, sentimos e fazemos. Sem fingir que é tudo bonito.':'Libros sobre lo que pensamos, sentimos y hacemos. Sin fingir que todo es bonito.',
    'Descobrir →':'Descubrir →',
    'Éditions Maison JF · Brevemente':'Éditions Maison JF · Próximamente',
    'Ampliar 100%':'Ampliar 100%',
    'Fechar poster ampliado':'Cerrar póster ampliado',
    'Imagem ampliada; use as setas para percorrer':'Imagen ampliada; usa las flechas para desplazarte'
  }
};

const DOOR_CASA={
  'pt-BR':{
    'A Porta Casa da MAISON JF® para quando queres voltar a sentir que chegaste a algum lado teu.':'A Porta Casa da MAISON JF® para quando você quer voltar a sentir que chegou a um lugar seu.',
    'Quero gostar de voltar.':'Quero gostar de voltar.',
    'Há dias em que o peso começa antes mesmo de pousares as chaves.':'Há dias em que o peso começa antes mesmo de você largar as chaves.',
    'Criar ambiente':'Criar ambiente',
    'A porta Casa':'A porta Casa',
    'Um espaço pode não resolver a vida. Mas pode deixar de acrescentar peso.':'Um espaço pode não resolver a vida. Mas pode deixar de acrescentar peso.',
    'Casa · O mundo para onde queres voltar':'Casa · O mundo para onde você quer voltar',
    'Atmosfera':'Atmosfera',
    'Não é só cheiro. É a passagem entre lá fora e aqui dentro.':'Não é só cheiro. É a passagem entre lá fora e aqui dentro.',
    'Às vezes, mudar a sensação de um espaço é o primeiro gesto que o resto de ti consegue acompanhar.':'Às vezes, mudar a sensação de um espaço é o primeiro gesto que o resto de você consegue acompanhar.',
    'Nesta porta, juntei produtos, gestos e leituras para te ajudar a cuidar da atmosfera sem transformares a casa num cenário. É menos sobre decorar. Mais sobre reconhecer o lugar onde vives.':'Nesta porta, juntei produtos, gestos e leituras para ajudar você a cuidar da atmosfera sem transformar a casa num cenário. É menos sobre decorar. Mais sobre reconhecer o lugar onde você vive.',
    'Ver produtos para Casa →':'Ver produtos para Casa →',
    'Escolhe o que ajuda a casa a voltar a ser tua.':'Escolha o que ajuda a casa a voltar a ser sua.',
    'Mudar o ambiente':'Mudar o ambiente',
    'Luz. Aroma. Um espaço que muda de ritmo.':'Luz. Aroma. Um espaço que muda de ritmo.',
    'Oráculo':'Oráculo',
    'Casa & Refúgio':'Casa & Refúgio',
    'Quando chegas a casa e ainda não sentes que chegaste.':'Quando você chega em casa e ainda não sente que chegou.',
    'Trabalhar o espaço':'Trabalhar o espaço',
    'Rituais e pedidos especiais quando queres ir além do produto.':'Rituais e pedidos especiais quando você quer ir além do produto.'
  },
  en:{
    'Casa | MAISON JF®':'Home | MAISON JF®',
    'A Porta Casa da MAISON JF® para quando queres voltar a sentir que chegaste a algum lado teu.':'The MAISON JF® Home Door for when you want to feel that you have arrived somewhere that is yours.',
    'Quero gostar de voltar.':'I want to enjoy coming back.',
    'Há dias em que o peso começa antes mesmo de pousares as chaves.':'Some days the weight begins before you have even put down the keys.',
    'Criar ambiente':'Create atmosphere',
    'A porta Casa':'The Home Door',
    'Um espaço pode não resolver a vida. Mas pode deixar de acrescentar peso.':'A space may not solve your life. But it can stop adding weight to it.',
    'Casa · O mundo para onde queres voltar':'Home · The world you want to return to',
    'Atmosfera':'Atmosphere',
    'Não é só cheiro. É a passagem entre lá fora e aqui dentro.':'It is not just scent. It is the passage between out there and in here.',
    'Às vezes, mudar a sensação de um espaço é o primeiro gesto que o resto de ti consegue acompanhar.':'Sometimes changing how a space feels is the first gesture the rest of you can follow.',
    'Nesta porta, juntei produtos, gestos e leituras para te ajudar a cuidar da atmosfera sem transformares a casa num cenário. É menos sobre decorar. Mais sobre reconhecer o lugar onde vives.':'In this door, I brought together products, gestures and readings to help you care for the atmosphere without turning your home into a set. It is less about decorating. More about recognising the place where you live.',
    'Ver produtos para Casa →':'See products for Home →',
    'Escolhe o que ajuda a casa a voltar a ser tua.':'Choose what helps home feel like yours again.',
    'Mudar o ambiente':'Change the atmosphere',
    'Luz. Aroma. Um espaço que muda de ritmo.':'Light. Scent. A space that changes rhythm.',
    'Oráculo':'Oracle',
    'Casa & Refúgio':'Home & Refuge',
    'Quando chegas a casa e ainda não sentes que chegaste.':'When you get home and still do not feel that you have arrived.',
    'Trabalhar o espaço':'Work with the space',
    'Rituais e pedidos especiais quando queres ir além do produto.':'Ritual and special requests when you want to go beyond the product.'
  },
  es:{
    'Casa | MAISON JF®':'Casa | MAISON JF®',
    'A Porta Casa da MAISON JF® para quando queres voltar a sentir que chegaste a algum lado teu.':'La Puerta Casa de MAISON JF® para cuando quieres volver a sentir que has llegado a un lugar tuyo.',
    'Quero gostar de voltar.':'Quiero disfrutar de volver.',
    'Há dias em que o peso começa antes mesmo de pousares as chaves.':'Hay días en los que el peso empieza antes incluso de dejar las llaves.',
    'Criar ambiente':'Crear ambiente',
    'A porta Casa':'La puerta Casa',
    'Um espaço pode não resolver a vida. Mas pode deixar de acrescentar peso.':'Un espacio puede no resolver la vida. Pero puede dejar de añadir peso.',
    'Casa · O mundo para onde queres voltar':'Casa · El mundo al que quieres volver',
    'Atmosfera':'Atmósfera',
    'Não é só cheiro. É a passagem entre lá fora e aqui dentro.':'No es solo aroma. Es el paso entre fuera y aquí dentro.',
    'Às vezes, mudar a sensação de um espaço é o primeiro gesto que o resto de ti consegue acompanhar.':'A veces, cambiar la sensación de un espacio es el primer gesto que el resto de ti puede acompañar.',
    'Nesta porta, juntei produtos, gestos e leituras para te ajudar a cuidar da atmosfera sem transformares a casa num cenário. É menos sobre decorar. Mais sobre reconhecer o lugar onde vives.':'En esta puerta reuní productos, gestos y lecturas para ayudarte a cuidar la atmósfera sin convertir tu casa en un decorado. Es menos sobre decorar. Más sobre reconocer el lugar donde vives.',
    'Ver produtos para Casa →':'Ver productos para Casa →',
    'Escolhe o que ajuda a casa a voltar a ser tua.':'Elige lo que ayuda a que la casa vuelva a ser tuya.',
    'Mudar o ambiente':'Cambiar el ambiente',
    'Luz. Aroma. Um espaço que muda de ritmo.':'Luz. Aroma. Un espacio que cambia de ritmo.',
    'Oráculo':'Oráculo',
    'Casa & Refúgio':'Casa & Refugio',
    'Quando chegas a casa e ainda não sentes que chegaste.':'Cuando llegas a casa y todavía no sientes que hayas llegado.',
    'Trabalhar o espaço':'Trabajar el espacio',
    'Rituais e pedidos especiais quando queres ir além do produto.':'Rituales y pedidos especiales cuando quieres ir más allá del producto.'
  }
};

const DOOR_CORPO={
  'pt-BR':{
    'A Porta Corpo da MAISON JF® para quando o corpo já está a pedir uma pausa antes de encontrares as palavras.':'A Porta Corpo da MAISON JF® para quando o corpo já está pedindo uma pausa antes de você encontrar as palavras.',
    'O corpo já percebeu.':'O corpo já percebeu.',
    'Há dias em que ele diz primeiro aquilo que ainda estás a tentar negociar.':'Há dias em que ele diz primeiro aquilo que você ainda está tentando negociar.',
    'Escolher o gesto':'Escolher o gesto',
    'A porta Corpo':'A porta Corpo',
    'Parar também é uma coisa que se faz com o corpo.':'Parar também é uma coisa que se faz com o corpo.',
    'Corpo · Toque':'Corpo · Toque',
    'Um gesto possível':'Um gesto possível',
    'Um gesto teu para o teu corpo.':'Um gesto seu para o seu corpo.',
    'Água morna, óleo, toque ou uma massagem feita por ti. O gesto pode ser simples. Desde que seja teu.':'Água morna, óleo, toque ou uma massagem feita por você. O gesto pode ser simples. Desde que seja seu.',
    'Nesta porta, juntei produtos e caminhos para quando precisas de abrandar, criar conforto ou voltar a reparar no que o corpo está a pedir. Sem promessas milagrosas. E sem tornar o cuidado mais complicado do que precisa de ser.':'Nesta porta, juntei produtos e caminhos para quando você precisa desacelerar, criar conforto ou voltar a reparar no que o corpo está pedindo. Sem promessas milagrosas. E sem tornar o cuidado mais complicado do que precisa ser.',
    'Ver produtos para Corpo →':'Ver produtos para Corpo →',
    'Escolhe o gesto que o corpo consegue receber agora.':'Escolha o gesto que o corpo consegue receber agora.',
    'Toque e pausa':'Toque e pausa',
    'Óleo, escalda-pés e um momento que é teu.':'Óleo, escalda-pés e um momento que é seu.',
    'Óleo de Massagem':'Óleo de Massagem',
    'Toque e pausa num ritual simples.':'Toque e pausa em um ritual simples.',
    'Energia & Cansaço':'Energia & Cansaço',
    'Quando o corpo fala antes de encontrares as palavras.':'Quando o corpo fala antes de você encontrar as palavras.',
    'Quando uma pausa não chega':'Quando uma pausa não basta',
    'Continuidade para aquilo que continua a voltar.':'Continuidade para aquilo que continua voltando.'
  },
  en:{
    'Corpo | MAISON JF®':'Body | MAISON JF®',
    'A Porta Corpo da MAISON JF® para quando o corpo já está a pedir uma pausa antes de encontrares as palavras.':'The MAISON JF® Body Door for when your body is already asking for a pause before you find the words.',
    'O corpo já percebeu.':'The body already knows.',
    'Há dias em que ele diz primeiro aquilo que ainda estás a tentar negociar.':'Some days it says first what you are still trying to negotiate.',
    'Escolher o gesto':'Choose the gesture',
    'A porta Corpo':'The Body Door',
    'Parar também é uma coisa que se faz com o corpo.':'Stopping is also something you do with the body.',
    'Corpo · Toque':'Body · Touch',
    'Um gesto possível':'A possible gesture',
    'Um gesto teu para o teu corpo.':'A gesture from you to your body.',
    'Água morna, óleo, toque ou uma massagem feita por ti. O gesto pode ser simples. Desde que seja teu.':'Warm water, oil, touch or a massage you give yourself. The gesture can be simple. As long as it is yours.',
    'Nesta porta, juntei produtos e caminhos para quando precisas de abrandar, criar conforto ou voltar a reparar no que o corpo está a pedir. Sem promessas milagrosas. E sem tornar o cuidado mais complicado do que precisa de ser.':'In this door, I brought together products and paths for when you need to slow down, create comfort or notice what your body is asking for again. No miracle promises. And no making care more complicated than it needs to be.',
    'Ver produtos para Corpo →':'See products for Body →',
    'Escolhe o gesto que o corpo consegue receber agora.':'Choose the gesture your body can receive right now.',
    'Toque e pausa':'Touch and pause',
    'Óleo, escalda-pés e um momento que é teu.':'Oil, foot soak and a moment that is yours.',
    'Óleo de Massagem':'Massage Oil',
    'Toque e pausa num ritual simples.':'Touch and pause in a simple ritual.',
    'Energia & Cansaço':'Energy & Tiredness',
    'Quando o corpo fala antes de encontrares as palavras.':'When the body speaks before you find the words.',
    'Quando uma pausa não chega':'When one pause is not enough',
    'Continuidade para aquilo que continua a voltar.':'Continuity for what keeps coming back.'
  },
  es:{
    'Corpo | MAISON JF®':'Cuerpo | MAISON JF®',
    'A Porta Corpo da MAISON JF® para quando o corpo já está a pedir uma pausa antes de encontrares as palavras.':'La Puerta Cuerpo de MAISON JF® para cuando el cuerpo ya está pidiendo una pausa antes de que encuentres las palabras.',
    'O corpo já percebeu.':'El cuerpo ya lo ha entendido.',
    'Há dias em que ele diz primeiro aquilo que ainda estás a tentar negociar.':'Hay días en los que dice primero aquello que todavía estás intentando negociar.',
    'Escolher o gesto':'Elegir el gesto',
    'A porta Corpo':'La puerta Cuerpo',
    'Parar também é uma coisa que se faz com o corpo.':'Parar también es algo que se hace con el cuerpo.',
    'Corpo · Toque':'Cuerpo · Tacto',
    'Um gesto possível':'Un gesto posible',
    'Um gesto teu para o teu corpo.':'Un gesto tuyo para tu cuerpo.',
    'Água morna, óleo, toque ou uma massagem feita por ti. O gesto pode ser simples. Desde que seja teu.':'Agua tibia, aceite, tacto o un masaje hecho por ti. El gesto puede ser sencillo. Siempre que sea tuyo.',
    'Nesta porta, juntei produtos e caminhos para quando precisas de abrandar, criar conforto ou voltar a reparar no que o corpo está a pedir. Sem promessas milagrosas. E sem tornar o cuidado mais complicado do que precisa de ser.':'En esta puerta reuní productos y caminos para cuando necesitas bajar el ritmo, crear confort o volver a reparar en lo que tu cuerpo está pidiendo. Sin promesas milagrosas. Y sin hacer el cuidado más complicado de lo necesario.',
    'Ver produtos para Corpo →':'Ver productos para Cuerpo →',
    'Escolhe o gesto que o corpo consegue receber agora.':'Elige el gesto que tu cuerpo puede recibir ahora.',
    'Toque e pausa':'Tacto y pausa',
    'Óleo, escalda-pés e um momento que é teu.':'Aceite, baño de pies y un momento que es tuyo.',
    'Óleo de Massagem':'Aceite de Masaje',
    'Toque e pausa num ritual simples.':'Tacto y pausa en un ritual sencillo.',
    'Energia & Cansaço':'Energía & Cansancio',
    'Quando o corpo fala antes de encontrares as palavras.':'Cuando el cuerpo habla antes de que encuentres las palabras.',
    'Quando uma pausa não chega':'Cuando una pausa no basta',
    'Continuidade para aquilo que continua a voltar.':'Continuidad para aquello que sigue volviendo.'
  }
};

const DOOR_CABECA={
  'pt-BR':{
    'Cabeça | MAISON JF®':'Mente | MAISON JF®',
    'A Porta Cabeça da MAISON JF® para quando continuar às voltas já não ajuda: perspectiva, perguntas e um próximo passo.':'A Porta Mente da MAISON JF® para quando continuar dando voltas já não ajuda: perspectiva, perguntas e um próximo passo.',
    'Preciso de ver isto melhor.':'Preciso ver isso melhor.',
    'Há perguntas que não precisam de mais ruído. Precisam de espaço.':'Há perguntas que não precisam de mais ruído. Precisam de espaço.',
    'VER CONSULTAS':'VER CONSULTAS',
    'A porta Cabeça':'A porta Mente',
    'Clareza não é alguém decidir por ti.':'Clareza não é alguém decidir por você.',
    'Cabeça · Perspectiva':'Mente · Perspectiva',
    'Queres perceber o padrão?':'Quer entender o padrão?',
    'Nem tudo precisa de mais pensamento. Às vezes precisa de outra forma de olhar.':'Nem tudo precisa de mais pensamento. Às vezes precisa de outra forma de olhar.',
    'Uma abertura simbólica. Outra forma de olhar.':'Uma abertura simbólica. Outra forma de olhar.',
    'Produtos digitais':'Produtos digitais',
    'Biblioteca':'Biblioteca',
    'Para ler e voltar quando precisares.':'Para ler e voltar quando precisar.',
    'Falar, escrever ou usar Tarot':'Falar, escrever ou usar Tarot',
    'Quando queres falar, escrever ou aprofundar.':'Quando você quer falar, escrever ou aprofundar.'
  },
  en:{
    'Cabeça | MAISON JF®':'Mind | MAISON JF®',
    'A Porta Cabeça da MAISON JF® para quando continuar às voltas já não ajuda: perspectiva, perguntas e um próximo passo.':'The MAISON JF® Mind Door for when going around in circles no longer helps: perspective, questions and a next step.',
    'Preciso de ver isto melhor.':'I need to see this more clearly.',
    'Há perguntas que não precisam de mais ruído. Precisam de espaço.':'Some questions do not need more noise. They need space.',
    'VER CONSULTAS':'VIEW CONSULTATIONS',
    'A porta Cabeça':'The Mind Door',
    'Clareza não é alguém decidir por ti.':'Clarity is not someone deciding for you.',
    'Cabeça · Perspectiva':'Mind · Perspective',
    'Queres perceber o padrão?':'Want to understand the pattern?',
    'Nem tudo precisa de mais pensamento. Às vezes precisa de outra forma de olhar.':'Not everything needs more thought. Sometimes it needs another way of looking.',
    'Uma abertura simbólica. Outra forma de olhar.':'A symbolic opening. Another way of looking.',
    'Produtos digitais':'Digital products',
    'Biblioteca':'Library',
    'Para ler e voltar quando precisares.':'To read and return to when you need it.',
    'Falar, escrever ou usar Tarot':'Talk, write or use Tarot',
    'Quando queres falar, escrever ou aprofundar.':'When you want to talk, write or go deeper.'
  },
  es:{
    'Cabeça | MAISON JF®':'Mente | MAISON JF®',
    'A Porta Cabeça da MAISON JF® para quando continuar às voltas já não ajuda: perspectiva, perguntas e um próximo passo.':'La Puerta Mente de MAISON JF® para cuando seguir dando vueltas ya no ayuda: perspectiva, preguntas y un siguiente paso.',
    'Preciso de ver isto melhor.':'Necesito ver esto con más claridad.',
    'Há perguntas que não precisam de mais ruído. Precisam de espaço.':'Hay preguntas que no necesitan más ruido. Necesitan espacio.',
    'VER CONSULTAS':'VER CONSULTAS',
    'A porta Cabeça':'La puerta Mente',
    'Clareza não é alguém decidir por ti.':'Claridad no es que alguien decida por ti.',
    'Cabeça · Perspectiva':'Mente · Perspectiva',
    'Queres perceber o padrão?':'¿Quieres entender el patrón?',
    'Nem tudo precisa de mais pensamento. Às vezes precisa de outra forma de olhar.':'No todo necesita más pensamiento. A veces necesita otra forma de mirar.',
    'Uma abertura simbólica. Outra forma de olhar.':'Una apertura simbólica. Otra forma de mirar.',
    'Produtos digitais':'Productos digitales',
    'Biblioteca':'Biblioteca',
    'Para ler e voltar quando precisares.':'Para leer y volver cuando lo necesites.',
    'Falar, escrever ou usar Tarot':'Hablar, escribir o usar Tarot',
    'Quando queres falar, escrever ou aprofundar.':'Cuando quieres hablar, escribir o profundizar.'
  }
};

const DOOR_PRESENCA={
  'pt-BR':{
    'Presença MAISON JF® online, presencial ou em SOS por 1 dia ou 1 semana. Escolhe o formato e confirma disponibilidade.':'Presença MAISON JF® online, presencial ou em SOS por 1 dia ou 1 semana. Escolha o formato e confirme disponibilidade.',
    'Quando não queres atravessar isto sozinho.':'Quando você não quer atravessar isso sozinho.',
    'Há momentos em que só faz diferença não estares sozinho.':'Há momentos em que a diferença é simplesmente não estar sozinho.',
    'ESCOLHER PRESENÇA':'ESCOLHER PRESENÇA',
    'Como queres que eu esteja?':'Como você quer que eu esteja?',
    'À distância. Presencial. Ou por perto enquanto isto ainda está a acontecer.':'À distância. Presencial. Ou por perto enquanto isso ainda está acontecendo.',
    'À distância':'À distância',
    'Presença Online':'Presença Online',
    'Uma hora de conversa. Voz ou vídeo. Só presença.':'Uma hora de conversa. Voz ou vídeo. Só presença.',
    'Presencial':'Presencial',
    'Presença Social':'Presença Social',
    'Café. Jantar. Cinema. Passeio. Um plano que não queres fazer sozinho.':'Café. Jantar. Cinema. Passeio. Um plano que você não quer fazer sozinho.',
    'Presença Próxima':'Presença Próxima',
    'Mais proximidade. Mais calor humano. Sempre dentro do que combinámos.':'Mais proximidade. Mais calor humano. Sempre dentro do que combinamos.',
    'Ainda não acabou.':'Ainda não acabou.',
    'A situação continua a mexer. Eu continuo por perto.':'A situação continua mexendo. Eu continuo por perto.',
    '1 dia':'1 dia',
    'Um dia. Uma situação. Até três atualizações.':'Um dia. Uma situação. Até três atualizações.',
    '1 semana':'1 semana',
    'Sete dias. A mesma situação. Um ponto de contacto por dia.':'Sete dias. A mesma situação. Um ponto de contato por dia.',
    'Antes de marcar':'Antes de marcar',
    'Primeiro combinamos.':'Primeiro combinamos.',
    'Confirmamos disponibilidade.':'Confirmamos disponibilidade.',
    'Combinamos tempo, lugar e limites.':'Combinamos tempo, lugar e limites.',
    'Só então pagas.':'Só então você paga.',
    'Ver condições':'Ver condições',
    'FALAR SOBRE PRESENÇA':'FALAR SOBRE PRESENÇA',
    'FALA COMIGO →':'FALA COMIGO →',
    'Presença é para adultos. Não é um serviço sexual, psicoterapia, tratamento clínico, linha de crise ou serviço de emergência. E o SOS não funciona como apoio 24 horas.':'Presença é para adultos. Não é um serviço sexual, psicoterapia, tratamento clínico, linha de crise ou serviço de emergência. E o SOS não funciona como apoio 24 horas.',
    'Presença Online. 60 minutos por voz ou vídeo. Valor: 35 €. Data e hora são confirmadas antes. Não é consulta nem Escuta Orientada.':'Presença Online. 60 minutos por voz ou vídeo. Valor: 35 €. Data e hora são confirmadas antes. Não é consulta nem Escuta Orientada.',
    'Presença Social e Presença Próxima. Mínimo de 2 horas. Valor: 80 € · 2 horas. Hora adicional 40 €. O plano, o local, as despesas e deslocações extraordinárias são combinados antes. Intimidade não faz parte do serviço e os limites combinados não mudam.':'Presença Social e Presença Próxima. Mínimo de 2 horas. Valor: 80 € · 2 horas. Hora adicional 40 €. O plano, o local, as despesas e deslocações extraordinárias são combinados antes. Intimidade não faz parte do serviço e os limites combinados não mudam.',
    'SOS 1 dia. Valor: 60 €. Janela acordada de até 8 horas para uma situação concreta. Até três atualizações por texto ou áudio. As respostas são assíncronas e não existe promessa de resposta imediata.':'SOS 1 dia. Valor: 60 €. Janela acordada de até 8 horas para uma situação concreta. Até três atualizações por texto ou áudio. As respostas são assíncronas e não existe promessa de resposta imediata.',
    'SOS 1 semana. Valor: 120 €. Sete dias para a mesma situação. Uma atualização por dia e uma resposta consolidada até 24 horas depois, dentro das condições combinadas. Atualizações não utilizadas não acumulam.':'SOS 1 semana. Valor: 120 €. Sete dias para a mesma situação. Uma atualização por dia e uma resposta consolidada até 24 horas depois, dentro das condições combinadas. Atualizações não utilizadas não acumulam.',
    'Presença é para adultos. Não é um serviço sexual, psicoterapia, tratamento clínico, linha de crise ou serviço de emergência. O SOS não funciona como apoio 24 horas.':'Presença é para adultos. Não é um serviço sexual, psicoterapia, tratamento clínico, linha de crise ou serviço de emergência. O SOS não funciona como apoio 24 horas.'
  },
  en:{
    'Presença | MAISON JF®':'Presence | MAISON JF®',
    'Presença MAISON JF® online, presencial ou em SOS por 1 dia ou 1 semana. Escolhe o formato e confirma disponibilidade.':'MAISON JF® Presence online, in person or by SOS for 1 day or 1 week. Choose the format and confirm availability.',
    'Quando não queres atravessar isto sozinho.':"When you don't want to go through this alone.",
    'Há momentos em que só faz diferença não estares sozinho.':'Sometimes the difference is simply not being alone.',
    'ESCOLHER PRESENÇA':'CHOOSE PRESENCE',
    'Como queres que eu esteja?':'How do you want me to be there?',
    'À distância. Presencial. Ou por perto enquanto isto ainda está a acontecer.':'At a distance. In person. Or nearby while this is still happening.',
    'À distância':'At a distance',
    'Presença Online':'Online Presence',
    'Uma hora de conversa. Voz ou vídeo. Só presença.':'One hour of conversation. Voice or video. Just presence.',
    'Presencial':'In person',
    'Presença Social':'Social Presence',
    'Café. Jantar. Cinema. Passeio. Um plano que não queres fazer sozinho.':"Coffee. Dinner. Cinema. A walk. A plan you don't want to do alone.",
    'Presença Próxima':'Close Presence',
    'Mais proximidade. Mais calor humano. Sempre dentro do que combinámos.':'More closeness. More human warmth. Always within what we agreed.',
    'Ainda não acabou.':'It is not over yet.',
    'A situação continua a mexer. Eu continuo por perto.':'The situation is still moving. I stay nearby.',
    '1 dia':'1 day',
    'SOS 1 dia':'SOS 1 day',
    'Um dia. Uma situação. Até três atualizações.':'One day. One situation. Up to three updates.',
    '1 semana':'1 week',
    'SOS 1 semana':'SOS 1 week',
    'Sete dias. A mesma situação. Um ponto de contacto por dia.':'Seven days. The same situation. One point of contact per day.',
    'Antes de marcar':'Before booking',
    'Primeiro combinamos.':'We agree first.',
    'Confirmamos disponibilidade.':'We confirm availability.',
    'Combinamos tempo, lugar e limites.':'We agree the time, place and boundaries.',
    'Só então pagas.':'Only then do you pay.',
    'Ver condições':'View terms',
    'FALAR SOBRE PRESENÇA':'TALK ABOUT PRESENCE',
    'FALA COMIGO →':'TALK TO ME →',
    'Presença é para adultos. Não é um serviço sexual, psicoterapia, tratamento clínico, linha de crise ou serviço de emergência. E o SOS não funciona como apoio 24 horas.':'Presence is for adults. It is not a sexual service, psychotherapy, clinical treatment, crisis line or emergency service. And SOS is not 24-hour support.',
    'Presença Online. 60 minutos por voz ou vídeo. Valor: 35 €. Data e hora são confirmadas antes. Não é consulta nem Escuta Orientada.':'Online Presence. 60 minutes by voice or video. Price: €35. Date and time are confirmed beforehand. It is not a consultation or Guided Listening.',
    'Presença Social e Presença Próxima. Mínimo de 2 horas. Valor: 80 € · 2 horas. Hora adicional 40 €. O plano, o local, as despesas e deslocações extraordinárias são combinados antes. Intimidade não faz parte do serviço e os limites combinados não mudam.':'Social Presence and Close Presence. Minimum 2 hours. Price: €80 · 2 hours. Additional hour €40. The plan, location, expenses and extraordinary travel are agreed beforehand. Intimacy is not part of the service and agreed boundaries do not change.',
    'SOS 1 dia. Valor: 60 €. Janela acordada de até 8 horas para uma situação concreta. Até três atualizações por texto ou áudio. As respostas são assíncronas e não existe promessa de resposta imediata.':'SOS 1 day. Price: €60. An agreed window of up to 8 hours for one specific situation. Up to three text or audio updates. Replies are asynchronous and there is no promise of an immediate response.',
    'SOS 1 semana. Valor: 120 €. Sete dias para a mesma situação. Uma atualização por dia e uma resposta consolidada até 24 horas depois, dentro das condições combinadas. Atualizações não utilizadas não acumulam.':'SOS 1 week. Price: €120. Seven days for the same situation. One update per day and one consolidated reply within 24 hours, within the agreed conditions. Unused updates do not roll over.',
    'Presença é para adultos. Não é um serviço sexual, psicoterapia, tratamento clínico, linha de crise ou serviço de emergência. O SOS não funciona como apoio 24 horas.':'Presence is for adults. It is not a sexual service, psychotherapy, clinical treatment, crisis line or emergency service. SOS is not 24-hour support.'
  },
  es:{
    'Presença | MAISON JF®':'Presencia | MAISON JF®',
    'Presença MAISON JF® online, presencial ou em SOS por 1 dia ou 1 semana. Escolhe o formato e confirma disponibilidade.':'Presencia MAISON JF® online, presencial o en SOS por 1 día o 1 semana. Elige el formato y confirma disponibilidad.',
    'Quando não queres atravessar isto sozinho.':'Cuando no quieres atravesar esto solo.',
    'Há momentos em que só faz diferença não estares sozinho.':'Hay momentos en los que la diferencia es simplemente no estar solo.',
    'ESCOLHER PRESENÇA':'ELEGIR PRESENCIA',
    'Como queres que eu esteja?':'¿Cómo quieres que esté?',
    'À distância. Presencial. Ou por perto enquanto isto ainda está a acontecer.':'A distancia. Presencial. O cerca mientras esto todavía está ocurriendo.',
    'À distância':'A distancia',
    'Presença Online':'Presencia Online',
    'Uma hora de conversa. Voz ou vídeo. Só presença.':'Una hora de conversación. Voz o vídeo. Solo presencia.',
    'Presencial':'Presencial',
    'Presença Social':'Presencia Social',
    'Café. Jantar. Cinema. Passeio. Um plano que não queres fazer sozinho.':'Café. Cena. Cine. Paseo. Un plan que no quieres hacer solo.',
    'Presença Próxima':'Presencia Cercana',
    'Mais proximidade. Mais calor humano. Sempre dentro do que combinámos.':'Más cercanía. Más calor humano. Siempre dentro de lo acordado.',
    'Ainda não acabou.':'Todavía no ha terminado.',
    'A situação continua a mexer. Eu continuo por perto.':'La situación sigue moviéndose. Yo sigo cerca.',
    '1 dia':'1 día',
    'SOS 1 dia':'SOS 1 día',
    'Um dia. Uma situação. Até três atualizações.':'Un día. Una situación. Hasta tres actualizaciones.',
    '1 semana':'1 semana',
    'SOS 1 semana':'SOS 1 semana',
    'Sete dias. A mesma situação. Um ponto de contacto por dia.':'Siete días. La misma situación. Un punto de contacto al día.',
    'Antes de marcar':'Antes de reservar',
    'Primeiro combinamos.':'Primero lo acordamos.',
    'Confirmamos disponibilidade.':'Confirmamos disponibilidad.',
    'Combinamos tempo, lugar e limites.':'Acordamos tiempo, lugar y límites.',
    'Só então pagas.':'Solo entonces pagas.',
    'Ver condições':'Ver condiciones',
    'FALAR SOBRE PRESENÇA':'HABLAR SOBRE PRESENCIA',
    'FALA COMIGO →':'HABLA CONMIGO →',
    'Presença é para adultos. Não é um serviço sexual, psicoterapia, tratamento clínico, linha de crise ou serviço de emergência. E o SOS não funciona como apoio 24 horas.':'Presencia es para adultos. No es un servicio sexual, psicoterapia, tratamiento clínico, línea de crisis ni servicio de emergencia. Y el SOS no funciona como apoyo 24 horas.',
    'Presença Online. 60 minutos por voz ou vídeo. Valor: 35 €. Data e hora são confirmadas antes. Não é consulta nem Escuta Orientada.':'Presencia Online. 60 minutos por voz o vídeo. Precio: 35 €. La fecha y la hora se confirman antes. No es una consulta ni Escucha Orientada.',
    'Presença Social e Presença Próxima. Mínimo de 2 horas. Valor: 80 € · 2 horas. Hora adicional 40 €. O plano, o local, as despesas e deslocações extraordinárias são combinados antes. Intimidade não faz parte do serviço e os limites combinados não mudam.':'Presencia Social y Presencia Cercana. Mínimo de 2 horas. Precio: 80 € · 2 horas. Hora adicional 40 €. El plan, el lugar, los gastos y desplazamientos extraordinarios se acuerdan antes. La intimidad no forma parte del servicio y los límites acordados no cambian.',
    'SOS 1 dia. Valor: 60 €. Janela acordada de até 8 horas para uma situação concreta. Até três atualizações por texto ou áudio. As respostas são assíncronas e não existe promessa de resposta imediata.':'SOS 1 día. Precio: 60 €. Ventana acordada de hasta 8 horas para una situación concreta. Hasta tres actualizaciones por texto o audio. Las respuestas son asíncronas y no se promete una respuesta inmediata.',
    'SOS 1 semana. Valor: 120 €. Sete dias para a mesma situação. Uma atualização por dia e uma resposta consolidada até 24 horas depois, dentro das condições combinadas. Atualizações não utilizadas não acumulam.':'SOS 1 semana. Precio: 120 €. Siete días para la misma situación. Una actualización al día y una respuesta consolidada hasta 24 horas después, dentro de las condiciones acordadas. Las actualizaciones no utilizadas no se acumulan.',
    'Presença é para adultos. Não é um serviço sexual, psicoterapia, tratamento clínico, linha de crise ou serviço de emergência. O SOS não funciona como apoio 24 horas.':'Presencia es para adultos. No es un servicio sexual, psicoterapia, tratamiento clínico, línea de crisis ni servicio de emergencia. El SOS no funciona como apoyo 24 horas.'
  }
};


const ORACLE_TERRITORY_SLUGS=new Set(ORACLE_TERRITORIES.map(item=>String(item.slug)));

function oracleIndexTranslationMap(locale){
  if(locale==='pt-PT')return {};
  const source=ORACLE_PUBLIC_COPY['pt-PT'];
  const target=ORACLE_PUBLIC_COPY[locale]||source;
  const ui=Object.fromEntries(
    Object.keys(source).map(key=>[String(source[key]),String(target[key]??source[key])])
  );
  return {...oracleLocaleTermMap(locale),...ui};
}

export function isLocalizedOracleTerritoryPath(sourcePath){
  const path=normalizePublicSitePath(sourcePath);
  const match=path.match(/^\/oraculo\/([^/]+)$/);
  return Boolean(match&&ORACLE_TERRITORY_SLUGS.has(match[1]));
}

const PAGE_MAP={
  '/':HOME,
  '/farol':FAROL,
  '/farol/':FAROL,
  '/teste/':TESTE,
  '/produtos/':PRODUCTS,
  '/servicos/':SERVICES,
  '/ebooks/':EBOOKS,
  '/para-de-ignorar/':PDI,
  '/oraculo/':{},
  '/portas/casa':DOOR_CASA,
  '/portas/corpo':DOOR_CORPO,
  '/portas/cabeca':DOOR_CABECA,
  '/portas/companhia':DOOR_PRESENCA
};

export function hasLocalizedSiteCoverage(sourcePath){
  const path=normalizePublicSitePath(sourcePath);
  return Object.prototype.hasOwnProperty.call(PAGE_MAP,path)||isLocalizedOracleTerritoryPath(path);
}

function escapeAmp(value){
  return String(value).replace(/&(?![A-Za-z0-9#]+;)/g,'&amp;');
}

function applyMap(value,map){
  let out=String(value);
  const entries=Object.entries(map||{}).sort((a,b)=>b[0].length-a[0].length);
  for(const [source,target] of entries){
    out=out.split(source).join(target);
    const sourceEscaped=escapeAmp(source);
    if(sourceEscaped!==source){
      out=out.split(sourceEscaped).join(escapeAmp(target));
    }
  }
  return out;
}

export function translationMapFor(locale,sourcePath){
  if(locale==='pt-PT')return {};
  const path=normalizePublicSitePath(sourcePath);
  const oracleMap=path==='/oraculo/'||isLocalizedOracleTerritoryPath(path)
    ? oracleIndexTranslationMap(locale)
    : {};
  return {
    ...(COMMON[locale]||{}),
    ...oracleMap,
    ...((PAGE_MAP[path]||{})[locale]||{})
  };
}

function mapJsonValue(value,map){
  if(typeof value==='string')return applyMap(value,map);
  if(Array.isArray(value))return value.map(item=>mapJsonValue(item,map));
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,mapJsonValue(item,map)]));
  }
  return value;
}

function localizeJsonLdBlocks(html,map){
  return String(html).replace(
    /<script\b([^>]*\btype=(["'])application\/ld\+json\2[^>]*)>([\s\S]*?)<\/script>/gi,
    (full,attrs,_quote,body)=>{
      try{
        const parsed=JSON.parse(body);
        const localized=mapJsonValue(parsed,map);
        return '<script'+attrs+'>'+JSON.stringify(localized)+'</script>';
      }catch(_){
        return full;
      }
    }
  );
}

export function translateMaisonHtml(html,locale,sourcePath){
  if(locale==='pt-PT')return String(html);
  const map=translationMapFor(locale,sourcePath);
  let source=localizeJsonLdBlocks(String(html),map);
  const protectedBlocks=[];
  source=source.replace(
    /<(script|style|noscript|code|pre|textarea)\b[\s\S]*?<\/\1>/gi,
    block=>{
      const marker='__MAISON_I18N_PROTECTED_'+protectedBlocks.length+'__';
      protectedBlocks.push(block);
      return marker;
    }
  );
  source=applyMap(source,map);
  protectedBlocks.forEach((block,index)=>{
    source=source.replace('__MAISON_I18N_PROTECTED_'+index+'__',block);
  });
  return source;
}

export function localeSwitcherHtml(sourcePath,currentLocale){
  const links=Object.entries(MAISON_SITE_LOCALES).map(([locale,config])=>{
    const current=locale===currentLocale?' aria-current="page"':'';
    const href=localizedPath(sourcePath,locale);
    return '<a href="'+href+'" hreflang="'+locale+'" lang="'+config.htmlLang+'"'+current+'>'+config.label+'</a>';
  }).join('');
  return '<nav class="maison-language-switcher" aria-label="Language">'+links+'</nav>';
}

export const MAISON_LANGUAGE_SWITCHER_CSS=`
.maison-language-switcher{position:fixed;z-index:2147483000;top:18px;right:18px;display:flex;gap:2px;padding:3px;border:1px solid rgba(199,170,115,.26);background:rgba(7,7,7,.76);backdrop-filter:blur(14px);border-radius:999px}
.maison-language-switcher a{display:grid;place-items:center;min-width:31px;height:27px;padding:0 7px;border-radius:999px;color:rgba(245,241,233,.68);font:600 9px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;text-decoration:none}
.maison-language-switcher a:hover,.maison-language-switcher a:focus-visible,.maison-language-switcher a[aria-current="page"]{background:rgba(199,170,115,.16);color:#f5f1e9;outline:none}
@media(max-width:700px){.maison-language-switcher{top:12px;right:12px}.maison-language-switcher a{min-width:29px;height:25px;padding:0 6px}}
`;
