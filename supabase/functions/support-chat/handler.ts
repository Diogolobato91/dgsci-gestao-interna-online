export type OpenTicketInput={service:string;cnpj:string;requester:string;phone:string;email:string;city:string;reference?:string;summary:string};
export type ConversationInput={protocol:string;cnpj:string;accessKey:string};
export type SupportChatServices={
 allow:(scope:'open'|'conversation'|'message',request:Request)=>Promise<boolean>;
 open:(input:OpenTicketInput,accessHash:string)=>Promise<Record<string,unknown>|null>;
 conversation:(input:ConversationInput&{before?:string},accessHash:string)=>Promise<Record<string,unknown>|null>;
 message:(input:ConversationInput&{message:string},accessHash:string)=>Promise<Record<string,unknown>|null>;
 satisfaction:(input:ConversationInput&{score:number;comment:string},accessHash:string)=>Promise<boolean>;
 prepareAttachment:(input:ConversationInput&{fileName:string;mimeType:string;size:number},accessHash:string)=>Promise<Record<string,unknown>|null>;
 registerAttachment:(input:ConversationInput&{fileName:string;filePath:string;mimeType:string;size:number},accessHash:string)=>Promise<Record<string,unknown>|null>;
};

const json=(status:number,body:unknown,origin:string)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'}});
const cleanKey=(value:unknown)=>String(value??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const validText=(value:unknown,min:number,max:number)=>typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max;
export const formatAccessKey=(raw:string)=>cleanKey(raw).match(/.{1,4}/g)?.join('-')||'';
export async function sha256(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');}
export function createAccessKey(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(12));return formatAccessKey(Array.from(bytes,byte=>alphabet[byte%alphabet.length]).join(''));}

export async function handleSupportChat(request:Request,services:SupportChatServices,origin:string){
 if(request.method==='OPTIONS')return new Response('ok',{headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
 if(request.method!=='POST')return json(405,{message:'Método não permitido.'},origin);
 if(Number(request.headers.get('content-length')||0)>20000)return json(413,{message:'Solicitação muito grande.'},origin);
 let body:Record<string,unknown>;try{body=await request.json();}catch{return json(400,{message:'Solicitação inválida.'},origin);}
 const action=body.action;
 if(!['open','conversation','message','satisfaction','prepare_attachment','register_attachment'].includes(String(action)))return json(400,{message:'Operação inválida.'},origin);
 const scope=(action==='message'?'message':action==='open'?'open':'conversation') as 'open'|'conversation'|'message';
 if(!await services.allow(scope,request))return json(429,{message:'Muitas tentativas. Aguarde alguns minutos e tente novamente.'},origin);
 try{
  if(action==='open'){
   if(!validText(body.service,2,80)||!validText(body.cnpj,14,18)||!validText(body.requester,3,160)||!validText(body.phone,10,20)||!validText(body.email,5,254)||!validText(body.city,2,120)||!validText(body.summary,20,1500))return json(400,{message:'Confira os dados obrigatórios.'},origin);
   const accessKey=createAccessKey(),accessHash=await sha256(cleanKey(accessKey));
   const ticket=await services.open({service:String(body.service),cnpj:String(body.cnpj),requester:String(body.requester),phone:String(body.phone),email:String(body.email),city:String(body.city),reference:String(body.reference??''),summary:String(body.summary)},accessHash);
   if(!ticket)return json(400,{message:'Não foi possível abrir o atendimento.'},origin);
   return json(201,{...ticket,accessKey},origin);
  }
  if(!validText(body.protocol,8,40)||!validText(body.cnpj,14,18)||cleanKey(body.accessKey).length!==12)return json(400,{message:'Confira o CNPJ, o protocolo e a chave de acesso.'},origin);
  const input={protocol:String(body.protocol),cnpj:String(body.cnpj),accessKey:formatAccessKey(String(body.accessKey))},accessHash=await sha256(cleanKey(body.accessKey));
  if(action==='conversation'){
   const conversation=await services.conversation({...input,before:typeof body.before==='string'?body.before:undefined},accessHash);
   return conversation?json(200,conversation,origin):json(404,{message:'Atendimento não encontrado. Confira os dados informados.'},origin);
  }
  if(action==='prepare_attachment'){
   const fileName=String(body.fileName??''),mimeType=String(body.mimeType??''),size=Number(body.size);
   if(!validText(fileName,1,200)||!['image/jpeg','image/png','image/webp','application/pdf'].includes(mimeType)||!Number.isInteger(size)||size<1||size>10485760)return json(400,{message:'Envie imagem ou PDF de até 10 MB.'},origin);
   const prepared=await services.prepareAttachment({...input,fileName,mimeType,size},accessHash);
   return prepared?json(200,prepared,origin):json(404,{message:'Atendimento não encontrado.'},origin);
  }
  if(action==='register_attachment'){
   const fileName=String(body.fileName??''),filePath=String(body.filePath??''),mimeType=String(body.mimeType??''),size=Number(body.size);
   if(!validText(fileName,1,200)||!validText(filePath,10,500)||!['image/jpeg','image/png','image/webp','application/pdf'].includes(mimeType)||!Number.isInteger(size)||size<1||size>10485760)return json(400,{message:'Arquivo inválido.'},origin);
   const registered=await services.registerAttachment({...input,fileName,filePath,mimeType,size},accessHash);
   return registered?json(201,registered,origin):json(404,{message:'Atendimento não encontrado.'},origin);
  }
  if(action==='satisfaction'){
   const score=Number(body.score),comment=String(body.comment??'');
   if(!Number.isInteger(score)||score<1||score>5||comment.length>1000)return json(400,{message:'Informe uma nota de 1 a 5.'},origin);
   const saved=await services.satisfaction({...input,score,comment},accessHash);
   return saved?json(201,{saved:true},origin):json(404,{message:'Atendimento concluído não encontrado.'},origin);
  }
  if(!validText(body.message,1,4000))return json(400,{message:'Escreva uma mensagem de até 4.000 caracteres.'},origin);
  const message=await services.message({...input,message:String(body.message)},accessHash);
  return message?json(201,message,origin):json(404,{message:'Atendimento não encontrado. Confira os dados informados.'},origin);
 }catch(error){
  const code=typeof error==='object'&&error&&'code'in error?String((error as {code?:string}).code):'';
  const message=typeof error==='object'&&error&&'message'in error?String((error as {message?:string}).message):'';
  if(code==='22023')return json(400,{message:message||'Confira a solicitação.'},origin);
  console.error('support-chat operation failed',code||'unexpected');
  return json(500,{message:'Não foi possível concluir o atendimento. Tente novamente.'},origin);
 }
}
