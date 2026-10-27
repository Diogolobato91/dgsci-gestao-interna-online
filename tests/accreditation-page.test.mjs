import test from'node:test';import assert from'node:assert/strict';import {build}from'esbuild';import {fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('credenciamento carregado exibe as seis colunas, modalidades e última autoria; somente gestor vê edição',async()=>{
 for(const sector of ['Credenciamento','Diretoria']){
  const b=await build({stdin:{contents:`import React from 'react';import {renderToString}from'react-dom/server';import Page from './src/features/accreditation/AccreditationPage';export default renderToString(<Page/>);`,loader:'tsx',resolveDir:root},bundle:true,jsx:'automatic',platform:'node',format:'esm',write:false,define:{'import.meta.env':'{}','process.env.NODE_ENV':'"production"'},banner:{js:`import{createRequire}from'node:module';const require=createRequire(${JSON.stringify(root+'package.json')});`},plugins:[{name:'loaded-accreditation',setup(build){
   build.onLoad({filter:/AuthContext\.tsx$/},()=>({loader:'ts',contents:`export const useAuth=()=>({user:{id:'fixture',role:'editor',allowedProfiles:[${JSON.stringify(sector)}]}});`}));
   build.onLoad({filter:/useAccreditations\.ts$/},()=>({loader:'ts',contents:`export const useAccreditations=()=>({imports:[],loading:false,error:'',reload:()=>{},data:[{id:'fixture',kind:'company',modality:'Modalidade teste',name:'Empresa de teste',contact:'Contato de teste',region:'Região teste',protocol:'PROTOCOLO',valid_until:'2099-12-31',version:1,updated_by_name:'Gestor teste',updated_at:'2026-10-27T15:00:00Z'},{id:'fixture-pro',kind:'professional',modality:'Outra modalidade',name:'Profissional teste',valid_until:'2099-12-31',version:1,updated_by_name:'Gestor teste',updated_at:'2026-10-27T15:00:00Z'}]});`}));
  }}]});
  const html=(await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'))).default;
  for(const text of ['Modalidade (relação geral)','Empresas e Profissionais','Contato','Região','Protocolo','Validade','Empresa de teste','Gestor teste','27/10/2026','Credenciamentos por modalidade'])assert.ok(html.includes(text),text);
  assert.ok(!html.includes('<strong class="table-primary">Profissional teste'));
  if(sector==='Credenciamento'){assert.ok(html.includes('Novo credenciamento'));assert.ok(html.includes('Editar credenciamento de Empresa de teste'));}else{assert.ok(!html.includes('Novo credenciamento'));assert.ok(!html.includes('Editar credenciamento de Empresa de teste'));}
 }
});
