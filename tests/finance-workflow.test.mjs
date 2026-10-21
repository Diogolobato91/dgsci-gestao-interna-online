import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const r=await build({entryPoints:['src/features/records/financialWorkflow.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {scopedBalance,normalizeWorkflow}=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
test('saldo exige referência e considera somente competência e unidade correspondentes',()=>{
 const rows=[{category:'sat',competencia:'2026-10-01',unidade:'CAT',valorDespesa:50.25,valorArrecadado:100,status:'Pago'},
 {category:'sat',competencia:'2026-10-01',unidade:'CAT',valorDespesa:999,valorArrecadado:0,status:'Cancelado'},
 {category:'sat',competencia:'2026-11-01',unidade:'CAT',valorDespesa:999,valorArrecadado:0},
 {category:'sat',competencia:'2026-10-01',unidade:'OUTRA',valorDespesa:999,valorArrecadado:0}];
 assert.equal(scopedBalance(rows,undefined),null);assert.equal(scopedBalance(rows,{competencia:'2026-10-01',unidade:' cat ',saldo_inicial:1000}),1049.75);
 assert.equal(scopedBalance([{...rows[0],valorArrecadado:null}],{competencia:'2026-10-01',unidade:'CAT',saldo_inicial:1000}),null);
});
test('situações herdadas são interpretadas sem inventar autorização ou pagamento',()=>{
 assert.equal(normalizeWorkflow('DIARIA PAGA'),'pago');assert.equal(normalizeWorkflow('AUTORIZADO'),'autorizado');
 assert.equal(normalizeWorkflow('CANCELADO/ARQUIVADO'),'cancelado');assert.equal(normalizeWorkflow('GAB CMDO'),'aguardando');
 assert.equal(normalizeWorkflow(undefined),'aguardando');
});
