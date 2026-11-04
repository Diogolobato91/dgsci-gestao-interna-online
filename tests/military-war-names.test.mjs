import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const r=await build({entryPoints:['src/features/records/roster.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {dutyPersonLabel,searchDutyPeople}=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
test('plantão usa graduação e nome de guerra; preserva identificação de legados',()=>{
 assert.equal(dutyPersonLabel({nome:'João Teixeira',nome_guerra:'Teixeira',posto_graduacao:'2º SGT'}),'2ºSGT TEIXEIRA');
 assert.equal(dutyPersonLabel({nome:'João Silva',posto_graduacao:'CAP'}),'CAP JOÃO SILVA');
});
test('busca aceita nome completo, nome de guerra e acentos sem mudar IDs ou incluir homônimos indevidos',()=>{
 const people=[{id:'a',nome:'João da Silva',nome_guerra:'TEIXEIRA',posto_graduacao:'2º SGT'},{id:'b',nome:'Maria Alves',nome_guerra:'ALVES',posto_graduacao:'CAP'}];
 assert.deepEqual(searchDutyPeople(people,'joao').map(p=>p.id),['a']);
 assert.deepEqual(searchDutyPeople(people,'teixeira').map(p=>p.id),['a']);
 assert.deepEqual(searchDutyPeople(people,'CAP alves').map(p=>p.id),['b']);
 assert.deepEqual(searchDutyPeople(people,'inexistente'),[]);
});
