import { createClient } from 'npm:@supabase/supabase-js@2';

const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const siteOrigin=(Deno.env.get('PUBLIC_SITE_ORIGIN')||'https://dgsci.netlify.app').replace(/\/$/,'');
const response=(status:number,body:unknown,origin:string)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'}});
const text=(v:unknown,min=0,max=1000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const digestBytes=async(value:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value)),x=>x.toString(16).padStart(2,'0')).join('');
const newToken=()=>{const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');};
const safeTypes=['structural_safety','brigade','hydrant_calculation','descriptive'];
const publicFields='id,memorial_type,protocol,company_name,cnpj,contact_name,contact_email,status,data,return_note,link_expires_at,version,created_at,submitted_at';
const fieldsByType:Record<string,string[]>={
 structural_safety:['activity','address','neighborhood','number','complement','city','building_email','operating','estimated_start','owner_name','owner_email','technical_name','technical_council','technical_email','trrf_method','trrf_elements','reduction','reduction_details','observations'],
 brigade:['activity','address','neighborhood','number','complement','city','building_email','owner_name','owner_email','technical_name','technical_council','provider_type','provider_name','provider_cnpj','provider_registry','built_area','occupancy','building_height','floors','fire_load','risk','training_level','shift_change','brigade_by_floor','private_brigade','private_brigade_details','observations'],
 hydrant_calculation:['address','neighborhood','city','owner_name','technical_name','technical_council','art_rrt','built_area','occupancy','standard','system_type','hose','nozzle','hydrant_count','simultaneous_hydrants','tank_type','rti','tank_capacity','tank_material','suction_data','discharge_data','losses','pump','electrical','observations'],
 descriptive:['service_type','address','neighborhood','number','complement','city','activity','built_area','occupancy','building_height','floors','owner_name','technical_name','technical_council','art_rrt','exits','population','extinguishers','hydrants','gas','emergency_lighting','alarm_detection','documents','observations']
};
const requiredByType:Record<string,string[]>={structural_safety:['activity','address','neighborhood','city','operating','owner_name','technical_name','technical_council','trrf_method','trrf_elements','reduction'],brigade:['activity','address','neighborhood','city','owner_name','technical_name','technical_council','provider_type','built_area','occupancy','floors','training_level','shift_change','brigade_by_floor'],hydrant_calculation:['address','neighborhood','city','owner_name','technical_name','technical_council','art_rrt','built_area','occupancy','standard','system_type','hose','nozzle','hydrant_count','simultaneous_hydrants','tank_type','rti','suction_data','discharge_data','losses'],descriptive:['service_type','address','neighborhood','city','activity','built_area','occupancy','owner_name','technical_name','technical_council','art_rrt','exits','documents']};
const numericFields=new Set(['built_area','building_height','floors','fire_load','hydrant_count','simultaneous_hydrants','rti','tank_capacity']);
const selectValues:Record<string,string[]>={operating:['Sim','Não'],trrf_method:['Tabela TRRF','Tempo equivalente','Outro método'],reduction:['Não','Redução','Isenção'],provider_type:['Formar e treinar brigada','Fornecer brigada profissional'],risk:['Baixo','Médio','Alto'],training_level:['Básico','Intermediário','Avançado'],shift_change:['Não','Sim'],private_brigade:['Não (isento)','Sim'],standard:['NBR','IT CBMPA'],tank_type:['Elevado','Subterrâneo']};
function cleanClientData(type:string,input:unknown,requireComplete:boolean){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const allowed=fieldsByType[type];if(!allowed)return null;
 const raw=input as Record<string,unknown>,clean:Record<string,string>={};
 for(const key of allowed){const value=raw[key];if(value===undefined||value===null)continue;if(typeof value!=='string'||value.length>10000)return null;if(value.trim())clean[key]=value.trim();}
 for(const [key,value] of Object.entries(clean)){
  if(numericFields.has(key)&&(!Number.isFinite(Number(value))||Number(value)<0))return null;
  if(key.endsWith('_email')&&!/^\S+@\S+\.\S+$/.test(value))return null;
  if(selectValues[key]&&!selectValues[key].includes(value))return null;
 }
 if(clean.provider_cnpj&&!/^\d{14}$/.test(clean.provider_cnpj.replace(/\D/g,'')))return null;
 if(clean.estimated_start&&!/^\d{4}-\d{2}-\d{2}$/.test(clean.estimated_start))return null;
 if(requireComplete&&requiredByType[type].some(key=>!clean[key]))return null;
 if(JSON.stringify(clean).length>300000)return null;
 return clean;
}

async function member(request:Request){
 const bearer=request.headers.get('authorization')||'';const jwt=bearer.replace(/^Bearer\s+/i,'');if(!jwt)return null;
 const {data:{user},error}=await db.auth.getUser(jwt);if(error||!user)return null;
 const {data:row}=await db.from('app_members').select('display_name,enabled,sectors').eq('user_id',user.id).maybeSingle();
 if(!row?.enabled||!Array.isArray(row.sectors)||!row.sectors.includes('Subdiretoria'))return null;
 return{id:user.id,name:String(row.display_name||user.email||'Subdiretoria')};
}
async function addEvent(requestId:string,action:string,actor:{id:string,name:string}|null,details:Record<string,unknown>={}){
 await db.from('memorial_events').insert({request_id:requestId,action,actor_id:actor?.id||null,actor_label:actor?.name||'Cliente pelo link',details});
}
async function lookup(token:unknown){
 if(!text(token,40,80))return null;
 const hash=await digest(token.trim());const {data,error}=await db.from('memorial_requests').select(publicFields+',link_hash,link_revoked_at').eq('link_hash',hash).maybeSingle();
 if(error||!data||data.link_revoked_at||new Date(data.link_expires_at).getTime()<=Date.now())return null;
 return data;
}
Deno.serve(async request=>{
 const requestedOrigin=request.headers.get('origin')||siteOrigin;
 let isAllowed=requestedOrigin===siteOrigin||requestedOrigin==='https://dgsci.netlify.app';
 try{const parsed=new URL(requestedOrigin);isAllowed=isAllowed||parsed.hostname==='localhost'||parsed.hostname==='127.0.0.1';}catch{/* Invalid Origin is answered with the configured origin; browser CORS blocks it. */}
 const origin=isAllowed?requestedOrigin:siteOrigin;
 if(request.method==='OPTIONS')return new Response('ok',{headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
 if(request.method!=='POST')return response(405,{message:'Método não permitido.'},origin);
 if(Number(request.headers.get('content-length')||0)>450000)return response(413,{message:'Solicitação muito grande.'},origin);
 let body:Record<string,unknown>;try{body=await request.json();}catch{return response(400,{message:'Solicitação inválida.'},origin);}
 const action=String(body.action||'');
 try{
  if(['public_get','public_save','public_submit'].includes(action)){
   const item=await lookup(body.token);if(!item)return response(404,{message:'Este link expirou ou foi desativado. Peça um novo link à Subdiretoria.'},origin);
   if(action==='public_get'){await addEvent(String(item.id),'opened',null);return response(200,{request:Object.fromEntries(Object.entries(item).filter(([key])=>!['link_hash','link_revoked_at','internal_note'].includes(key)))},origin);}
   if(!['waiting_customer','corrections_requested'].includes(String(item.status)))return response(409,{message:'Este formulário já foi enviado e não está aberto para edição.'},origin);
   const cleanData=cleanClientData(String(item.memorial_type),body.data,action==='public_submit');if(!cleanData)return response(400,{message:action==='public_submit'?'Preencha todos os campos obrigatórios antes de enviar.':'Confira os campos do formulário.'},origin);
   if(action==='public_save'){
    const {data:updated,error}=await db.from('memorial_requests').update({data:cleanData,version:Number(item.version)+1,updated_at:new Date().toISOString()}).eq('id',item.id).eq('version',item.version).in('status',['waiting_customer','corrections_requested']).select('id').maybeSingle();
    if(error)throw error;if(!updated)return response(409,{message:'O formulário foi atualizado em outra sessão. Atualize a página e tente novamente.'},origin);await addEvent(String(item.id),'saved',null,{version:Number(item.version)+1});return response(200,{saved:true},origin);
   }
   const {data:updated,error}=await db.from('memorial_requests').update({data:cleanData,status:'submitted',submitted_at:new Date().toISOString(),return_note:'',version:Number(item.version)+1,updated_at:new Date().toISOString()}).eq('id',item.id).eq('version',item.version).in('status',['waiting_customer','corrections_requested']).select('id').maybeSingle();
   if(error)throw error;if(!updated)return response(409,{message:'O formulário mudou de estado. Atualize a página.'},origin);
   await addEvent(String(item.id),'submitted',null,{version:Number(item.version)+1});return response(200,{submitted:true},origin);
  }

  const actor=await member(request);if(!actor)return response(403,{message:'Acesso restrito à Subdiretoria.'},origin);
  if(action==='list'){
   const {data,error}=await db.from('memorial_requests').select('id,request_number,memorial_type,protocol,company_name,cnpj,contact_name,contact_email,status,internal_note,return_note,link_expires_at,link_revoked_at,version,created_at,updated_at,submitted_at,approved_at,signed_at,signed_by_name,final_pdf_sha256').order('created_at',{ascending:false}).limit(300);
   if(error)throw error;return response(200,{items:data||[]},origin);
  }
  if(action==='create'){
   const memorialType=String(body.memorial_type||''),cnpj=String(body.cnpj||'').replace(/\D/g,'');
   if(!safeTypes.includes(memorialType)||!text(body.company_name,2,180)||cnpj.length!==14||!text(body.contact_email,5,254)||!/^\S+@\S+\.\S+$/.test(String(body.contact_email))||!text(body.protocol||'',0,80))return response(400,{message:'Confira tipo de memorial, empresa, CNPJ, e-mail e protocolo.'},origin);
   const token=newToken(),expires=new Date(Date.now()+14*86400000).toISOString();
   const {data,error}=await db.from('memorial_requests').insert({memorial_type:memorialType,protocol:String(body.protocol||'').trim(),company_name:String(body.company_name).trim(),cnpj,contact_name:String(body.contact_name||'').trim().slice(0,180),contact_email:String(body.contact_email).trim(),link_hash:await digest(token),link_expires_at:expires,created_by:actor.id}).select('id,request_number,memorial_type,protocol,company_name,cnpj,contact_name,contact_email,status,link_expires_at,version,created_at').single();
   if(error)throw error;await addEvent(String(data.id),'created',actor);
   return response(201,{item:data,link:`${siteOrigin}/memorial/preencher/${token}`},origin);
  }
  const id=String(body.id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return response(400,{message:'Solicitação inválida.'},origin);
  const {data:item,error:readError}=await db.from('memorial_requests').select('*').eq('id',id).maybeSingle();if(readError)throw readError;if(!item)return response(404,{message:'Memorial não encontrado.'},origin);
  if(action==='start_review'&&item.status==='submitted'){
   const {data:updated,error}=await db.from('memorial_requests').update({status:'under_review',version:item.version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('version',item.version).eq('status','submitted').select('id').maybeSingle();if(error)throw error;if(!updated)return response(409,{message:'O memorial mudou de estado. Atualize a lista.'},origin);await addEvent(id,'review_started',actor);return response(200,{ok:true},origin);
  }
  if(action==='return_for_corrections'&&item.status==='under_review'&&text(body.note,5,3000)){
   const {data:updated,error}=await db.from('memorial_requests').update({status:'corrections_requested',return_note:String(body.note).trim(),version:item.version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('version',item.version).eq('status','under_review').select('id').maybeSingle();if(error)throw error;if(!updated)return response(409,{message:'O memorial mudou de estado. Atualize a lista.'},origin);await addEvent(id,'returned',actor,{note:String(body.note).trim()});return response(200,{ok:true},origin);
  }
  if(action==='approve'&&item.status==='under_review'){
   const {data:updated,error}=await db.from('memorial_requests').update({status:'approved',approved_at:new Date().toISOString(),version:item.version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('version',item.version).eq('status','under_review').select('id').maybeSingle();if(error)throw error;if(!updated)return response(409,{message:'O memorial mudou de estado. Atualize a lista.'},origin);await addEvent(id,'approved',actor);return response(200,{ok:true},origin);
  }
  if(action==='renew_link'&&!['signed','cancelled'].includes(item.status)){
   const token=newToken(),expires=new Date(Date.now()+14*86400000).toISOString();const {data:updated,error}=await db.from('memorial_requests').update({link_hash:await digest(token),link_expires_at:expires,link_revoked_at:null,version:item.version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('version',item.version).select('id').maybeSingle();if(error)throw error;if(!updated)return response(409,{message:'A solicitação mudou. Atualize a lista.'},origin);await addEvent(id,'link_renewed',actor);return response(200,{link:`${siteOrigin}/memorial/preencher/${token}`,expires_at:expires},origin);
  }
  if(action==='revoke_link'){
   const {data:updated,error}=await db.from('memorial_requests').update({link_revoked_at:new Date().toISOString(),version:item.version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('version',item.version).select('id').maybeSingle();if(error)throw error;if(!updated)return response(409,{message:'A solicitação mudou. Atualize a lista.'},origin);await addEvent(id,'link_revoked',actor);return response(200,{ok:true},origin);
  }
  if(action==='begin_signature'&&item.status==='approved'){
   const safeName=`final/${id}/${crypto.randomUUID()}.pdf`;const {data,error}=await db.storage.from('memorial-final-pdfs').createSignedUploadUrl(safeName,{upsert:false});if(error)throw error;const {data:reserved,error:reserveError}=await db.from('memorial_requests').update({signature_upload_path:safeName,signature_started_by:actor.id,version:item.version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('version',item.version).eq('status','approved').select('id').maybeSingle();if(reserveError)throw reserveError;if(!reserved)return response(409,{message:'O memorial mudou de estado. Atualize e tente novamente.'},origin);await addEvent(id,'signature_upload_started',actor);return response(200,{path:safeName,token:data.token,signed_by_name:actor.name},origin);
  }
  if(action==='finish_signature'&&item.status==='approved'){
   const path=String(body.path||''),hash=String(body.sha256||''),size=Number(body.size);if(path!==item.signature_upload_path||item.signature_started_by!==actor.id)return response(403,{message:'Esta assinatura não foi iniciada por sua sessão.'},origin);if(!/^final\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/.test(path)||!/^[a-f0-9]{64}$/.test(hash)||!Number.isInteger(size)||size<100||size>20971520)return response(400,{message:'PDF final inválido.'},origin);
   const {data:file,error}=await db.storage.from('memorial-final-pdfs').download(path);if(error||!file||file.size!==size)return response(400,{message:'Não consegui verificar o PDF enviado.'},origin);
   const bytes=await file.arrayBuffer();if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return response(400,{message:'O arquivo enviado não parece ser um PDF válido.'},origin);const storedHash=await digestBytes(bytes);if(storedHash!==hash)return response(400,{message:'A integridade do PDF não confere.'},origin);
   const now=new Date().toISOString();const {data:updated,error:updateError}=await db.from('memorial_requests').update({status:'signed',signed_at:now,signed_by:actor.id,signed_by_name:actor.name,signature_upload_path:'',signature_started_by:null,final_pdf_path:path,final_pdf_sha256:hash,link_revoked_at:now,version:item.version+1,updated_at:now}).eq('id',id).eq('version',item.version).eq('status','approved').eq('signature_started_by',actor.id).select('id').maybeSingle();
   if(updateError)throw updateError;if(!updated)return response(409,{message:'O memorial mudou de estado. Atualize e tente novamente.'},origin);await addEvent(id,'signed',actor,{sha256:hash,size});return response(200,{signed:true,signed_at:now,signed_by_name:actor.name},origin);
  }
  if(action==='download_signed'&&item.status==='signed'&&item.final_pdf_path){const {data,error}=await db.storage.from('memorial-final-pdfs').createSignedUrl(item.final_pdf_path,300,{download:`memorial-${item.request_number}.pdf`});if(error)throw error;return response(200,{url:data.signedUrl},origin);}
  if(action==='cancel'&&!['signed','cancelled'].includes(item.status)){const {data:updated,error}=await db.from('memorial_requests').update({status:'cancelled',link_revoked_at:new Date().toISOString(),version:item.version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('version',item.version).select('id').maybeSingle();if(error)throw error;if(!updated)return response(409,{message:'A solicitação mudou. Atualize a lista.'},origin);await addEvent(id,'cancelled',actor);return response(200,{ok:true},origin);}
  return response(409,{message:'Ação incompatível com o estado atual do memorial.'},origin);
 }catch(error){console.error('memorial portal failure',error instanceof Error?error.message:'unexpected');return response(500,{message:'Não foi possível concluir a operação. Tente novamente.'},origin);}
});
