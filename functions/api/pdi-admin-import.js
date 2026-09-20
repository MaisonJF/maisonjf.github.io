import { requireMaisonVault } from '../_lib/maison-vault.js';
import {
  importPrivateQuestionBatch,
  inspectPrivateQuestionBatch,
  activatePrivateQuestionBatch
} from '../_lib/pdi-vault-admin.js';

export async function onRequestPost({request,env}){
  try{
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin && new URL(origin).origin!==url.origin)return json({error:'Origem não autorizada.'},403);

    const configured=String(env?.MAISON_PDI_IMPORT_SECRET||'');
    if(configured.length<24)return json({error:'Importador privado não configurado.'},503);
    const supplied=String(request.headers.get('x-maison-admin-key')||'');
    if(!(await secureEqual(configured,supplied)))return json({error:'Não autorizado.'},401);

    const body=await request.json().catch(()=>null);
    if(!body||typeof body!=='object')return json({error:'Pedido inválido.'},400);
    const db=requireMaisonVault(env);
    const action=String(body.action||'');

    if(action==='import'){
      const result=await importPrivateQuestionBatch(db,{
        batchId:body.batchId,
        questions:body.questions
      });
      return json(result,result.ok?200:422);
    }
    if(action==='inspect'){
      return json(await inspectPrivateQuestionBatch(db,{batchId:body.batchId}));
    }
    if(action==='activate'){
      return json(await activatePrivateQuestionBatch(db,{batchId:body.batchId}));
    }
    return json({error:'Ação inválida.'},400);
  }catch(error){
    const code=String(error?.message||'private_import_failed');
    const status=/required|invalid|unknown|too_large|ontology/.test(code)?400:500;
    return json({error:code},status);
  }
}

export async function onRequestGet(){
  return json({error:'Método não permitido.'},405);
}

async function secureEqual(expected,actual){
  if(!actual)return false;
  const [a,b]=await Promise.all([digest(expected),digest(actual)]);
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  return diff===0;
}

async function digest(value){
  return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value))));
}

function json(payload,status=200){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'private, no-store, max-age=0',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer'
    }
  });
}
