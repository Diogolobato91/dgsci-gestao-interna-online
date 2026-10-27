import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

test('voltar à aba e renovar token preserva a tela, mas saída, troca de conta e bloqueio continuam válidos',async()=>{
 const previous={window:globalThis.window,document:globalThis.document};
 const slots=[],effects=[],loadingWrites=[],listeners={};let cursor=0,authCallback;
 let member={display_name:'Teste',role:'reader',sectors:['Secretaria'],enabled:true},failure=false;
 let session={user:{id:'account-a',email:'teste@example.invalid'}};
 const hooks={
  createContext:()=>({Provider:()=>null}),useContext:()=>null,
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;if(i===1)loadingWrites.push(slots[i]);}];},
  useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
  useEffect(fn){const i=cursor++;if(!(i in slots)){slots[i]=true;effects.push(fn);}},
 };
 globalThis.__sessionHooks=hooks;
 globalThis.window={setInterval:()=>1,clearInterval:()=>{},addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:()=>{}};
 globalThis.document={visibilityState:'visible',addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:()=>{}};
 globalThis.__sessionDb={
  from:()=>({select(){return this;},eq(){return this;},async maybeSingle(){return {data:failure?null:member,error:failure?{code:'NETWORK'}:null};}}),
  rpc:async()=>({data:{status:'blocked'},error:null}),
  auth:{onAuthStateChange:fn=>{authCallback=fn;return {data:{subscription:{unsubscribe(){}}}};},getSession:async()=>({data:{session}}),signOut:async()=>({error:null})},
 };
 try{
  const bundle=await build({entryPoints:['src/contexts/AuthContext.tsx'],bundle:true,platform:'node',format:'esm',write:false,jsx:'automatic',plugins:[{name:'provider-boundaries',setup(b){
   b.onResolve({filter:/^react\/jsx-runtime$/},()=>({path:'jsx',namespace:'jsx-fixture'}));
   b.onLoad({filter:/.*/,namespace:'jsx-fixture'},()=>({contents:'export const jsx=(type,props)=>({type,props});export const jsxs=jsx;',loader:'js'}));
   b.onResolve({filter:/^react$/},()=>({path:'react-hooks',namespace:'fixture'}));
   b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const {createContext,useContext,useState,useRef,useEffect}=globalThis.__sessionHooks;',loader:'js'}));
   b.onLoad({filter:/\/lib\/supabase\.ts$/},()=>({contents:'export const supabase=globalThis.__sessionDb;',loader:'js'}));
  }}]});
  const {AuthProvider}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const render=()=>{cursor=0;return AuthProvider({children:'editor em andamento'}).props.value;};
  assert.equal(render().loading,true);const cleanups=effects.map(fn=>fn());
  const emit=async(event,current=session)=>{authCallback(event,current);await new Promise(resolve=>setTimeout(resolve,10));return render();};
  let state=await emit('INITIAL_SESSION');assert.equal(state.loading,false);assert.equal(state.user.id,'account-a');
  const originalUser=state.user;
  for(const event of ['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED']){
   loadingWrites.length=0;state=await emit(event);assert.equal(loadingWrites.includes(true),false,event+' desmontou a tela');assert.equal(state.user,originalUser);
  }
  loadingWrites.length=0;listeners.focus();listeners.visibilitychange();await new Promise(resolve=>setTimeout(resolve,10));assert.equal(render().user,originalUser);assert.equal(loadingWrites.includes(true),false);
  failure=true;loadingWrites.length=0;state=await emit('SIGNED_IN');assert.equal(state.user,originalUser);assert.equal(loadingWrites.includes(true),false);failure=false;
  member={...member,enabled:false};state=await emit('TOKEN_REFRESHED');assert.equal(state.user.registrationStatus,'blocked');assert.deepEqual(state.user.allowedProfiles,[]);
  state=await emit('SIGNED_OUT',null);assert.equal(state.user,null);
  member={...member,enabled:true};session={user:{id:'account-b',email:'outro@example.invalid'}};loadingWrites.length=0;state=await emit('SIGNED_IN');assert.equal(state.user.id,'account-b');assert.equal(loadingWrites.includes(true),true);
  for(const cleanup of cleanups)cleanup?.();
 }finally{
  globalThis.window=previous.window;globalThis.document=previous.document;delete globalThis.__sessionHooks;delete globalThis.__sessionDb;
 }
});
