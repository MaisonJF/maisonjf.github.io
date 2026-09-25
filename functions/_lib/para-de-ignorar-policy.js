/*
PÁRA DE IGNORAR! — internal product contract
The public promise is intentionally smaller than the engine.
*/
export const PARA_DE_IGNORAR_POLICY={
  version:'2026-09-25-human-voice-v5',
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
  publicVoice:{
    principle:'João escreve. Brain pensa. MAISON fala.',
    rules:[
      'Questions must sound like something one person would genuinely ask another.',
      'Use familiar words and concrete situations. Keep taxonomy and engine terminology private.',
      'Avoid em dash and en dash in public text. Prefer a new sentence or natural punctuation.',
      'Use Brain depth without sounding clinical, corporate, academic or AI-generated.',
      'Do not trade humanity for intensity. Recognition comes before cleverness.'
    ]
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
    themes:'unbounded',
    activeQuestionTargetPerMatureTheme:300,
    editorialCoreTargetAcrossCurrentThemes:null,
    editorialCoreTargetFormula:'current_source_theme_count × activeQuestionTargetPerMatureTheme',
    combinatorialPossibilityTarget:2800000,
    importBatchMaximum:100,
    principle:'A mature theme should have enough depth to make repeated purchases materially different; 300 is a growth floor/target, never a catalogue cap. Private generation may expand far beyond the stored editorial core, but only quality-gated material may become live.',
    oceansCanPropose:true,
    oceansCanProposeThemes:true,
    automaticPaidPublication:false,
    automaticThemeActivation:false,
    humanEditorialApprovalRequired:true
  },
  themeDesign:{
    principle:'Aquilo que sempre quiseste saber. Sem saber como perguntar.',
    source:'maison_oracle_farol_vpc_oceans',
    publicCatalogue:'curated_not_exhaustive',
    numericCap:null
  },
  launchThemes:[
    {slug:'relacoes',label:'Relações',status:'launch'}
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
