/*
PÁRA DE IGNORAR! — internal product contract
The public promise is intentionally smaller than the engine.
*/
export const PARA_DE_IGNORAR_POLICY={
  version:'2026-09-18-v1',
  format:'digital-only',
  session:{
    cards:28,
    packs:2,
    cardsPerPack:14,
    responseContentStored:false,
    stableOnReload:true,
    revealVariability:false,
    revealPoolSize:false
  },
  publicPromise:{
    title:'PÁRA DE IGNORAR!',
    line:'28 perguntas. Duas pessoas.',
    explanation:'O resto acontece na conversa.'
  },
  privacy:{
    storeAnswerText:false,
    storePrivateConversation:false,
    permittedEvents:['shown','advanced','passed','shared','completed','repurchased']
  },
  growth:{
    repertoire:'unbounded',
    oceansCanPropose:true,
    automaticPaidPublication:false,
    humanEditorialApprovalRequired:true
  },
  themes:[
    {slug:'relacoes',label:'Relações',status:'launch'},
    {slug:'dinheiro',label:'Dinheiro',status:'future'},
    {slug:'sonhos',label:'Sonhos',status:'future'},
    {slug:'instrumentalizacao-mental',label:'Instrumentalização Mental',status:'future'},
    {slug:'amor',label:'Amor',status:'future'},
    {slug:'sexo',label:'Sexo',status:'future'},
    {slug:'amizade',label:'Amizade',status:'future'},
    {slug:'carreira',label:'Carreira',status:'future'},
    {slug:'vida-adulta',label:'Vida Adulta',status:'future'}
  ]
};

export const PARA_DE_IGNORAR_PACK_TEMPLATE=[
  {position:1,stage:'open',minIntensity:1,maxIntensity:2},
  {position:2,stage:'open',minIntensity:1,maxIntensity:2},
  {position:3,stage:'open',minIntensity:1,maxIntensity:2},
  {position:4,stage:'recognize',minIntensity:1,maxIntensity:3},
  {position:5,stage:'recognize',minIntensity:1,maxIntensity:3},
  {position:6,stage:'recognize',minIntensity:2,maxIntensity:3},
  {position:7,stage:'deepen',minIntensity:2,maxIntensity:3},
  {position:8,stage:'deepen',minIntensity:2,maxIntensity:3},
  {position:9,stage:'deepen',minIntensity:2,maxIntensity:3},
  {position:10,stage:'touch',minIntensity:3,maxIntensity:4},
  {position:11,stage:'touch',minIntensity:3,maxIntensity:4},
  {position:12,stage:'touch',minIntensity:3,maxIntensity:4},
  {position:13,stage:'close',minIntensity:2,maxIntensity:4},
  {position:14,stage:'signature',minIntensity:3,maxIntensity:4}
];
