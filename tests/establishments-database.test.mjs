import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {build} from 'esbuild';
test('leitura encontra cabeçalho real e colunas variáveis sem usar observação como pavimento',()=>{
 const c={window:{},console};vm.createContext(c);vm.runInContext(fs.readFileSync('public/arquivo/js/sheets-sync.js','utf8'),c);const m=c.window.sheetsSyncManager;
 const rows=[['','','NÃO FOI LOCALIZADO O CNPJ'],['PASTA Nº','EMPRESA: RAZÃO SOCIAL','CNPJ','ENDEREÇO','ÁREA CONSTRUÍDA (m²)','NÚMERO DE PAVIMENTOS','CARGA INCÊNDIO (MJ/M²)','RISCO','SITUAÇÃO','OBSERVAÇÃO'],['1','Empresa Teste','00000000000191','Rua Teste, 10','125.5 m²','2','400','MÉDIO','CERTIFICADO EMITIDO','Observação teste'],['2','','','','','','','','','']];
 const result=m.parseCompanyRows(rows,{name:'C1',division:'C-1',group:'C'});assert.equal(result.length,1);assert.equal(result[0].pavimentos,'2');assert.equal(result[0].cargaIncendio,400);assert.equal(result[0].situacao,'CERTIFICADO EMITIDO');assert.equal(m.resolveColumns(['PASTA','RAZAO SOCIAL','CNPJ']).lotacao,-1);
});
test('portal recebe banco somente do pai da mesma origem e nunca consulta planilha ou cache',async()=>{
 const posts=[],stored=[],removed=[];let message;
 const parent={postMessage(value){posts.push(value);}};
 const ctx={window:{parent,dataStore:{subscribe(){},setData(data){stored.push(data);}}},parent,location:{search:'?embedded=1&database=1',origin:'https://portal.test'},URLSearchParams,console,document:{addEventListener(){},getElementById(){return {classList:{add(){}}};}},localStorage:{removeItem(k){removed.push(k);},getItem(){throw Error('Cache não permitido');}},addEventListener(type,fn){if(type==='message')message=fn;}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/arquivo/js/app.js','utf8')+'\nwindow.DashboardApp=DashboardApp;',ctx);
 const P=ctx.window.DashboardApp.prototype;for(const method of ['setupEventListeners','setupThemeToggle','updateUI'])P[method]=()=>{};P.setupDropzone=()=>{throw Error('Upload local não permitido');};P.setupAutoSync=()=>{throw Error('Sincronização Google não permitida');};P.loadFromCache=()=>{throw Error('Cache legado não permitido');};
 const app=new ctx.window.DashboardApp();assert.equal(posts[0].type,'dgsci:database-ready');
 const payload={companies:[{id:'1',razao:'Empresa de teste'}],timestamp:'2026-10-28T12:00:00Z'};
 message({source:{},origin:'https://portal.test',data:{type:'dgsci:database-data',payload}});message({source:parent,origin:'https://outro.test',data:{type:'dgsci:database-data',payload}});assert.equal(stored.length,0);
 message({source:parent,origin:'https://portal.test',data:{type:'dgsci:database-data',payload,canEdit:true}});await app.initialSync;assert.equal(stored.length,1);assert.equal(app.canEditEstablishments,true);assert.equal(removed[0],'dgsci_data_cache');
 await app.syncLiveSheet(true);assert.equal(posts.at(-1).type,'dgsci:database-refresh');
});
const b=await build({stdin:{contents:"export * from './src/features/establishments/model'",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {blankEstablishment,establishmentPayload}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
test('edição preserva ausências e dados anteriores, elimina metadados e acompanha divisão',()=>{
 assert.equal(blankEstablishment().cargaIncendio,null);
 const result=establishmentPayload({...blankEstablishment(),id:'test',version:4,updated_by_name:'Forjado',updated_at:'fake',divisao:'C-1',razao:'  Empresa Teste  ',pasta:'001',observacao:'Texto preservado'});
 assert.equal(result.id,undefined);assert.equal(result.version,undefined);assert.equal(result.updated_by_name,undefined);assert.equal(result.razao,'Empresa Teste');assert.equal(result.grupo,'C');assert.equal(result.itemNum,'001');assert.equal(result.cargaDisplay,'Não informada');assert.equal(result.observacao,'Texto preservado');assert.throws(()=>establishmentPayload({...result,divisao:'X-99'}));
});
