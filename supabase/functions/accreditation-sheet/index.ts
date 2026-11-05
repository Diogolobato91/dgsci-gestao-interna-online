import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SHEETS={company:'0',professional:'1179762174'} as const;
type Kind=keyof typeof SHEETS;
const headers={
  'Access-Control-Allow-Origin':'https://dgsci.netlify.app',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Content-Type':'application/json; charset=utf-8',
};
function response(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers});}
function parseGviz(text:string){
 const match=text.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
 if(!match)throw new Error('Resposta inválida da planilha oficial.');
 return JSON.parse(match[1]);
}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 if(request.method!=='POST')return response({error:'Método não permitido.'},405);
 try{
  const body=await request.json() as {kind?:string};
  if(body.kind!=='company'&&body.kind!=='professional')return response({error:'Relação inválida.'},400);
  const source=`https://docs.google.com/spreadsheets/d/1Z4GC69_lE6z2ubKMqmP3UQrvoOwCjVof6Owyw3YJVzM/gviz/tq?tqx=out:json&gid=${SHEETS[body.kind as Kind]}&headers=0`;
  const result=await fetch(source,{headers:{'User-Agent':'DGSCI Portal/1.0'}});
  if(!result.ok)throw new Error(`A planilha oficial respondeu ${result.status}.`);
  return response(parseGviz(await result.text()));
 }catch(error){console.error(error);return response({error:'Não foi possível consultar a planilha oficial.'},502);}
});
