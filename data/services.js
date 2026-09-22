/* MAISON SERVICE CATALOGUE
   Public service architecture. Prices shown only where they are defined.
   Services are grouped by kind on the public page; Presença remains a distinct special service.
*/
window.MAISON_SERVICES=[
{slug:'tarot',kind:'consulta',group:'tarot',door:'Tarot',name:'Consulta de Tarot',price:'35 €',amount:3500,description:'Uma consulta para olhar para a tua pergunta com contexto e sem ruído.',limits:'Não decide por ti nem transforma possibilidades em certezas.',media:[],cta:'Quero olhar para isto',next:{slug:'acompanhamento',label:'Se uma consulta não chegar, continuar em Acompanhamento'}},
{slug:'consulta-escrita-breve',kind:'consulta',group:'escrito',door:'Por escrito',name:'Breve',price:'25 €',amount:2500,description:'Quando queres uma resposta que fique contigo.',limits:'O formato é escrito e mantém os mesmos limites de uma consulta de orientação.',media:[],cta:'Quero por escrito'},
{slug:'consulta-escrita-aprofundada',kind:'consulta',group:'escrito',door:'Por escrito',name:'Aprofundada',price:'45 €',amount:4500,description:'Quando precisas de reler até as peças começarem a assentar.',limits:'O formato é escrito e não substitui cuidados clínicos quando são necessários.',media:[],cta:'Quero aprofundar por escrito'},
{slug:'escuta',kind:'consulta',group:'sem-tarot',door:'Sem Tarot',name:'Escuta Orientada',price:'60 €',amount:6000,description:'Quando tens demasiado dentro da cabeça. Dizes tudo. Pomos ordem.',limits:'É um serviço de escuta e organização da situação. Não é psicoterapia nem tratamento clínico.',media:[],cta:'Quero falar'},

{slug:'acompanhamento',kind:'continuidade',door:'Continuidade',name:'Acompanhamento',price:'170 € · 4 semanas',description:'Quando não queres voltar ao zero cada vez que alguma coisa muda.',limits:'Inclui 2 encontros de 60 minutos e até 1 check-in curto por semana. Não é chat permanente, psicoterapia, tratamento clínico ou apoio de emergência. Datas, canal e janelas de resposta ficam definidos antes.',media:[],cta:'Quero perceber se faz sentido',entry:['produto','resposta','consulta','companhia']},
{slug:'mentoria',kind:'continuidade',door:'Continuidade',name:'Mentoria',price:'a partir de 125 €',description:'Quando sabes onde queres chegar, mas não queres fazer o caminho sozinho.',limits:'Objetivo, duração, calendário, âmbito e valor final são definidos antes de começar.',media:[],cta:'Quero saber como funciona'},

{slug:'ritual-personalizado',kind:'especial',door:'Ritual · Sob orçamento',name:'Ritual Personalizado',price:null,description:'Quando o pedido é demasiado teu para vir pronto.',limits:'O formato, materiais e valor são apresentados antes. Trabalho simbólico e ritual, sem promessa de resultado.',media:[],cta:'Quero explicar o pedido'},
{slug:'pedidos-especiais',kind:'especial',door:'Pedido físico · Sob orçamento',name:'Pedidos Físicos',price:null,description:'Quando queres uma peça pensada para ti. Cristais, pulseiras, preparações ou jesmonite.',limits:'Materiais, dimensões, acabamento, prazo, disponibilidade e valor são confirmados antes.',media:[],cta:'Quero pedir orçamento'},

{slug:'companhia',kind:'companhia',door:'Presença',name:'Presença',price:'desde 35 €',description:'Online. Presencial. SOS.',limits:'Inclui Presença Online, Presença Social, Presença Próxima, SOS 1 dia e SOS 1 semana. Não é um serviço sexual nem um serviço de emergência.',media:[{role:'ambience',src:'../images/root/companhia-cafe-fixed.webp?v=20260916-1532-fixed',alt:'Mesa com café como imagem de tempo partilhado',aspect:'portrait'}],formats:['Presença Online · 35 €','Presença Social · 80 €','Presença Próxima · 80 €','SOS 1 dia · 60 €','SOS 1 semana · 120 €'],cta:'Descobrir Presença',next:{slug:'acompanhamento',label:'Se procuras continuidade por mais tempo, ver Acompanhamento'}},

{slug:'b2b',kind:'profissional',door:'Profissional',name:'Maison para profissionais',price:null,description:'Produtos e propostas para o teu espaço.',limits:'A proposta e o preço dependem das necessidades, quantidades e contexto profissional.',media:[],cta:'Quero uma proposta B2B'}
];
window.MAISON_SERVICE_BY_SLUG=Object.fromEntries(window.MAISON_SERVICES.map(service=>[service.slug,service]));
window.MAISON_SERVICES_BY_KIND=window.MAISON_SERVICES.reduce((groups,service)=>{(groups[service.kind]??=[]).push(service);return groups;},{});
