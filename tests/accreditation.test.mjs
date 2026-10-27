import test from'node:test';import assert from'node:assert/strict';import{build}from'esbuild';
const b=await build({entryPoints:['src/features/accreditation/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {modalityCounts,filterAccreditations,canManageAccreditations,divergentRecords}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const rows=[{kind:'company',modality:'Instalação',name:'Empresa A',valid_until:'2026-10-27'},{kind:'company',modality:'Manutenção',name:'Empresa B',valid_until:'2026-10-26'},{kind:'professional',modality:'Instalação',name:'Profissional C',valid_until:'2027-01-01'}];
test('credenciamento separa empresas/profissionais e considera validade inclusiva',()=>{
 const selected=filterAccreditations(rows,'company','','','valid','2026-10-27');assert.equal(selected.length,1);assert.equal(selected[0].name,'Empresa A');
 assert.equal(filterAccreditations(rows,'professional','profissional','Instalação','valid','2026-10-27').length,1);
 assert.equal(filterAccreditations(rows,'company','','','expired','2026-10-27').length,1);
 assert.deepEqual(modalityCounts(selected),[{name:'Instalação',total:1}]);
});
test('somente credenciamento e superadmin editam; novo perfil não concede outros privilégios',()=>{
 for(const sector of ['Secretaria','Diretoria','Subdiretoria','Vistoriador','Análise','Multas'])assert.equal(canManageAccreditations({allowedProfiles:[sector],role:'editor'}),false);
 assert.equal(canManageAccreditations({allowedProfiles:['Credenciamento'],role:'editor'}),true);
 assert.equal(canManageAccreditations({allowedProfiles:['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'],role:'administrator'}),true);
 assert.equal(canManageAccreditations(null),false);
});

test('divergências mantêm protocolos distintos separados e sinalizam somente versões da mesma identidade',()=>{
 const base={kind:'professional',modality:'Modalidade',name:'Pessoa teste',protocol:'PROTOCOLO',contact:'Contato',region:'Região',valid_until:'2099-01-01'};
 const ids=divergentRecords([{...base,id:'a'},{...base,id:'b',valid_until:'2099-02-01'},{...base,id:'c',protocol:'OUTRO'},{...base,id:'d',kind:'company'}]);
 assert.deepEqual([...ids],['a','b']);
});
