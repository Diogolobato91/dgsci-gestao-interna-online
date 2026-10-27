import test from 'node:test';import assert from 'node:assert/strict';import {build}from'esbuild';import fs from'node:fs/promises';
const filename=new URL('../node_modules/.sat-regions-pdf-test.mjs',import.meta.url);
const bundle=await build({entryPoints:['src/features/records/satRegionsPdf.ts'],bundle:true,platform:'node',format:'esm',packages:'external',write:false});
await fs.writeFile(filename,bundle.outputFiles[0].text);const {buildSatRegionsPdf}=await import(filename.href);await fs.unlink(filename);
const logo=await fs.readFile(new URL('../public/portal/assets/dgsci-logo.png',import.meta.url));
test('exportação compacta inclui 34 unidades, CRB e RISP em uma página A4',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new Uint8Array(logo).buffer});
 try{
  const rows=Array.from({length:34},(_,i)=>({gbm:i?`${i+1}ºGBM`:'DGSCI',sat:`SAT TESTE ${i}`,crb:'CRB II',risp:'3º RISP',municipios:'Município Alfa, Município Beta, Município Gama, Bairro Central.'}));
  const pdf=await buildSatRegionsPdf(rows,new Date('2026-10-27T12:00:00Z'));
  assert.equal(pdf.getNumberOfPages(),1);assert.ok(Math.abs(pdf.internal.pageSize.getWidth()-210)<.1);assert.ok(Math.abs(pdf.internal.pageSize.getHeight()-297)<.1);
  assert.ok(pdf.output().includes('CRB II'));assert.ok(pdf.output().includes('SAT TESTE 33'));
  const extensive=await buildSatRegionsPdf(Array.from({length:60},(_,i)=>({...rows[i%34],gbm:`${i+1}ºGBM`,municipios:'Extensive coverage information '.repeat(80)+(i===59?' LAST-COVERAGE-END':'')})));
  assert.ok(extensive.getNumberOfPages()>1);assert.ok(extensive.output().includes('LAST-COVERAGE-END'));
 }finally{globalThis.fetch=previous;}
});
