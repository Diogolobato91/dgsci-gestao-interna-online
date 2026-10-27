import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.118.0';
import {handlePassword} from './handler.ts';
Deno.serve(async(req:Request)=>{
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!;
 const authorization=req.headers.get('Authorization')||'';
 const caller=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 return handlePassword(req,{
  getUser:async()=>{if(!authorization.startsWith('Bearer '))return null;const r=await caller.auth.getUser(authorization.slice(7));return r.error?null:r.data.user;},
  prepare:async(operation,target,version)=>caller.rpc('prepare_password_action',{p_operation:operation,p_target:target,p_version:version}),
  verifyOld:async(email,password)=>{const verifier=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const r=await verifier.auth.signInWithPassword({email,password});if(r.error||!r.data.user)return null;const id=r.data.user.id;await verifier.auth.signOut({scope:'local'});return id;},
  update:async(id,password)=>!(await admin.auth.admin.updateUserById(id,{password})).error,
  finish:async(request,success)=>!(await admin.rpc('finish_password_action',{p_request:request,p_success:success})).error,
 });
});
