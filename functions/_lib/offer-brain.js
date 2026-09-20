export const MAISON_OFFER_BRAIN={
  version:'2026-09-16-v2',
  freeOnly:'/teste/',
  maxOffers:3,
  principles:{
    primary:'Mostra primeiro a opção que corresponde à necessidade e formato escolhidos.',
    lowerBarrier:'Quando a recomendação principal custa mais de 2 €, pode existir uma entrada Oráculo de 2 € no mesmo território.',
    deeper:'A terceira opção, quando existe, aprofunda; não duplica a recomendação principal.',
    noDarkPatterns:'Não inventar urgência, escassez, diagnóstico, medo ou promessa de resultado para provocar compra.'
  },
  ladders:{
    clarity:['Oráculo · 2 €','Uma pergunta · Tarot · 17 €','Por escrito · 25–45 €','Uma consulta · Tarot · 35 €','Escuta · 60 €','Aprofundar · Tarot · 70 €','Continuidade'],
    body:['Escalda-Pés · 5 €','Óleo de Massagem · 12 €','Serviços'],
    home:['Névoa · 7 €','Vela Aromática · 8 €','Vela Aromática · 14 €'],
    company:['Oráculo · 2 €','Companhia','Escuta / Continuidade'],
    gifts:['Escalda-Pés · 5 €','Névoa · 7 €','Vela · 8–14 €']
  },
  dimensions:['origin','domain','pain','pattern','duration','need','blocker','format','confession','giftIntent'],
  originRules:[
    {prefix:'relacoes/',territory:'amor',destination:'/oraculo/amor.html'},
    {prefix:'decisoes/',territory:'escolhas',destination:'/oraculo/escolhas.html'},
    {prefix:'cabeca/',territory:'padroes',destination:'/oraculo/padroes.html'},
    {prefix:'trabalho/',territory:'trabalho',destination:'/oraculo/trabalho.html'},
    {prefix:'casa/',destination:'/produtos/'},
    {prefix:'corpo/',destination:'/produtos/'},
    {prefix:'companhia/',destination:'/portas/companhia.html'},
    {prefix:'tarot/',destination:'/servicos/#consultas'},
    {prefix:'espiritualidade/',destination:'/oraculo/'},
    {prefix:'presentes/',destination:'/produtos/'},
    {prefix:'profissionais/',destination:'/profissionais/'}
  ]
};
export function routeMaisonOffer(signal={}){
  const {origin='',domain='',format='',duration='',territory=''}=signal;
  const byOrigin=MAISON_OFFER_BRAIN.originRules.find(r=>origin.startsWith(r.prefix));
  if(byOrigin&&domain==='')return byOrigin;
  if(domain==='casa')return {destination:'/produtos/',ladder:'home'};
  if(domain==='corpo')return {destination:'/produtos/',ladder:'body'};
  if(domain==='companhia')return {destination:'/portas/companhia.html',ladder:'company'};
  if(format==='pequeno')return {destination:'/oraculo/'+(territory||'')+'.html',ladder:'clarity'};
  if(format==='concreto')return {destination:'/contacto/?interesse=tarot-expresso',ladder:'clarity'};
  if(format==='falar')return {destination:'/contacto/?interesse=escuta',ladder:'clarity'};
  if(format==='profundo'||duration==='recorrente')return {destination:'/contacto/?interesse=tarot',ladder:'clarity'};
  return {destination:'/oraculo/'+(territory||'')+'.html',ladder:'clarity'};
}
