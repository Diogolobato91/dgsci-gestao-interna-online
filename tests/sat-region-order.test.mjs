import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=await build({entryPoints:[root+'src/features/records/satRegionOrder.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {compareSatRegions,unitOrder}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
test('CAT precede unidades em ordem numérica, sem ordenar 10 antes de 2',()=>{
 const rows=['10ºGBM','2º GBM','CAT','1ºGBM','1ºGPA','29ºGBM'].map(gbm=>({gbm,sat:gbm})).sort(compareSatRegions);
 assert.equal(rows[0].gbm,'CAT');
 assert(rows.findIndex(r=>r.gbm==='2º GBM')<rows.findIndex(r=>r.gbm==='10ºGBM'));
 assert.equal(unitOrder('1ºGPA'),1);assert.equal(unitOrder('CAT'),-1);
 assert(unitOrder('Outro')>unitOrder('29º GBM'));
});
