import test from 'node:test';import assert from 'node:assert/strict';import {build}from'esbuild';
test('grade semanal mostra responsáveis independentes, locais e observações por data',async()=>{
 const b=await build({stdin:{contents:`import React from 'react';import{renderToString}from'react-dom/server';import{CleaningWeekGrid}from'./src/features/records/CleaningWeekGrid';import{prepareCleaningWeek,setCleaningResponsible}from'./src/features/records/cleaningWeekModel';let days=prepareCleaningWeek('2026-10-27',[],[{id:'wc',label:'Banheiro do 2º andar'}]);const people=[{id:'a',nome:'VC A'},{id:'b',nome:'VC B'}];days=setCleaningResponsible(days,'2026-10-26','local_wc',people[0]);days=setCleaningResponsible(days,'2026-10-27','local_wc',people[1]);export default renderToString(<CleaningWeekGrid days={days} selected={['2026-10-26','2026-10-27']} activeDay={1} disabled={false} people={people} onToggle={()=>{}} onPick={()=>{}} onNotes={()=>{}}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,jsx:'automatic',platform:'node',format:'esm',write:false,banner:{js:`import{createRequire}from'node:module';const require=createRequire(${JSON.stringify(process.cwd()+'/package.json')});`},define:{'process.env.NODE_ENV':'"production"'}});
 const html=(await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'))).default;
 for(const label of ['Segunda','Domingo','Banheiro do 2º andar','Observações · 26/10/2026','Observações · 27/10/2026','vc-active-day'])assert.ok(html.includes(label),label);
 assert.equal((html.match(/<select /g)??[]).length,49);
 assert.ok(/Banheiro do 2º andar · 26\/10\/2026[^]*?value="a" selected=""/.test(html));
 assert.ok(/Banheiro do 2º andar · 27\/10\/2026[^]*?value="b" selected=""/.test(html));
 assert.ok(html.includes('disabled=""')); // Dias desmarcados continuam na grade, sem edição.
});
