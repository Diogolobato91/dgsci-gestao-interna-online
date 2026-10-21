import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle=await build({entryPoints:['src/features/records/roster.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {validateTeam,formatContact,cellColors,DUTY_ROLES}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('plantão exige exatamente três militares distintos e exclui VC',()=>{
 const people=[{id:'a',posto_graduacao:'CAP'},{id:'b',posto_graduacao:'SGT'},{id:'c',posto_graduacao:'SD'},{id:'v',posto_graduacao:'VC'}];
 assert.equal(DUTY_ROLES.length,3);assert.equal(validateTeam(['a','b','c'],people),true);
 for(const ids of [['a','b'],['a','a','c'],['a','b','v'],['a','b',''],['a','b','missing']])assert.equal(validateTeam(ids,people),false);
});
test('contatos com DDD e cores da origem preservados sem CSS arbitrário',()=>{
 assert.equal(formatContact('91999991234'),'(91) 99999-1234');assert.equal(formatContact('9133331234'),'(91) 3333-1234');
 assert.equal(formatContact(null),'Contato não informado');
 assert.equal(cellColors({status:'vacation',value:'',bg:'#b6d7a8'}).backgroundColor,'#b6d7a8');
 assert.equal(cellColors({status:'vacation',value:'',bg:'url(evil)'}).backgroundColor,'#b6d7a8');
});
