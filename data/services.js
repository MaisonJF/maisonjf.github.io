/* MAISON SERVICE CATALOGUE
   Service catalogue used by MAISON systems. Some formats are intentionally non-public and may be offered only after human conversation.
*/
window.MAISON_SERVICES=[
{slug:'tarot',kind:'consulta',group:'tarot',door:'Tarot',name:'Consulta de Tarot',price:'35 €',amount:3500,description:'Uma consulta para olhar para a tua pergunta com contexto e sem ruído.',limits:'Não decide por ti nem transforma possibilidades em certezas.',media:[],cta:'Quero olhar para isto',next:{slug:'acompanhamento',label:'Se uma consulta não chegar, continuar em Acompanhamento'}},
{slug:'consulta-escrita-breve',public:false,kind:'consulta',group:'escrito',door:'Por escrito',name:'Breve',price:'25 €',amount:2500,description:'Quando queres uma resposta que fique contigo.',limits:'O formato é escrito e mantém os mesmos limites de uma consulta de orientação.',media:[],cta:'Quero por escrito'},
{slug:'consulta-escrita-aprofundada',public:false,kind:'consulta',group:'escrito',door:'Por escrito',name:'Aprofundada',price:'45 €',amount:4500,description:'Quando precisas de reler até as peças começarem a assentar.',limits:'O formato é escrito e não substitui cuidados clínicos quando são necessários.',media:[],cta:'Quero aprofundar por escrito'},
{slug:'escuta',public:false,kind:'consulta',group:'sem-tarot',door:'Sem Tarot',name:'Escuta Orientada',price:'60 €',amount:6000,description:'Quando tens demasiado dentro da cabeça. Dizes tudo. Pomos ordem.',limits:'É um serviço de escuta e organização da situação. Não é psicoterapia nem tratamento clínico.',media:[],cta:'Quero falar'},

{slug:'acompanhamento',kind:'continuidade',door:'Continuidade',name:'Acompanhamento',price:'170 € · 4 semanas',description:'Quando não queres voltar ao zero cada vez que alguma coisa muda.',limits:'Inclui 2 encontros de 60 minutos e até 1 check-in curto por semana. Não é chat permanente, psicoterapia, tratamento clínico ou apoio de emergência. Datas, canal e janelas de resposta ficam definidos antes.',media:[],cta:'Quero perceber se faz sentido',entry:['produto','resposta','consulta','companhia']},
{slug:'mentoria',kind:'continuidade',door:'Continuidade',name:'Mentoria',price:'a partir de 125 €',description:'Quando sabes onde queres chegar, mas não queres fazer o caminho sozinho.',limits:'Objetivo, duração, calendário, âmbito e valor final são definidos antes de começar.',media:[],cta:'Quero saber como funciona'},

{slug:'ritual-personalizado',kind:'especial',door:'Ritual · Sob orçamento',name:'Ritual Personalizado',price:null,description:'Quando o pedido é demasiado teu para vir pronto.',limits:'O formato, materiais e valor são apresentados antes. Trabalho simbólico e ritual, sem promessa de resultado.',media:[],cta:'Quero explicar o pedido'},
{slug:'pedidos-especiais',kind:'especial',door:'Pedido físico · Sob orçamento',name:'Pedidos Físicos',price:null,description:'Quando queres uma peça pensada para ti. Cristais, pulseiras, preparações ou jesmonite.',limits:'Materiais, dimensões, acabamento, prazo, disponibilidade e valor são confirmados antes.',media:[],cta:'Quero pedir orçamento'},

{slug:'companhia',kind:'companhia',door:'Presença',name:'Presença',price:'desde 35 €',description:'Online. Presencial. SOS.',limits:'Inclui Presença Online, Presença Social, Presença Próxima, SOS 1 dia e SOS 1 semana. Não é um serviço sexual nem um serviço de emergência.',media:[{role:'ambience',src:'../images/root/companhia-cafe-fixed.webp?v=20260916-1532-fixed',alt:'Mesa com café como imagem de tempo partilhado',aspect:'portrait'}],formats:['Presença Online · 35 €','Presença Social · 80 €','Presença Próxima · 80 €','SOS 1 dia · 60 €','SOS 1 semana · 120 €'],cta:'Descobrir Presença',next:{slug:'acompanhamento',label:'Se procuras continuidade por mais tempo, ver Acompanhamento'}},

{slug:'b2b',kind:'profissional',door:'Profissional',name:'Maison para profissionais',price:null,description:'Revenda, experiência, gifting, pequenas séries e pilotos profissionais por proposta.',limits:'Formato, preço, quantidades, capacidade, prazo e enquadramento são confirmados antes. Pilotos para equipas são não-clínicos e não são apresentados como formação oficial ou certificação pública.',media:[],cta:'Quero uma proposta B2B'}
];

