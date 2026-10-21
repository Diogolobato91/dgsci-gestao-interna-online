import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/features/records/staffAvailability.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {absenceOn,validPeriod,institutionalToday,toInputDate,shortDate}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('disponibilidade inclui ambas as datas e ignora cancelamentos e outros integrantes',()=>{
 const rows=[{id:'a',staff_id:'militar',starts_on:'2026-10-21',ends_on:'2026-10-23',kind:'Férias',cancelled_at:null}];
 assert.equal(absenceOn(rows,'militar','2026-10-21')?.id,'a');assert.equal(absenceOn(rows,'militar','2026-10-23')?.id,'a');
 assert.equal(absenceOn(rows,'militar','2026-10-20'),undefined);assert.equal(absenceOn(rows,'militar','2026-10-24'),undefined);
 assert.equal(absenceOn(rows,'outro','2026-10-22'),undefined);assert.equal(absenceOn(rows,null,'2026-10-22'),undefined);
 assert.equal(absenceOn([{...rows[0],cancelled_at:'2026-10-21T12:00:00Z'}],'militar','2026-10-22'),undefined);
});
test('períodos rejeitam inversão e datas inexistentes e aceitam um único dia',()=>{
 assert.equal(validPeriod('2026-10-21','2026-10-21'),true);assert.equal(validPeriod('2026-10-22','2026-10-21'),false);
 assert.equal(validPeriod('2026-02-30','2026-03-01'),false);assert.equal(validPeriod('2024-02-29','2024-02-29'),true);
 assert.equal(validPeriod('2026-02-29','2026-03-01'),false);assert.equal(validPeriod('','2026-10-21'),false);
 assert.equal(toInputDate('21/10/2026'),'2026-10-21');assert.equal(toInputDate(null),'');
});
test('data institucional permanece no dia correto durante a virada UTC',()=>{
 assert.equal(institutionalToday(new Date('2026-10-22T02:59:59Z')),'2026-10-21');
 assert.equal(institutionalToday(new Date('2026-10-22T03:00:00Z')),'2026-10-22');
 assert.equal(shortDate('2026-10-22T02:00:00Z'),'21/10/2026');
 assert.equal(shortDate('2026-10-22'),'22/10/2026');
});
