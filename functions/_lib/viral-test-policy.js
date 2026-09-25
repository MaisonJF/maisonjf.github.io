export const VIRAL_TEST_POLICY={
  version:'2026-09-25-human-voice-v2',
  purpose:'Create tests people want to finish, recognise themselves in, share, revisit and continue from without using deceptive or diagnostic framing.',
  voice:{
    principle:'João escreve. Brain pensa. MAISON fala.',
    rules:[
      'Use familiar human language, never internal construct labels in public copy.',
      'Write as a real Portuguese person would speak or write, with João voice and Brain knowledge.',
      'Avoid em dash and en dash. Use natural punctuation and start a new sentence when that is how a person would say it.',
      'Avoid AI-sounding symmetry, over-explanation, jargon and polished-but-empty phrasing.',
      'Recognition must come from a concrete human truth, not from pretending to know the person.'
    ]
  },
  principles:{
    appleKiss:[
      'One human tension per question.',
      'Short question. Short answers. No explanation inside the choice.',
      'Prefer concrete scenes over abstract traits.',
      'Remove any sentence that does not change recognition, scoring or action.'
    ],
    barnum:[
      'Use broad human experiences that feel recognisable without pretending to know the person.',
      'Anchor broad recognition in concrete behaviour, moments or inner reactions.',
      'Never present a result as diagnosis, certainty or hidden truth.'
    ],
    yoichiFeral:[
      'Use one or two uncomfortable-truth moments per test, not constant intensity.',
      'The hit should come from recognition, not insult, fear or humiliation.',
      'A strong question should make the person think “foda-se, eu faço isto” without needing vulgar copy.'
    ],
    hormozi:[
      'After the result, make the next useful step obvious and proportionate.',
      'Prefer a low-friction relevant offer before a larger commitment when one exists.',
      'Do not interrupt the test with selling.'
    ],
    viral:[
      'Results need a clean identity label plus one quote worth posting.',
      'Share cards must carry MAISON JF®, the result, a memorable line and a direct route back to the test.',
      'A shared result should make the next person curious about their own result.'
    ],
    conversion:[
      'Result first. Recognition second. Offer third.',
      'Offer Brain receives only the minimum result signals needed for routing.',
      'Measure recommendation, click and purchase without storing answer text.'
    ],
    repetition:[
      'Every test can point naturally to another relevant test.',
      'Retaking should remain easy when context or relationship changes.',
      'Do not manufacture streaks, urgency or fake scarcity.'
    ],
    loyalty:[
      'All tests belong to Volta Para Casa and should reinforce MAISON as the place the person returns to.',
      'Keep vocabulary, visual identity and result architecture consistent across tests.'
    ]
  },
  questionRules:{
    maxQuestionWords:16,
    preferredAnswerWords:14,
    answerCountMin:4,
    answerCountMax:5,
    shuffleAnswers:true,
    forbid:[
      'clinical diagnosis claims',
      'certainty about motives or personality',
      'fear-based purchase pressure',
      'fake scarcity or urgency',
      'shame as a conversion tactic'
    ]
  },
  resultContract:['identityLabel','recognitionHeadline','shortExplanation','shareQuote','shareCard','nextBestOffers','nextTest']
};

export function auditViralQuestion(question=''){
  const text=String(question).trim();
  const words=text.split(/\s+/).filter(Boolean);
  const errors=[];
  if(words.length>VIRAL_TEST_POLICY.questionRules.maxQuestionWords)errors.push('too_long');
  if(/[—–]/.test(text))errors.push('public_voice_dash_forbidden');
  return {ok:errors.length===0,words:words.length,errors};
}
