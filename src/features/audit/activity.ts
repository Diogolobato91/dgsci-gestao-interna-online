import { supabase } from '@/lib/supabase';
export async function logActivity(action:'session_open'|'session_close'|'page_view'|'download_request',resource='portal',reference:string|null=null){
 if(!supabase)return;
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([supabase.rpc('log_portal_activity',{p_action:action,p_resource:resource,p_reference:reference?.slice(0,250)??null}),new Promise(resolve=>{timer=setTimeout(resolve,2000);})]);}catch{/* Falhas de telemetria não bloqueiam a operação; alterações seguem auditadas no banco. */}finally{clearTimeout(timer);}
}
