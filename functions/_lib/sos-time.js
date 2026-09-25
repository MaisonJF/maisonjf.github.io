/* MAISON JF® · SOS wall-clock scheduling
   A daily check-in is anchored to the user's IANA timezone + HH:MM, never "24h after tap". */

const DAY=24*60*60*1000;

export function validateSosLocalTime(value){
  const v=String(value||'').trim();
  const m=/^(\d{2}):(\d{2})$/.exec(v);
  if(!m)throw new Error('invalid_sos_local_time');
  const hour=Number(m[1]),minute=Number(m[2]);
  if(hour<0||hour>23||minute<0||minute>59)throw new Error('invalid_sos_local_time');
  return v;
}

function formatter(timeZone){
  try{
    return new Intl.DateTimeFormat('en-CA',{
      timeZone,year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
    });
  }catch{
    throw new Error('invalid_sos_timezone');
  }
}

function partsAt(ms,timeZone){
  const parts=formatter(timeZone).formatToParts(new Date(ms));
  const out={};
  for(const p of parts){
    if(['year','month','day','hour','minute','second'].includes(p.type))out[p.type]=Number(p.value);
  }
  return out;
}

function wallValue(p){
  return Date.UTC(p.year,p.month-1,p.day,p.hour||0,p.minute||0,p.second||0);
}

function sameWall(a,b){
  return a.year===b.year&&a.month===b.month&&a.day===b.day&&a.hour===b.hour&&a.minute===b.minute;
}

function resolveWallTime(target,timeZone){
  let guess=wallValue({...target,second:0});
  const seen=new Set();
  for(let i=0;i<6;i++){
    if(seen.has(guess))break;
    seen.add(guess);
    const actual=partsAt(guess,timeZone);
    if(sameWall(actual,target))return new Date(guess).toISOString();
    const delta=wallValue({...target,second:0})-wallValue(actual);
    guess+=delta;
  }

  // DST ambiguity/non-existence fallback. Search a narrow window only on transition days.
  const center=wallValue({...target,second:0});
  const exact=[];
  let firstAfter=null;
  let firstAfterWall=Infinity;
  for(let offset=-240;offset<=360;offset++){
    const ms=center+offset*60*1000;
    const actual=partsAt(ms,timeZone);
    if(actual.year!==target.year||actual.month!==target.month||actual.day!==target.day)continue;
    if(sameWall(actual,target))exact.push(ms);
    const localMinute=actual.hour*60+actual.minute;
    const targetMinute=target.hour*60+target.minute;
    if(localMinute>=targetMinute && localMinute<firstAfterWall){
      firstAfterWall=localMinute;
      firstAfter=ms;
    }
  }
  if(exact.length)return new Date(Math.min(...exact)).toISOString();
  if(firstAfter!=null)return new Date(firstAfter).toISOString();
  throw new Error('sos_local_time_unresolvable');
}

export function nextSosDueAt({afterIso,timeZone,localTime}={}){
  const after=Date.parse(afterIso||'');
  if(!Number.isFinite(after))throw new Error('invalid_datetime');
  const time=validateSosLocalTime(localTime);
  const [hour,minute]=time.split(':').map(Number);
  const local=partsAt(after,timeZone);
  const tomorrow=new Date(Date.UTC(local.year,local.month-1,local.day)+DAY);
  return resolveWallTime({
    year:tomorrow.getUTCFullYear(),
    month:tomorrow.getUTCMonth()+1,
    day:tomorrow.getUTCDate(),
    hour,minute
  },timeZone);
}

export function sosLocalDateTime(iso,timeZone){
  const ms=Date.parse(iso||'');
  if(!Number.isFinite(ms))throw new Error('invalid_datetime');
  const p=partsAt(ms,timeZone);
  return {
    date:[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-'),
    time:[String(p.hour).padStart(2,'0'),String(p.minute).padStart(2,'0')].join(':')
  };
}
