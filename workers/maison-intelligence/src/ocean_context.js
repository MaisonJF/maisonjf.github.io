const RULES=Object.freeze([
  {oceanKey:'adiar-o-sono-para-recuperar-autonomia',commercial:72,terms:['revenge bedtime','bedtime procrastination','stay up late','staying up late','me time at night','sleep procrastination','night autonomy','tempo próprio','adiar o sono']},
  {oceanKey:'ansiedade-antecipatoria-na-transicao-domingo-semana',commercial:58,terms:['sunday scaries','monday anxiety','weekend anxiety','sunday anxiety','anticipating monday','domingo à noite','segunda-feira']},
  {oceanKey:'atencao-fragmentada-por-interrupcoes-digitais',commercial:62,terms:['notification overload','notifications','context switching','digital interruption','attention fragmentation','distraction','interrupções digitais','perder o fio']},
  {oceanKey:'auto-silenciamento-para-preservar-o-vinculo',commercial:62,terms:['people pleasing','self silencing','silent to keep peace','afraid to speak','fear of conflict','calar para manter a paz','necessidades não ditas']},
  {oceanKey:'autonomia-condicionada-pelo-medo-da-reaccao',commercial:60,terms:['silent treatment','emotional control','fear of reaction','coercive control','emotional punishment','medo da reacção','liberdade com preço']},
  {oceanKey:'carga-mental-invisivel-da-casa',commercial:66,terms:['mental load','household load','invisible labor','invisible work','domestic labor','carga mental','tarefas invisíveis']},
  {oceanKey:'cuidar-sem-desaparecer-no-papel-de-cuidador',commercial:60,terms:['caregiver burden','caregiver stress','caregiver identity','family caregiver','caregiving','cuidador','cuidar sem desaparecer']},
  {oceanKey:'culpa-ao-descansar-como-se-o-descanso-tivesse-de-ser-merecido',commercial:66,terms:['rest guilt','guilty for resting','productivity guilt','guilt when resting','descanso merecido','culpa ao descansar']},
  {oceanKey:'doomscrolling-para-tentar-reduzir-incerteza',commercial:60,terms:['doomscrolling','doom scrolling','news anxiety','negative news cycle','compulsive news','más notícias','não consigo parar de ver']},
  {oceanKey:'evitamento-financeiro-sob-escassez',commercial:68,terms:['financial avoidance','money avoidance','debt avoidance','bill avoidance','financial stress','scarcity mindset','evitamento financeiro','dinheiro aperta']},
  {oceanKey:'ficar-em-suspenso-enquanto-se-espera-uma-resposta-importante',commercial:58,terms:['waiting for a response','waiting for results','job application wait','waiting anxiety','life on hold','vida em suspenso','esperar por uma resposta']},
  {oceanKey:'luto-por-um-futuro-que-deixou-de-ser-possivel',commercial:55,terms:['grief for future','unlived life','future that will not happen','fertility grief','life regret','luto por uma vida','futuro que deixou']},
  {oceanKey:'micro-luxo-como-recompensa-e-ritual',commercial:82,terms:['little treat','small luxury','micro luxury','affordable luxury','reward ritual','treat yourself','pequeno luxo','pequena vitória']},
  {oceanKey:'perda-ambigua-sem-fecho-claro',commercial:52,terms:['ambiguous loss','no closure','unresolved loss','missing without closure','perda ambígua','perda sem resolução']},
  {oceanKey:'precisar-de-solidao-para-recuperar-energia-social',commercial:58,terms:['social battery','need solitude','social exhaustion','alone to recharge','introvert recharge','energia social','precisar de ficar sozinho']},
  {oceanKey:'presenca-que-ampara-sem-tentar-resolver',commercial:78,terms:['just listen','need someone there','emotional support','presence not advice','listen without fixing','presença vs solução','ouvir sem corrigir']},
  {oceanKey:'pressao-social-para-gastar-e-vergonha-de-dizer-nao',commercial:72,terms:['social spending pressure','loud budgeting','peer spending','budget shame','financial peer pressure','gastar para não ficar de fora','não cabe no orçamento']},
  {oceanKey:'quando-o-que-funciona-na-relacao-se-torna-invisivel',commercial:58,terms:['relationship appreciation','taken for granted','gratitude relationship','unnoticed care','feel unappreciated','gestos de cuidado','nunca conta']},
  {oceanKey:'rituais-sensoriais-com-plantas-como-marcadores-de-transicao',commercial:86,terms:['sensory ritual','aromatherapy ritual','home ritual','transition ritual','scent ritual','aroma','ritual sensorial','marcar a transição']},
  {oceanKey:'sobrecarga-de-escolha-quando-mais-opcoes-paralisam',commercial:64,terms:['choice overload','decision paralysis','too many options','paradox of choice','analysis paralysis','demasiadas opções','medo de escolher mal']},
  {oceanKey:'solidao-com-contacto-sem-conexao-de-qualidade',commercial:64,terms:['lonely around people','social loneliness','lack of connection','quality connection','emotional loneliness','companhia sem conexão','sentir-se visto']},
  {oceanKey:'telepressao-e-disponibilidade-permanente',commercial:62,terms:['telepressure','always available','reply pressure','response pressure','always online','message anxiety','tenho de responder já','culpa por estar offline']},
  {oceanKey:'descoberta-organica-e-reconhecimento-da-maison',commercial:90,terms:['search visibility','organic discovery','organic traffic','search console','seo','brand discovery','ai search','discoverability','descoberta orgânica','tráfego qualificado']},
  {oceanKey:'atelier-principios-transferiveis-e-dna-maison',commercial:76,terms:['brand strategy','luxury branding','attention mechanism','cultural marketing','creative strategy','design system','brand memory','construção de marcas','princípios transferíveis']}
]);

function normalize(value){
  return String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function termScore(text,term){
  const n=normalize(term);
  if(!n)return 0;
  if(!text.includes(n))return 0;
  return n.includes(' ')?3:1;
}
export function routeOceanContext({text='',territoryKey='',providerId='',citations=[]}={}){
  const haystack=normalize([territoryKey,providerId,text].join(' '));
  if(!haystack)return null;
  let best=null;
  for(const rule of RULES){
    const matched=[];
    let score=0;
    for(const term of rule.terms){
      const points=termScore(haystack,term);
      if(points){score+=points;matched.push(term);}
    }
    if(!best||score>best.score)best={rule,score,matched};
  }
  if(!best||best.score<3)return null;
  const roots=[...new Set((citations||[]).map(x=>String(x).trim()).filter(Boolean))];
  const relevance=Math.max(55,Math.min(96,52+best.score*6+Math.min(roots.length,3)*3));
  return {
    oceanKey:best.rule.oceanKey,
    canonicalOceanId:best.rule.oceanKey,
    kind:'enrichment',
    relevanceScore:relevance,
    commercialScore:best.rule.commercial,
    matchedTerms:best.matched.slice(0,8),
    evidenceRoots:roots,
    sourceTerritory:String(territoryKey||''),
    providerId:String(providerId||'')
  };
}

export const OCEAN_CONTEXT_RULE_COUNT=RULES.length;
