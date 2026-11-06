import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {handleSupportChat,sha256,type ConversationInput,type OpenTicketInput} from './handler.ts';

const configuredOrigin=Deno.env.get('PUBLIC_SITE_ORIGIN')||'https://dgsci.netlify.app';
function requestOrigin(request:Request){const origin=request.headers.get('origin')||configuredOrigin;if(origin===configuredOrigin||origin==='https://dgsci.netlify.app'||/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin))return origin;return configuredOrigin;}
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

Deno.serve(async request=>handleSupportChat(request,{
 allow:async(scope,req)=>{
  const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
  const fingerprint=await sha256(`${scope}:${forwarded}:${req.headers.get('user-agent')||'unknown'}`);
  const limits={open:[5,600],conversation:[120,600],message:[30,600]}as const;
  const {data,error}=await supabase.rpc('consume_support_rate_limit',{p_scope:scope,p_key_hash:fingerprint,p_limit:limits[scope][0],p_window_seconds:limits[scope][1]});
  return !error&&data===true;
 },
 open:async(input:OpenTicketInput,accessHash:string)=>{const {data,error}=await supabase.rpc('create_support_ticket',{p_service:input.service,p_cnpj:input.cnpj,p_requester:input.requester,p_phone:input.phone,p_email:input.email,p_city:input.city,p_reference:input.reference||'',p_summary:input.summary,p_access_hash:accessHash});if(error)throw error;return data;},
 conversation:async(input:ConversationInput,accessHash:string)=>{const {data,error}=await supabase.rpc('get_support_conversation_public',{p_protocol:input.protocol,p_cnpj:input.cnpj,p_access_hash:accessHash});if(error)throw error;return data;},
 message:async(input:ConversationInput&{message:string},accessHash:string)=>{const {data,error}=await supabase.rpc('append_support_customer_message',{p_protocol:input.protocol,p_cnpj:input.cnpj,p_access_hash:accessHash,p_body:input.message});if(error)throw error;return data;},
},requestOrigin(request)));