const MAISON_SERVICE_LOCALES={
  'pt-BR':{
    tarot:{door:'Tarot',name:'Consulta de Tarot',price:'35 €',description:'Uma consulta para olhar para a sua pergunta com contexto e sem ruído.',limits:'Não decide por você nem transforma possibilidades em certezas.',cta:'Quero olhar para isso'},
    acompanhamento:{door:'Continuidade',name:'Acompanhamento',price:'170 € · 4 semanas',description:'Quando você não quer voltar ao zero cada vez que alguma coisa muda.',limits:'Inclui 2 encontros de 60 minutos e até 1 check-in curto por semana. Não é chat permanente, psicoterapia, tratamento clínico ou apoio de emergência. Datas, canal e janelas de resposta são definidos antes.',cta:'Quero entender se faz sentido'},
    mentoria:{door:'Continuidade',name:'Mentoria',price:'a partir de 125 €',description:'Quando você sabe onde quer chegar, mas não quer fazer o caminho sozinho.',limits:'Objetivo, duração, calendário, escopo e valor final são definidos antes de começar.',cta:'Quero saber como funciona'},
    'ritual-personalizado':{door:'Ritual · Sob orçamento',name:'Ritual Personalizado',description:'Quando o pedido é pessoal demais para vir pronto.',limits:'O formato, materiais e valor são apresentados antes. Trabalho simbólico e ritual, sem promessa de resultado.',cta:'Quero explicar o pedido'},
    'pedidos-especiais':{door:'Pedido físico · Sob orçamento',name:'Pedidos Físicos',description:'Quando você quer uma peça pensada para você. Cristais, pulseiras, preparações ou jesmonite.',limits:'Materiais, dimensões, acabamento, prazo, disponibilidade e valor são confirmados antes.',cta:'Quero pedir orçamento'},
    companhia:{door:'Presença',name:'Presença',price:'desde 35 €',description:'Online. Presencial. SOS.',limits:'Inclui Presença Online, Presença Social, Presença Próxima, SOS 1 dia e SOS 1 semana. Não é um serviço sexual nem um serviço de emergência.',formats:['Presença Online · 35 €','Presença Social · 80 €','Presença Próxima · 80 €','SOS 1 dia · 60 €','SOS 1 semana · 120 €'],cta:'Descobrir Presença'},
    b2b:{door:'Profissional',name:'Maison para profissionais',description:'Revenda, experiência, gifting, pequenas séries e pilotos profissionais por proposta.',limits:'Formato, preço, quantidades, capacidade, prazo e enquadramento são confirmados antes.',cta:'Quero uma proposta B2B'}
  },
  en:{
    tarot:{door:'Tarot',name:'Tarot Consultation',price:'€35',description:'A consultation to look at your question with context and without noise.',limits:'It does not decide for you or turn possibilities into certainties.',cta:'I want to look at this'},
    acompanhamento:{door:'Continuity',name:'Ongoing Support',price:'€170 · 4 weeks',description:'For when you do not want to start from zero every time something changes.',limits:'Includes 2 sessions of 60 minutes and up to 1 short check-in per week. It is not permanent chat, psychotherapy, clinical treatment or emergency support. Dates, channel and response windows are agreed beforehand.',cta:'See if it makes sense'},
    mentoria:{door:'Continuity',name:'Mentoring',price:'from €125',description:'When you know where you want to go but do not want to make the journey alone.',limits:'Goal, duration, schedule, scope and final price are defined before starting.',cta:'See how it works'},
    'ritual-personalizado':{door:'Ritual · By quote',name:'Personalised Ritual',description:'When the request is too personal to come ready-made.',limits:'Format, materials and price are presented beforehand. Symbolic and ritual work, with no promise of outcome.',cta:'Explain the request'},
    'pedidos-especiais':{door:'Physical request · By quote',name:'Custom Physical Requests',description:'When you want a piece considered for you. Crystals, bracelets, preparations or Jesmonite.',limits:'Materials, dimensions, finish, lead time, availability and price are confirmed beforehand.',cta:'Request a quote'},
    companhia:{door:'Presence',name:'Presence',price:'from €35',description:'Online. In person. SOS.',limits:'Includes Online Presence, Social Presence, Close Presence, SOS 1 day and SOS 1 week. It is not a sexual service or an emergency service.',formats:['Online Presence · €35','Social Presence · €80','Close Presence · €80','SOS 1 day · €60','SOS 1 week · €120'],cta:'Discover Presence'},
    b2b:{door:'Professional',name:'Maison for professionals',description:'Resale, experience, gifting, small batches and professional pilots by proposal.',limits:'Format, price, quantities, capacity, lead time and scope are confirmed beforehand.',cta:'Request a B2B proposal'}
  },
  es:{
    tarot:{door:'Tarot',name:'Consulta de Tarot',price:'35 €',description:'Una consulta para mirar tu pregunta con contexto y sin ruido.',limits:'No decide por ti ni convierte posibilidades en certezas.',cta:'Quiero mirar esto'},
    acompanhamento:{door:'Continuidad',name:'Acompañamiento',price:'170 € · 4 semanas',description:'Para cuando no quieres volver a cero cada vez que algo cambia.',limits:'Incluye 2 sesiones de 60 minutos y hasta 1 check-in breve por semana. No es chat permanente, psicoterapia, tratamiento clínico ni apoyo de emergencia. Fechas, canal y ventanas de respuesta se acuerdan antes.',cta:'Quiero ver si tiene sentido'},
    mentoria:{door:'Continuidad',name:'Mentoría',price:'desde 125 €',description:'Cuando sabes dónde quieres llegar, pero no quieres hacer el camino solo.',limits:'Objetivo, duración, calendario, alcance y precio final se definen antes de empezar.',cta:'Quiero saber cómo funciona'},
    'ritual-personalizado':{door:'Ritual · Bajo presupuesto',name:'Ritual Personalizado',description:'Cuando la petición es demasiado tuya para venir ya hecha.',limits:'El formato, los materiales y el precio se presentan antes. Trabajo simbólico y ritual, sin promesa de resultado.',cta:'Quiero explicar la petición'},
    'pedidos-especiais':{door:'Pedido físico · Bajo presupuesto',name:'Pedidos Físicos',description:'Cuando quieres una pieza pensada para ti. Cristales, pulseras, preparaciones o Jesmonite.',limits:'Materiales, dimensiones, acabado, plazo, disponibilidad y precio se confirman antes.',cta:'Quiero pedir presupuesto'},
    companhia:{door:'Presencia',name:'Presencia',price:'desde 35 €',description:'Online. Presencial. SOS.',limits:'Incluye Presencia Online, Presencia Social, Presencia Próxima, SOS 1 día y SOS 1 semana. No es un servicio sexual ni un servicio de emergencia.',formats:['Presencia Online · 35 €','Presencia Social · 80 €','Presencia Próxima · 80 €','SOS 1 día · 60 €','SOS 1 semana · 120 €'],cta:'Descubrir Presencia'},
    b2b:{door:'Profesional',name:'Maison para profesionales',description:'Reventa, experiencia, gifting, pequeñas series y pilotos profesionales mediante propuesta.',limits:'Formato, precio, cantidades, capacidad, plazo y encuadre se confirman antes.',cta:'Quiero una propuesta B2B'}
  }
};
function maisonServiceLocale(){
  const htmlLang=typeof document!=='undefined'&&document.documentElement?document.documentElement.lang:'';
  const raw=String(window.MAISON_LOCALE||htmlLang||'pt-PT').toLowerCase();
  if(raw.startsWith('pt-br'))return 'pt-BR';
  if(raw.startsWith('en'))return 'en';
  if(raw.startsWith('es'))return 'es';
  return 'pt-PT';
}
{
  const locale=maisonServiceLocale();
  const translations=MAISON_SERVICE_LOCALES[locale]||{};
  if(locale!=='pt-PT'){
    window.MAISON_SERVICES=window.MAISON_SERVICES.map(service=>{
      const copy=translations[service.slug];
      return copy?{...service,...copy}:service;
    });
  }
}

window.MAISON_SERVICE_BY_SLUG=Object.fromEntries(window.MAISON_SERVICES.map(service=>[service.slug,service]));
window.MAISON_SERVICES_BY_KIND=window.MAISON_SERVICES.reduce((groups,service)=>{(groups[service.kind]??=[]).push(service);return groups;},{});
