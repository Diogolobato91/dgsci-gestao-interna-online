import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('telas revisadas renderizam estado inicial e ações sem submeter formulários por engano',async()=>{
  const result=await build({stdin:{contents:`import React from 'react';
    import {renderToString} from 'react-dom/server';
    import {MemoryRouter} from 'react-router-dom';
    import {AuthProvider} from './src/contexts/AuthContext';
    import Staff from './src/features/records/StaffPage';
    import Commands from './src/features/records/SatCommandsPage';
    import Regions from './src/features/records/SatRegionsPage';
    import Diarias from './src/features/records/DiariasPage';
    import Library from './src/features/support/SupportLibrary';
    import {ActionButton,TablePagination,SearchField} from './src/components/workspace/Workspace';
    const pages=[Staff,Commands,Regions,Diarias,Library].map(Page=>renderToString(<AuthProvider><MemoryRouter><Page/></MemoryRouter></AuthProvider>));
    const controls=renderToString(<form><ActionButton>Atualizar</ActionButton><SearchField id="test-search" value="SAT" onChange={()=>{}} placeholder="Buscar SAT"/><TablePagination page={1} pages={1} total={0} size={15} setPage={()=>{}}/></form>);
    export default {pages,controls};`,resolveDir:root,loader:'tsx'},bundle:true,jsx:'automatic',platform:'node',format:'esm',write:false,define:{'import.meta.env':'{}','process.env.NODE_ENV':'"production"'},banner:{js:`import {createRequire} from 'node:module';const require=createRequire(${JSON.stringify(root+'package.json')});`}});
  let output;
  try{output=(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))).default;}catch(error){assert.fail('Erro na renderização inicial: '+error.message);}
  assert.equal(output.pages.length,5);
  for(const html of output.pages){assert.match(html,/<h1/);assert.match(html,/workspace-header/);}
  assert.match(output.controls,/<button type="button"[^>]*>Atualizar/);
  assert.match(output.controls,/aria-label="Limpar busca"/);
  assert.match(output.controls,/Página anterior[^>]*disabled|disabled[^>]*aria-label="Página anterior"/);
  assert.match(output.controls,/Próxima página[^>]*disabled|disabled[^>]*aria-label="Próxima página"/);
});
