/* MAISON SERVICE CATALOGUE
   Public service architecture. Prices shown only where they are defined.
   Services are grouped by kind on the public page; Presença remains a distinct special service.
*/
window.MAISON_SERVICES=[
{slug:'tarot-expresso',kind:'consulta',group:'tarot',door:'Tarot',name:'Uma pergunta',price:'17 €',amount:1700,description:'Uma pergunta. Uma leitura directa.',limits:'Não decide por ti nem transforma possibilidades em certezas.',media:[],cta:'Quero perguntar'},
{slug:'tarot',kind:'consulta',group:'tarot',door:'Tarot',name:'Uma consulta',price:'35 €',amount:3500,description:'Mais contexto. Mais peças. Uma leitura completa.',limits:'Não decide por ti nem transforma possibilidades em certezas.',media:[],cta:'Quero olhar para isto',next:{slug:'acompanhamento',label:'Se uma consulta não chegar, continuar em Acompanhamento'}},
{slug:'tarot-terapeutico',kind:'consulta',group:'tarot',door:'Tarot',name:'Aprofundar',price:'70 €',amount:7000,description:'Quando isto tem história e precisa de mais espaço.',limits:'É uma consulta de reflexão e orientação. Não substitui cuidados clínicos quando são necessários.',media:[],cta:'Quero aprofundar'},
{slug:'consulta-escrita-breve',kind:'consulta',group:'escrito',door:'Por escrito',name:'Breve',price:'25 €',amount:2500,description:'Uma resposta concreta. Para leres e releres.',limits:'O formato é escrito e mantém os mesmos limites de uma consulta de orientação.',media:[],cta:'Quero por escrito'},
{slug:'consulta-escrita-aprofundada',kind:'consulta',group:'escrito',door:'Por escrito',name:'Aprofundada',price:'45 €',amount:4500,description:'Mais contexto. Mais camadas. Por escrito.',limits:'O formato é escrito e não substitui cuidados clínicos quando são necessários.',media:[],cta:'Quero aprofundar por escrito'},
{slug:'escuta',kind:'consulta',group:'sem-tarot',door:'Sem Tarot',name:'Escuta Orientada',price:'60 €',amount:6000,description:'Dizes tudo. Pomos ordem.',limits:'É um serviço de escuta e organização da situação. Não é psicoterapia nem tratamento clínico.',media:[],cta:'Quero falar'},

{slug:'acompanhamento',kind:'continuidade',door:'Continuidade',name:'Acompanhamento',price:'170 € · 4 semanas',description:'Quatro semanas para não voltares sempre ao zero.',limits:'Inclui 2 encontros de 60 minutos e até 1 check-in curto por semana. Não é chat permanente, psicoterapia, tratamento clínico ou apoio de emergência. Datas, canal e janelas de resposta ficam definidos antes.',media:[],cta:'Quero perceber se faz sentido',entry:['produto','resposta','consulta','companhia']},
{slug:'mentoria',kind:'continuidade',door:'Continuidade',name:'Mentoria',price:'a partir de 125 €',description:'Aprender. Estruturar. Avançar com acompanhamento.',limits:'Objetivo, duração, calendário, âmbito e valor final são definidos antes de começar.',media:[],cta:'Quero saber como funciona'},

{slug:'ritual-personalizado',kind:'especial',door:'Ritual · Sob orçamento',name:'Ritual Personalizado',price:null,description:'Um ritual construído para o teu pedido.',limits:'O formato, materiais e valor são apresentados antes. Trabalho simbólico e ritual, sem promessa de resultado.',media:[],cta:'Quero explicar o pedido'},
{slug:'pedidos-especiais',kind:'especial',door:'Pedido físico · Sob orçamento',name:'Pedidos Físicos',price:null,description:'Cristais, pulseiras, preparações e peças em jesmonite feitas para o pedido.',limits:'Materiais, dimensões, acabamento, prazo, disponibilidade e valor são confirmados antes.',media:[],cta:'Quero pedir orçamento'},

{slug:'companhia',kind:'companhia',door:'Presença',name:'Presença',price:'desde 35 €',description:'Online. Presencial. SOS.',limits:'Inclui Presença Online, Presença Social, Presença Próxima, SOS 1 dia e SOS 1 semana. Não é um serviço sexual nem um serviço de emergência.',media:[{role:'ambience',src:'../images/root/companhia-cafe-fixed.webp?v=20260916-1532-fixed',alt:'Mesa com café como imagem de tempo partilhado',aspect:'portrait'}],formats:['Presença Online · 35 €','Presença Social · 80 €','Presença Próxima · 80 €','SOS 1 dia · 60 €','SOS 1 semana · 120 €'],cta:'Descobrir Presença',next:{slug:'acompanhamento',label:'Se procuras continuidade por mais tempo, ver Acompanhamento'}},

{slug:'b2b',kind:'profissional',door:'Profissional',name:'Maison para profissionais',price:null,description:'Produtos e propostas para o teu espaço.',limits:'A proposta e o preço dependem das necessidades, quantidades e contexto profissional.',media:[],cta:'Quero uma proposta B2B'}
];
window.MAISON_SERVICE_BY_SLUG=Object.fromEntries(window.MAISON_SERVICES.map(service=>[service.slug,service]));
window.MAISON_SERVICES_BY_KIND=window.MAISON_SERVICES.reduce((groups,service)=>{(groups[service.kind]??=[]).push(service);return groups;},{});
