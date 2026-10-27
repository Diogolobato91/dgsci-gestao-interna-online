import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const bundle=await build({entryPoints:['supabase/functions/account-password/handler.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {handlePassword}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function fixture(){const calls={updates:[],finished:[]};return {calls,services:{getUser:async()=>({id:'self'}),prepare:async(operation)=>({data:{request_id:'request',target_id:operation==='change'?'self':'target',target_email:'test@example.invalid'},error:null}),verifyOld:async()=> 'self',update:async(id,password)=>{calls.updates.push({id,password});return true;},finish:async(id,success)=>{calls.finished.push({id,success});return true;}}};}
const request=body=>new Request('https://example.invalid/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const change={action:'change',oldPassword:'old-test-password',newPassword:'new-test-password',confirmPassword:'new-test-password'};
test('alteração exige senha antiga correta e confirmação nova; não aceita identidade diferente',async()=>{
 for(const body of [{...change,confirmPassword:'different'}, {...change,newPassword:'short',confirmPassword:'short'}, {...change,newPassword:change.oldPassword,confirmPassword:change.oldPassword}]){const f=fixture();assert.equal((await handlePassword(request(body),f.services)).status,400);assert.equal(f.calls.updates.length,0);}
 for(const oldResult of [null,'different-user']){const f=fixture();f.services.verifyOld=async()=>oldResult;assert.equal((await handlePassword(request(change),f.services)).status,400);assert.equal(f.calls.updates.length,0);assert.equal(f.calls.finished[0].success,false);}
 const f=fixture();assert.equal((await handlePassword(request(change),f.services)).status,200);assert.deepEqual(f.calls.updates,[{id:'self',password:change.newPassword}]);assert.equal(f.calls.finished[0].success,true);
});
test('reset exige autorização administrativa e usa somente senha definida pelo servidor',async()=>{
 const body={action:'reset',targetId:'target',version:1,email:'test@example.invalid',confirmation:'test@example.invalid',newPassword:'malicious-payload'};
 const f=fixture();assert.equal((await handlePassword(request(body),f.services)).status,200);assert.deepEqual(f.calls.updates,[{id:'target',password:'12345678'}]);
 const denied=fixture();denied.services.prepare=async()=>({data:null,error:{code:'42501'}});assert.equal((await handlePassword(request(body),denied.services)).status,403);assert.equal(denied.calls.updates.length,0);
 const anonymous=fixture();anonymous.services.getUser=async()=>null;assert.equal((await handlePassword(request(body),anonymous.services)).status,401);assert.equal(anonymous.calls.updates.length,0);
 const wrongEmail=fixture();assert.equal((await handlePassword(request({...body,email:'changed@example.invalid',confirmation:'changed@example.invalid'}),wrongEmail.services)).status,409);assert.equal(wrongEmail.calls.updates.length,0);
});
test('falha de atualização não é anunciada como sucesso nem revela senha na resposta',async()=>{
 const f=fixture();f.services.update=async()=>false;const r=await handlePassword(request(change),f.services);assert.equal(r.status,400);assert.equal(f.calls.finished[0].success,false);const text=await r.text();assert.ok(!text.includes(change.newPassword)&&!text.includes(change.oldPassword));
});
