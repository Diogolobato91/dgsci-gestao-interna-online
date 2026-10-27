import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:"export * from './src/features/records/cleaningTypes'",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {cleaningWeek,cleaningTasks,emptyCleaningDay}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('semana de segunda a domingo cruza mês e ano sem deslocar datas',()=>{
 assert.deepEqual(cleaningWeek('2026-01-01'),['2025-12-29','2025-12-30','2025-12-31','2026-01-01','2026-01-02','2026-01-03','2026-01-04']);
 assert.equal(cleaningWeek('2026-10-25')[6],'2026-10-25');
 assert.deepEqual(cleaningWeek('2026-02-30'),[]);
});
test('locais adicionais aparecem sem duplicar e preservam atividades antigas',()=>{
 const a=emptyCleaningDay('2026-10-27');a.assignments.push({task:'local_test',label:'Banheiro do 2º andar',staff_id:null,nome:''});
 const tasks=cleaningTasks([a,a]);assert.equal(tasks.length,7);assert.equal(tasks[6].label,'Banheiro do 2º andar');assert.equal(cleaningTasks([emptyCleaningDay('2026-10-28')]).length,6);
});
