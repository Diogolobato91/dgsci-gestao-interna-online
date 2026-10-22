import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['src/features/records/rosterExport.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {rosterExportPeriod,daysOfPeriod}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('PDF semanal respeita segunda a domingo e atravessa mês/ano sem mudar o dia',()=>{
 assert.deepEqual(rosterExportPeriod('2026-10-22','2026-10','week'),{start:'2026-10-19',end:'2026-10-25'});
 assert.deepEqual(rosterExportPeriod('2027-01-01','2027-01','week'),{start:'2026-12-28',end:'2027-01-03'});
 assert.deepEqual(rosterExportPeriod('2026-10-25','2026-10','week'),{start:'2026-10-19',end:'2026-10-25'});
});
test('PDF diário e mensal preserva a seleção e inclui dias sem cadastro',()=>{
 assert.deepEqual(rosterExportPeriod('2026-10-22','2026-10','day'),{start:'2026-10-22',end:'2026-10-22'});
 assert.deepEqual(rosterExportPeriod('2028-02-01','2028-02','month'),{start:'2028-02-01',end:'2028-02-29'});
 assert.equal(daysOfPeriod('2028-02-01','2028-02-29').length,29);
 assert.deepEqual(daysOfPeriod('2026-12-30','2027-01-02'),['2026-12-30','2026-12-31','2027-01-01','2027-01-02']);
});
