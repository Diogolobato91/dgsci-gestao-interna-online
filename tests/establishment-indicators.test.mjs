import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('indicadores dos estabelecimentos particionam os registros e respeitam o grupo sem somar vistorias como empresas',()=>{
 const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('public/arquivo/js/data-store.js','utf8'),context);const store=context.window.dataStore;
 store.setData({companies:[{grupo:'A',normalizedStatus:'REGULAR'},{grupo:'A',normalizedStatus:'VENCIDO'},{grupo:'B',normalizedStatus:'SEM_SISGAT'},{grupo:'B',normalizedStatus:'DESATIVADO'},{grupo:'B',normalizedStatus:'DESCONHECIDO'}],vistorias:[{normalizedParecer:'APROVADO',vistoriador:'Teste'}]});
 const all=store.getKPIs();assert.equal(all.total,5);assert.equal(all.regular+all.vencidos+all.parados+all.desativados,all.total);assert.equal(all.totalVistorias,1);
 const group=store.getKPIs('A');assert.equal(group.total,2);assert.equal(group.regular,1);assert.equal(group.vencidos,1);assert.equal(group.parados,0);
 const empty=store.getKPIs('VAZIO');assert.equal(empty.total,0);assert.equal(empty.regularPct,0);assert.equal(empty.vencidosPct,0);
});
