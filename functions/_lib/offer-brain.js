export const MAISON_OFFER_BRAIN={
  version:'2026-09-16',
  freeOnly:'/teste/',
  entryPaid:{oracle:'/oraculo/',services:'/servicos/',products:'/produtos/',ebooks:'/ebooks/',company:'/portas/companhia.html'},
  originRules:[
    {prefix:'relacoes/',destination:'/oraculo/amor.html',label:'Oráculo · Amor & Relações · 2 €'},
    {prefix:'decisoes/',destination:'/oraculo/escolhas.html',label:'Oráculo · Escolhas & Mudança · 2 €'},
    {prefix:'cabeca/',destination:'/oraculo/padroes.html',label:'Oráculo · Eu & Padrões · 2 €'},
    {prefix:'trabalho/',destination:'/oraculo/trabalho.html',label:'Oráculo · Trabalho & Caminho · 2 €'},
    {prefix:'tarot/',destination:'/servicos/#consultas',label:'Consultas MAISON JF®'},
    {prefix:'espiritualidade/',destination:'/oraculo/',label:'Escolher território do Oráculo · 2 €'},
    {prefix:'casa/',destination:'/produtos/',label:'Produtos · Casa'},
    {prefix:'corpo/',destination:'/produtos/',label:'Produtos · Corpo'},
    {prefix:'companhia/',destination:'/portas/companhia.html',label:'Companhia'},
    {prefix:'presentes/',destination:'/produtos/',label:'Produtos MAISON JF®'},
    {prefix:'profissionais/',destination:'/profissionais/',label:'Espaço Profissional'}
  ]
};
export function routeMaisonOffer({origin='',door='',depth=''}={}){
  const byOrigin=MAISON_OFFER_BRAIN.originRules.find(r=>origin.startsWith(r.prefix));
  if(byOrigin)return byOrigin;
  if(depth==='oraculo')return {destination:'/oraculo/',label:'Oráculo · 2 €'};
  if(depth==='servico')return {destination:'/servicos/',label:'Serviços MAISON JF®'};
  if(door==='casa'||door==='corpo'||depth==='produto')return {destination:'/produtos/',label:'Produtos MAISON JF®'};
  if(door==='companhia')return {destination:'/portas/companhia.html',label:'Companhia'};
  return {destination:'/oraculo/',label:'Oráculo · 2 €'};
}
