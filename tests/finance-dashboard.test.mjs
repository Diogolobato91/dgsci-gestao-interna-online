import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const result=await build({stdin:{contents:`export {financialTotals} from './src/features/records/FinancialDashboard';`,resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,packages:'external'});
// Keep package resolution relative to this repository for the React/chart imports.
const source=result.outputFiles[0].text;
const fs=await import('node:fs/promises');
const path=new URL('../node_modules/.finance-test.mjs',import.meta.url);
await fs.writeFile(path,source);
const {financialTotals}=await import(path.href);
await fs.unlink(path);
test('totais financeiros preservam zero e não tratam saldo de referência como receita',()=>{
 assert.deepEqual(financialTotals([{valorDespesa:120.5,valorArrecadado:250},{valorDespesa:null,valorArrecadado:0},{valorDespesa:20,valorArrecadado:null}]),{expense:140.5,revenue:250});
 assert.deepEqual(financialTotals([]),{expense:0,revenue:0});
});
test('totais excluem cancelados e preservam centavos sem erro de ponto flutuante',()=>{
 assert.deepEqual(financialTotals([{valorDespesa:0.1,valorArrecadado:0.2},{valorDespesa:0.2,valorArrecadado:0.1},{valorDespesa:100,valorArrecadado:100,status:'CANCELADO/ARQUIVADO'}]),{expense:0.3,revenue:0.3});
});
