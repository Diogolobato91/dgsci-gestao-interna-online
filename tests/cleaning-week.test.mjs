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

const modelBundle=await build({stdin:{contents:"export * from './src/features/records/cleaningWeekModel'",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {prepareCleaningWeek,setCleaningResponsible,cleaningWeekChanges}=await import('data:text/javascript;base64,'+Buffer.from(modelBundle.outputFiles[0].text).toString('base64'));
test('semana mantém responsáveis diferentes por célula e preserva dias existentes e notas',()=>{
 const existing=emptyCleaningDay('2026-10-27');existing.version=4;existing.notes='Orientação da terça';existing.assignments[0]={...existing.assignments[0],staff_id:'a',nome:'VC A'};
 const days=prepareCleaningWeek('2026-10-27',[existing],[{id:'banheiro',label:'Banheiro do 2º andar'}]);
 assert.equal(days.length,7);assert.equal(days[1].version,4);assert.equal(days[1].notes,existing.notes);assert.equal(days[0].assignments[0].nome,'');
 const changed=setCleaningResponsible(days,'2026-10-26','lav_corredor',{id:'b',nome:'VC B'});
 assert.equal(changed[0].assignments[0].nome,'VC B');assert.equal(changed[1].assignments[0].nome,'VC A');assert.equal(changed[0].assignments[1].nome,'');assert.equal(days[0].assignments[0].nome,'');
 assert.equal(changed[6].assignments.find(a=>a.task==='local_banheiro').nome,'');
 assert.equal(cleaningWeekChanges(changed,days,['2026-10-27']).length,0);
 const edited=setCleaningResponsible(changed,'2026-10-27','local_banheiro',{id:'c',nome:'VC C'});
 assert.equal(cleaningWeekChanges(edited,days,['2026-10-27'])[0].version,4);
 assert.equal(cleaningWeekChanges(edited,days,[]).length,0);
});
test('reabrir semana não compartilha mutações com a consulta original',()=>{
 const row=emptyCleaningDay('2026-10-26');row.version=1;
 const week=prepareCleaningWeek('2026-10-26',[row],[]);week[0].assignments[0].nome='Alterado';assert.equal(row.assignments[0].nome,'');
});
