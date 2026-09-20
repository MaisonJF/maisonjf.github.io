import fs from 'node:fs';
const source=fs.readFileSync('functions/_lib/pdi-vault-admin.js','utf8');
const m=source.match(/INSERT INTO vault_questions\s*\(([\s\S]*?)\)\s*VALUES\(([\s\S]*?)\)\`/);
if(!m)throw new Error('insert_not_found');
const cols=m[1].split(',').map(x=>x.trim()).filter(Boolean);
const vals=[];
let buf='',depth=0,quote=null;
for(const ch of m[2]){
  if(quote){
    buf+=ch;
    if(ch===quote)quote=null;
    continue;
  }
  if(ch==="'"||ch==='"'){quote=ch;buf+=ch;continue;}
  if(ch==='('){depth++;buf+=ch;continue;}
  if(ch===')'){depth--;buf+=ch;continue;}
  if(ch===','&&depth===0){vals.push(buf.trim());buf='';continue;}
  buf+=ch;
}
if(buf.trim())vals.push(buf.trim());
if(cols.length!==vals.length)throw new Error('column_value_mismatch:'+cols.length+':'+vals.length);
if(cols.length!==33)throw new Error('unexpected_column_count:'+cols.length);
console.log('PDI private importer INSERT shape: OK · '+cols.length+' columns');
