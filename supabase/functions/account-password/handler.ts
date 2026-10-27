export const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
type Prepared={request_id:string;target_id:string;target_email:string};
export type PasswordServices={
 getUser:()=>Promise<{id:string;email?:string}|null>;
 prepare:(operation:string,target:string|null,version:number|null)=>Promise<{data:Prepared|null;error:{code?:string;message?:string}|null}>;
 verifyOld:(email:string,password:string)=>Promise<string|null>;
 update:(id:string,password:string)=>Promise<boolean>;
 finish:(request:string,success:boolean)=>Promise<boolean>;
};
const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:{...cors,'Content-Type':'application/json'}});
export async function handlePassword(req:Request,services:PasswordServices){
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply(405,'Método não permitido.');
 let requestId:string|null=null,changed=false;
 try{
  const actor=await services.getUser();if(!actor)return reply(401,'Sessão inválida. Entre novamente.');
  let body;try{body=await req.json();}catch{return reply(400,'Solicitação inválida.');}
  if(!body||!['change','reset'].includes(body.action))return reply(400,'Operação inválida.');
  if(body.action==='change'&&(typeof body.oldPassword!=='string'||!body.oldPassword||typeof body.newPassword!=='string'||body.newPassword.length<8||body.newPassword.length>128||body.newPassword!==body.confirmPassword||body.newPassword===body.oldPassword))return reply(400,'Confira a senha atual e a confirmação da nova senha (8 a 128 caracteres).');
  if(body.action==='reset'&&(typeof body.targetId!=='string'||!Number.isInteger(body.version)||typeof body.email!=='string'||body.confirmation!==body.email))return reply(400,'Confirme o e-mail da conta para resetar a senha.');
  const prepared=await services.prepare(body.action,body.action==='reset'?body.targetId:null,body.action==='reset'?body.version:null);
  if(prepared.error||!prepared.data)return reply(prepared.error?.code==='42501'?403:409,prepared.error?.code==='22023'?prepared.error.message||'Confira a solicitação.':'Não foi possível autorizar a operação. Atualize a página.');
  const target=prepared.data;requestId=target.request_id;
  if(body.action==='reset'&&target.target_email.toLowerCase()!==body.email.toLowerCase()){await services.finish(requestId,false);return reply(409,'O cadastro mudou. Atualize a lista.');}
  if(body.action==='change'){
   if(target.target_id!==actor.id||await services.verifyOld(target.target_email,body.oldPassword)!==actor.id){await services.finish(requestId,false);return reply(400,'Senha atual incorreta ou não foi possível confirmá-la.');}
  }
  // A senha de reset é definida exclusivamente pelo servidor, nunca pelo payload.
  changed=await services.update(target.target_id,body.action==='reset'?'12345678':body.newPassword);
  const audited=await services.finish(requestId,changed);
  if(!changed)return reply(400,'Não foi possível alterar a senha. Confira a solicitação e tente novamente.');
  if(!audited)return reply(200,'Senha alterada. A solicitação está registrada; a confirmação da auditoria precisa de verificação administrativa.');
  return reply(200,body.action==='reset'?'Senha resetada para 12345678. Oriente o usuário a alterá-la em Minha conta.':'Senha alterada com sucesso.');
 }catch{
  if(requestId&&!changed)try{await services.finish(requestId,false);}catch{/* A solicitação inicial permanece registrada. */}
  return reply(changed?200:500,changed?'Senha alterada. Confira o registro com o administrador.':'Não foi possível concluir. Tente novamente.');
 }
}
