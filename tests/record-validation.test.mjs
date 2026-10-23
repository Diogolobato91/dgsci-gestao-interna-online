import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const r=await build({entryPoints:['src/features/records/recordValidation.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {validateRecordFields,recordSaveError}=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
test('cadastro não aceita espaços em campos obrigatórios e informa duplicidade sem mensagem técnica',()=>{
 const fields=[{key:'sat',label:'SAT',required:true},{key:'municipios',label:'Municípios',multiline:true}];
 assert.match(validateRecordFields(fields,{sat:'   '}),/Preencha SAT/);
 assert.equal(validateRecordFields(fields,{sat:'CAT',municipios:''}),'');
 assert.match(validateRecordFields(fields,{sat:'CAT',municipios:'x'.repeat(4001)}),/limite/);
 assert.match(recordSaveError({code:'23505',message:'sensitive constraint details'}),/Já existe/);
 assert.doesNotMatch(recordSaveError({code:'23505',message:'sensitive constraint details'}),/sensitive/);
 assert.match(recordSaveError({code:'42501'}),/permissão/);
});
