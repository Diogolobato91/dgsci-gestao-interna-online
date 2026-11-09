import test from'node:test';import assert from'node:assert/strict';import {build}from'esbuild';
const b=await build({entryPoints:['src/features/accreditation/googleSheet.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {gvizToAccreditations}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
test('planilha pública reconhece cabeçalhos, datas brasileiras e mantém somente registros completos',()=>{
 const payload={table:{cols:[{label:'A'},{label:'B'},{label:'C'},{label:'D'},{label:'E'},{label:'F'}],rows:[
  {c:[{v:'Modalidade (relação geral)'},{v:'Empresas e Profissionais'},{v:'Contato'},{v:'Região'},{v:'Protocolo'},{v:'Validade'}]},
  {c:[{v:'Instalação'},{v:'Empresa Alfa'},{v:'91999999999'},{v:'Belém'},{v:'P-1'},{f:'31/12/2027'}]},
  {c:[{v:'Instalação'},{v:'Sem data'},{v:'91'},{v:'Belém'},{v:'P-2'},{v:''}]},
 ]}};
 const rows=gvizToAccreditations(payload,'company','2026-11-05T12:00:00Z');assert.equal(rows.length,1);assert.deepEqual(rows[0],{id:rows[0].id,kind:'company',modality:'Instalação',name:'Empresa Alfa',contact:'91999999999',region:'Belém',protocol:'P-1',valid_until:'2027-12-31',version:1,updated_at:'2026-11-05T12:00:00Z',updated_by_name:'Planilha oficial'});
});
test('planilha aceita resposta GViz que entrega data como Date e cabeçalhos nas colunas',()=>{
 const payload={table:{cols:[{label:'Modalidade'},{label:'Profissional'},{label:'Validade'}],rows:[{c:[{v:'Projetos'},{v:'Maria Lima'},{v:'Date(2027,0,5)'}]}]}};
 const rows=gvizToAccreditations(payload,'professional','2026-11-05T12:00:00Z');assert.equal(rows[0].valid_until,'2027-01-05');assert.equal(rows[0].name,'Maria Lima');
});
test('planilha oficial aceita cabeçalhos de protocolo e validade omitidos pelo GViz',()=>{
 const payload={table:{cols:[
  {label:'',type:'string'},{label:'',type:'string'},{label:'',type:'string'},{label:'',type:'string'},{label:'',type:'string'},{label:'',type:'number'},{label:'',type:'date'},
 ],rows:[
  {c:[null,{v:'ATUALIZAÇÃO: 09/11/26'},null,null,null,null,{v:null}]},
  {c:[{v:'CNPJ/CPF'},{v:'Modalidade (relação geral)'},{v:'Empresas e Profissionais'},{v:'Contato'},{v:'Região'},null,{v:null}]},
  {c:[{v:'00.000.000/0001-00'},{v:'Empresa de Formação de Brigada Básica'},{v:'Empresa Exemplo'},{v:'(91) 99999-9999'},{v:'BELÉM - PA'},{v:997608,f:'997608'},{v:'Date(2027,1,21)',f:'21/02/2027'}]},
 ]}};
 const rows=gvizToAccreditations(payload,'company','2026-11-09T12:00:00Z');
 assert.equal(rows.length,1);assert.equal(rows[0].protocol,'997608');assert.equal(rows[0].valid_until,'2027-02-21');assert.equal(rows[0].name,'Empresa Exemplo');
});
