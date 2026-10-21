import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('efetivo carregado mostra afastamento, contato e ações, mantendo CPF parcialmente oculto',async()=>{
 const result=await build({stdin:{contents:`import React from 'react';import {renderToString} from 'react-dom/server';import Staff from './src/features/records/StaffPage';export default renderToString(<Staff/>);`,resolveDir:root,loader:'tsx'},bundle:true,jsx:'automatic',platform:'node',format:'esm',write:false,
  define:{'import.meta.env':'{}','process.env.NODE_ENV':'"production"'},
  banner:{js:`import {createRequire} from 'node:module';const require=createRequire(${JSON.stringify(root+'package.json')});`},
  plugins:[{name:'authorized-staff-state',setup(build){
   build.onLoad({filter:/AuthContext\.tsx$/},()=>({loader:'tsx',contents:`export const useAuth=()=>({user:{id:'fixture',allowedProfiles:['Secretaria']}});`}));
   build.onLoad({filter:/usePrivateSnapshot\.ts$/},()=>({loader:'ts',contents:`export const usePrivateSnapshot=()=>({reload:()=>{},error:'',data:{fonte:'Fixture',importadoEm:'2026-10-21T12:00:00Z',registros:[{id:'militar',nome:'Pessoa de Teste',postoGraduacao:'CAP',categoria:'Militar',mf:null,cpf:'52998224725',dataNascimento:null,contato:'91999990000',version:1}]}});`}));
   build.onLoad({filter:/useStaffAbsences\.ts$/},()=>({loader:'ts',contents:`export const fetchStaffAbsences=async()=>[];export const useStaffAbsences=()=>({loading:false,error:'',data:[{staff_id:'militar',kind:'Férias',starts_on:'1900-01-01',ends_on:'2199-12-31',cancelled_at:null}]});`}));
  }}]});
 const html=(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))).default.replace(/<!--[\s\S]*?-->/g,'');
 assert.match(html,/Pessoa de Teste/);assert.match(html,/Férias e afastamentos/);assert.match(html,/Novo integrante/);assert.match(html,/Até 31\/12\/2199/);
 assert.match(html,/tel:91999990000/);assert.match(html,/Editar cadastro de Pessoa de Teste/);assert.doesNotMatch(html,/52998224725/);
});
