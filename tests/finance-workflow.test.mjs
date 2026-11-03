import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const r=await build({entryPoints:['src/features/records/financialWorkflow.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {inServiceRange,scopedBalance,normalizeWorkflow,financialCompleteness,financialStatus}=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
test('saldo exige referência e considera somente competência e unidade correspondentes',()=>{
 const rows=[{category:'sat',competencia:'2026-10-01',unidade:'CAT',valorDespesa:50.25,valorArrecadado:100,status:'Pago'},
 {category:'sat',competencia:'2026-10-01',unidade:'CAT',valorDespesa:999,valorArrecadado:0,status:'Cancelado'},
 {category:'sat',competencia:'2026-11-01',unidade:'CAT',valorDespesa:999,valorArrecadado:0},
 {category:'sat',competencia:'2026-10-01',unidade:'OUTRA',valorDespesa:999,valorArrecadado:0}];
 assert.equal(scopedBalance(rows,undefined),null);assert.equal(scopedBalance(rows,{competencia:'2026-10-01',unidade:' cat ',saldo_inicial:1000}),949.75);
 assert.equal(scopedBalance([{...rows[0],valorArrecadado:null}],{competencia:'2026-10-01',unidade:'CAT',saldo_inicial:1000}),949.75);
});
test('situações herdadas são interpretadas sem inventar autorização ou pagamento',()=>{
 assert.equal(normalizeWorkflow('DIARIA PAGA'),'pago');assert.equal(normalizeWorkflow('AUTORIZADO'),'autorizado');
 assert.equal(normalizeWorkflow('CANCELADO/ARQUIVADO'),'cancelado');assert.equal(normalizeWorkflow('GAB CMDO'),'aguardando');
 assert.equal(normalizeWorkflow(undefined),'aguardando');
});

test('painel distingue valores ausentes de zero e ignora ausências de cancelados',()=>{
 const rows=[{valorDespesa:null,valorArrecadado:0,workflowStatus:'aguardando'}, {valorDespesa:0,valorArrecadado:null,workflowStatus:'pago'}, {valorDespesa:null,valorArrecadado:null,workflowStatus:'cancelado'}];
 assert.deepEqual(financialCompleteness(rows),{active:2,cancelled:1,missingExpense:1,missingRevenue:1});
 assert.deepEqual(financialCompleteness([]),{active:0,cancelled:0,missingExpense:0,missingRevenue:0});
 assert.equal(financialStatus({workflowStatus:'cancelado',status:'Pago'}),'Cancelado');
});

test('saldo geral do mês inclui SATs e DGSCI, exclui cancelados e outras competências',()=>{
 const budget={competencia:'2026-07-01',unidade:'GERAL',saldo_inicial:600000};
 const rows=[{category:'sat',unidade:'1º GBM',competencia:'2026-07-01',valorDespesa:1000,valorArrecadado:200,workflowStatus:'autorizado'}, {category:'dgsci',unidade:'DGSCI',competencia:'2026-07-01',valorDespesa:500,valorArrecadado:100,workflowStatus:'pago'}, {category:'sat',unidade:'2º GBM',competencia:'2026-07-01',valorDespesa:800,valorArrecadado:0,workflowStatus:'aguardando'}, {category:'dgsci',competencia:'2026-07-01',valorDespesa:9000,valorArrecadado:0,workflowStatus:'cancelado'}, {category:'sat',competencia:'2026-08-01',valorDespesa:9000,valorArrecadado:0,workflowStatus:'pago'}];
 assert.equal(scopedBalance(rows,budget),597700);
 assert.equal(scopedBalance([...rows,{category:'dgsci',competencia:'2026-07-01',valorDespesa:null,valorArrecadado:0}],budget),null);
 assert.equal(scopedBalance([],budget),600000);
});

test('intervalo inclusivo usa início do serviço uma vez, atravessa meses e anos sem ratear',()=>{
 const rows=[{dataInicio:'2026-12-31',dataFim:'2027-01-03',valorDespesa:120,valorArrecadado:0,category:'sat'}, {dataInicio:'2027-01-02',dataFim:'2027-01-02',valorDespesa:0,valorArrecadado:200,category:'dgsci'}, {dataInicio:'2027-01-03',dataFim:'2027-01-04',valorDespesa:999,valorArrecadado:0}, {dataInicio:'2027-01-01',valorDespesa:null,valorArrecadado:null,workflowStatus:'cancelado'}];
 const budget={data_inicio:'2026-12-31',data_fim:'2027-01-02',unidade:'GERAL',saldo_inicial:1000};
 assert.equal(scopedBalance(rows,budget),880);
 assert.equal(inServiceRange(rows[0],'2027-01-01','2027-01-31'),false);
 assert.equal(inServiceRange({},'2027-01-01','2027-01-31'),false);
 assert.equal(inServiceRange({},'',''),true);
 assert.equal(scopedBalance([...rows,{valorDespesa:0,valorArrecadado:0}],budget),null);
 assert.equal(scopedBalance([{...rows[0],valorArrecadado:null}],budget),880);
 assert.equal(scopedBalance([],budget),1000);
});

test('saldo anual inclui SAT e DGSCI ao longo do exercício e exclui outros anos',()=>{
 const budget={data_inicio:'2026-01-01',data_fim:'2026-12-31',unidade:'GERAL',saldo_inicial:1000};
 const rows=[{dataInicio:'2026-01-01',category:'sat',valorDespesa:100,valorArrecadado:0}, {dataInicio:'2026-12-31',category:'dgsci',valorDespesa:50,valorArrecadado:200}, {dataInicio:'2027-01-01',valorDespesa:999,valorArrecadado:0}, {dataInicio:'2026-07-01',workflowStatus:'cancelado',valorDespesa:999,valorArrecadado:0}];
 assert.equal(scopedBalance(rows,budget),850);
});
