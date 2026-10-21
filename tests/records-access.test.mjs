import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({stdin:{contents:`export * from './src/features/records/recordAccess'; export {navigationConfig} from './src/config/navigation';`,resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {canManageModels,canManageSupport,canManageSat,canManageOrdinances,isFullAdministrator,navigationConfig,safeFileUrl,normalizeSearch} = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const account = (profile, role = 'reader', allowedProfiles = [profile]) => ({matricula:'Teste',profile,role,allowedProfiles,isAuthenticated:true});
test('portarias restritas à Subdiretoria e superadministrador',()=>{
 for(const profile of Object.keys(navigationConfig)) assert.equal(canManageOrdinances(account(profile)), profile === 'Subdiretoria');
 assert.equal(canManageOrdinances(account('Diretoria','administrator')),false);
 const superadmin = account('Diretoria','administrator',Object.keys(navigationConfig));
 assert.equal(isFullAdministrator(superadmin),true); assert.equal(canManageOrdinances(superadmin),true);
 assert.equal(canManageOrdinances(null),false);
});
test('menus compartilhados incluem comando SAT e removem mapa e atendimento online',()=>{
 for(const [profile,items] of Object.entries(navigationConfig)){
  assert(items.some(item=>item.path==='/cmt-sub-sats'));
  assert(!items.some(item=>['/vistoria','/mapa'].includes(item.path)));
  assert.equal(items.some(item=>item.path==='/controle-portarias'),profile==='Subdiretoria');
 }
});
test('arquivos aceitam apenas links HTTP e busca ignora acentos',()=>{
 assert.equal(safeFileUrl('javascript:alert(1)'),null);
 assert.equal(safeFileUrl('data:text/html,abc'),null);
 assert.equal(safeFileUrl('sem link'),null);
 assert.equal(safeFileUrl('https://drive.google.com/file/d/exemplo/view'),'https://drive.google.com/file/d/exemplo/view');
 assert.equal(normalizeSearch('ANÁLISE São Félix'),'analise sao felix');
});

test('edição de comando e regiões apenas para Diretoria e Subdiretoria; conteúdos incluem Secretaria',()=>{
 for(const profile of Object.keys(navigationConfig)) {
  assert.equal(canManageSat(account(profile)),['Diretoria','Subdiretoria'].includes(profile));
  assert.equal(canManageSupport(account(profile)),['Secretaria','Diretoria','Subdiretoria'].includes(profile));
  assert(!navigationConfig[profile].some(item=>item.path==='/modelos-auto-infracao'));
 }
 assert.deepEqual(Object.keys(navigationConfig).sort(),['Vistoriador','Análise','Multas','Secretaria','Subdiretoria','Diretoria'].sort());
});

test('modelos excluem Secretaria da edição e efetivo fica em Administração',()=>{
 for(const profile of Object.keys(navigationConfig)){
  assert.equal(canManageModels(account(profile)),['Diretoria','Subdiretoria'].includes(profile));
  assert(!navigationConfig[profile].some(item=>item.path==='/ajuda-vistoriador'));
  for(const item of navigationConfig[profile].filter(item=>item.path==='/relacao-efetivo')) assert.equal(item.section,'Administração');
 }
});
