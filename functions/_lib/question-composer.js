/* MAISON JF 3.0: choose 16 distinct approved questions from the entire Vault.
   Editorial stages are preferences, never reasons to reject an otherwise playable session. */

export function composeQuestionSession({theme='*',seed,questions,seenIds=[]}={}){
  if(!seed)throw new Error('seed_required');
  if(!Array.isArray(questions))throw new Error('questions_required');
  const seen=new Set(seenIds);
  const unique=new Map();
  for(const card of questions){
    if(!card?.id||unique.has(String(card.id)))continue;
    if(theme!=='*'&&card.theme!==theme)continue;
    if(card.status!=='active'||card.exposure!=='paid')continue;
    if(['review','retired'].includes(card.rotationState||'normal'))continue;
    if(['review','retired'].includes(card.lifecycleState||'live'))continue;
    if(typeof card.text!=='string'||!card.text.trim())continue;
    unique.set(String(card.id),card);
  }
  const valid=[...unique.values()];
  if(valid.length<16)throw new Error('insufficient_active_paid_questions');
  const rng=mulberry32(hashSeed(String(seed)));
  const order=items=>items.map(card=>({card,sort:rng()})).sort((a,b)=>a.sort-b.sort).map(x=>x.card);
  const unseen=order(valid.filter(card=>!seen.has(card.id)));
  const previouslySeen=order(valid.filter(card=>seen.has(card.id)));
  const chosen=[...unseen,...previouslySeen].slice(0,16);
  // Prefer four levels of depth when the approved pool supports them.
  const levels=['recognize','deepen','confront','integrate'];
  const groups=levels.map(stage=>chosen.filter(card=>card.stage===stage));
  const arranged=[];
  for(let i=0;i<4;i++)for(const group of groups){if(group[i])arranged.push(group[i]);}
  for(const card of chosen)if(!arranged.some(x=>x.id===card.id))arranged.push(card);
  const cards=arranged.slice(0,16);
  const packA=cards.filter((_,i)=>i%2===0);
  const packB=cards.filter((_,i)=>i%2===1);
  return {engineVersion:'question-composer-v4',qualityVersion:'approved-pool',qualityScore:1,mode:'balanced',theme,seed:String(seed),packA,packB,ids:cards.map(card=>card.id)};
}
function hashSeed(input){let h=2166136261>>>0;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
