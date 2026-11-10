import {createClient} from 'npm:@supabase/supabase-js@2';
import {handleSupportChat,sha256,type ConversationInput,type OpenTicketInput} from './handler.ts';

const configuredOrigin=Deno.env.get('PUBLIC_SITE_ORIGIN')||'https://dgsci.netlify.app';
function requestOrigin(request:Request){const origin=request.headers.get('origin')||configuredOrigin;if(origin===configuredOrigin||origin==='https://dgsci.netlify.app'||/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin))return origin;return configuredOrigin;}
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

const startsWith=(bytes:Uint8Array,expected:number[],offset=0)=>expected.every((value,index)=>bytes[offset+index]===value);
async function validStoredAttachment(path:string,mimeType:string,expectedSize:number){
 const {data,error}=await supabase.storage.from('support-attachments').download(path);
 if(error||!data||data.size!==expectedSize)return false;
 const bytes=new Uint8Array(await data.slice(0,Math.min(data.size,8192)).arrayBuffer());
 if(mimeType==='application/pdf'){
  if(!startsWith(bytes,[0x25,0x50,0x44,0x46,0x2d]))return false;
  return !/\/(JavaScript|JS|Launch|EmbeddedFile)\b/i.test(new TextDecoder('latin1').decode(bytes));
 }
 if(mimeType==='image/png')return startsWith(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
 if(mimeType==='image/jpeg')return startsWith(bytes,[0xff,0xd8,0xff]);
 return mimeType==='image/webp'&&startsWith(bytes,[0x52,0x49,0x46,0x46])&&startsWith(bytes,[0x57,0x45,0x42,0x50],8);
}

Deno.serve(async request=>handleSupportChat(request,{
 allow:async(scope,req)=>{
  const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
  const fingerprint=await sha256(`${scope}:${forwarded}:${req.headers.get('user-agent')||'unknown'}`);
  const limits={open:[5,600],conversation:[120,600],message:[30,600]}as const;
  const {data,error}=await supabase.rpc('consume_support_rate_limit',{p_scope:scope,p_key_hash:fingerprint,p_limit:limits[scope][0],p_window_seconds:limits[scope][1]});
  return !error&&data===true;
 },
 open:async(input:OpenTicketInput,accessHash:string)=>{const {data,error}=await supabase.rpc('create_support_ticket',{p_service:input.service,p_cnpj:input.cnpj,p_requester:input.requester,p_phone:input.phone||'',p_email:input.email||'',p_city:input.city,p_reference:input.reference||'',p_summary:input.summary,p_access_hash:accessHash});if(error)throw error;return data;},
 conversation:async(input:ConversationInput&{before?:string},accessHash:string)=>{const {data,error}=await supabase.rpc('get_support_conversation_page_public',{p_protocol:input.protocol,p_cnpj:input.cnpj,p_access_hash:accessHash,p_before:input.before||null,p_limit:10});if(error)throw error;if(!data)return null;const conversation=data as Record<string,unknown>&{ticket_id?:string;messages?:Array<Record<string,unknown>>};const ticketId=conversation.ticket_id;const attachments:Array<Record<string,unknown>>=[];if(ticketId){const {data:rows}=await supabase.from('support_attachments').select('id,file_name,file_path,mime_type,size_bytes,created_at').eq('ticket_id',ticketId).order('created_at');for(const row of rows||[]){const {data:signed}=await supabase.storage.from('support-attachments').createSignedUrl(row.file_path,3600);attachments.push({...row,url:signed?.signedUrl||null});}}const attachmentById=new Map(attachments.map(item=>[String(item.id),item]));return{...conversation,messages:(conversation.messages||[]).map(message=>({...message,attachment:typeof message.attachment_id==='string'?attachmentById.get(message.attachment_id)||null:null})),attachments};},
 message:async(input:ConversationInput&{message:string},accessHash:string)=>{const {data,error}=await supabase.rpc('append_support_customer_message',{p_protocol:input.protocol,p_cnpj:input.cnpj,p_access_hash:accessHash,p_body:input.message});if(error)throw error;return data;},
 satisfaction:async(input:ConversationInput&{score:number;comment:string},accessHash:string)=>{const {data,error}=await supabase.rpc('submit_support_satisfaction',{p_protocol:input.protocol,p_cnpj:input.cnpj,p_access_hash:accessHash,p_score:input.score,p_comment:input.comment});if(error)throw error;return data===true;},
 prepareAttachment:async(input,accessHash)=>{const {data:ticketId,error}=await supabase.rpc('prepare_support_attachment_public',{p_protocol:input.protocol,p_cnpj:input.cnpj,p_access_hash:accessHash});if(error)throw error;if(!ticketId)return null;const safe=input.fileName.replace(/[^a-zA-Z0-9._-]/g,'_'),path=`${ticketId}/${crypto.randomUUID()}-${safe}`;const {data,error:signError}=await supabase.storage.from('support-attachments').createSignedUploadUrl(path);if(signError)throw signError;return{path,token:data.token};},
 registerAttachment:async(input,accessHash)=>{if(!await validStoredAttachment(input.filePath,input.mimeType,input.size)){await supabase.storage.from('support-attachments').remove([input.filePath]);throw Object.assign(new Error('O arquivo enviado não passou pela validação de segurança.'),{code:'22023'});}const {data,error}=await supabase.rpc('register_support_attachment_public',{p_protocol:input.protocol,p_cnpj:input.cnpj,p_access_hash:accessHash,p_file_name:input.fileName,p_file_path:input.filePath,p_mime_type:input.mimeType,p_size:input.size});if(error)throw error;return data;},
},requestOrigin(request)));
