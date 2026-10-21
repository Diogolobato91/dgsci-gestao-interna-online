import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('controle carregado apresenta filtros, saldo e ações conforme o setor',async()=>{
 for(const sector of ['Subdiretoria','Secretaria']){
  const result=await build({stdin:{contents:`import React from 'react';import {renderToString} from 'react-dom/server';import Page from './src/features/records/DiariasPage';export default renderToString(<Page/>);`,resolveDir:root,loader:'tsx'},bundle:true,jsx:'automatic',platform:'node',format:'esm',write:false,define:{'import.meta.env':'{}','process.env.NODE_ENV':'"production"'},banner:{js:`import {createRequire} from 'node:module';const require=createRequire(${JSON.stringify(root+'package.json')});`},plugins:[{name:'finance-state',setup(build){
   build.onLoad({filter:/AuthContext\.tsx$/},()=>({loader:'tsx',contents:`export const useAuth=()=>({user:{id:'fixture',role:'editor',allowedProfiles:[${JSON.stringify(sector)}]}});`}));
   build.onLoad({filter:/usePrivateSnapshot\.ts$/},()=>({loader:'ts',contents:`export const usePrivateSnapshot=()=>({reload:()=>{},error:'',data:{importadoEm:null,budgets:[],saldos:[],dgsci:[],sat:[{id:'fixture',category:'sat',protocolo:'PROTOCOLO TESTE',unidade:'CAT',valorDespesa:120.5,valorArrecadado:200,workflowStatus:'aguardando',status:'Aguardando',competencia:null}]}});`}));
  }}]});
  const html=(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))).default.replace(/<!--[\s\S]*?-->/g,'');
  assert.match(html,/PROTOCOLO TESTE/);assert.match(html,/Competência não informada/);assert.match(html,/Todas as unidades/);assert.match(html,/Saldo ainda não definido/);
  if(sector==='Subdiretoria'){assert.match(html,/Novo processo/);assert.match(html,/Definir saldo inicial/);}else{assert.doesNotMatch(html,/Novo processo/);assert.doesNotMatch(html,/Definir saldo inicial/);}
 }
});
