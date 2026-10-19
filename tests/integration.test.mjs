import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

async function loadTS(path) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const { CONTENT } = await loadTS('src/features/support/content.ts');
const { matchesContent, readLocal, saveLocal } = await loadTS('src/features/support/catalog.ts');

test('busca combina palavras e ignora acentos', () => {
  const results = CONTENT.filter(item => matchesContent(item, 'relatorio vistoria', 'all', 'all'));
  assert.ok(results.some(item => item.id === 'relatorio-vistoria'));
  assert.ok(CONTENT.some(item => matchesContent(item, 'infracao', 'model', 'Administrativo')));
});
test('tipo e área restringem a busca conjuntamente', () => {
  const results = CONTENT.filter(item => matchesContent(item, '', 'guide', 'Análise'));
  assert.ok(results.length > 0);
  assert.ok(results.every(item => item.type === 'guide' && item.area === 'Análise'));
  assert.equal(CONTENT.filter(item => matchesContent(item, 'xyz-inexistente', 'all', 'all')).length, 0);
});
test('conteúdos relacionados e modelos importados existem', () => {
  const ids = new Set(CONTENT.map(item => item.id));
  assert.equal(ids.size, CONTENT.length);
  for (const item of CONTENT) {
    for (const related of item.related) assert.ok(ids.has(related), `${item.id}: ${related}`);
    if (item.file) assert.equal(fs.readFileSync(`public/portal/assets/models/${item.file}`).subarray(0, 2).toString(), 'PK');
  }
  assert.equal(CONTENT.filter(item => item.file).length, 4);
});
test('favoritos e checklists não derrubam a tela se armazenamento falhar', () => {
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(readLocal('favorites', []), []);
  assert.equal(saveLocal('checklists', { exemplo: [0] }), false);
  globalThis.localStorage = { getItem() { return '{invalid'; } };
  assert.deepEqual(readLocal('checklists', {}), {});
  delete globalThis.localStorage;
});

function synchronizer(responses) {
  const writes = [];
  const context = vm.createContext({ window: {}, console: { warn() {} }, AbortController, setTimeout, clearTimeout,
    localStorage: { setItem(...args) { writes.push(args); } }, fetch: async () => {
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return { ok: response !== false, text: async () => 'PASTA,RAZAO SOCIAL,CNPJ\n1,Empresa exemplo,12345678000100\n2,Outra empresa,98765432000100' };
    } });
  vm.runInContext(fs.readFileSync('public/arquivo/js/sheets-sync.js', 'utf8'), context);
  const manager = context.window.sheetsSyncManager;
  manager.knownTabs = [{ name: 'C1', gid: '1', group: 'C', division: 'C-1' }, { name: 'D1', gid: '2', group: 'D', division: 'D-1' }];
  return { manager, writes };
}
test('sincronização completa normaliza registros e grava cache uma vez', async () => {
  const { manager, writes } = synchronizer([true, true]);
  const data = await manager.syncFromGoogleSheets('sheet-test');
  assert.equal(data.companies.length, 4);
  assert.equal(data.loadedTabs.length, 2);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], 'dgsci_data_cache');
});
test('falha de uma aba não sobrescreve a última consulta completa', async () => {
  const { manager, writes } = synchronizer([true, false]);
  await assert.rejects(() => manager.syncFromGoogleSheets('sheet-test'), /Sincronização incompleta/);
  assert.equal(writes.length, 0);
});
test('erro de rede não apaga o cache anterior', async () => {
  const { manager, writes } = synchronizer([new Error('offline'), new Error('offline')]);
  await assert.rejects(() => manager.syncFromGoogleSheets('sheet-test'), /2\/2/);
  assert.equal(writes.length, 0);
});
test('mensagens de outro domínio ou outra janela são ignoradas', () => {
  let listener;
  const posts = [];
  const calls = [];
  const parent = { postMessage(...args) { posts.push(args); } };
  const app = { store: { companies: [], lastSync: null, subscribe() {} }, syncLiveSheet: async () => {}, switchTab(view) { calls.push(view); } };
  const context = vm.createContext({ document: { addEventListener(_event, fn) { fn(); }, documentElement: { classList: { add() {} }, setAttribute() {} } },
    window: { parent, app }, parent, location: { search: '?embedded=1', origin: 'https://portal.test' }, URLSearchParams,
    addEventListener(_event, fn) { listener = fn; }, Set, Date });
  vm.runInContext(fs.readFileSync('public/arquivo/js/embedded.js', 'utf8'), context);
  listener({ source: parent, origin: 'https://outro.test', data: { type: 'dgsci:view', view: 'map' } });
  listener({ source: {}, origin: 'https://portal.test', data: { type: 'dgsci:view', view: 'map' } });
  listener({ source: parent, origin: 'https://portal.test', data: { type: 'dgsci:view', view: 'invalid' } });
  assert.deepEqual(calls, ['companies']);
  listener({ source: parent, origin: 'https://portal.test', data: { type: 'dgsci:view', view: 'map' } });
  assert.deepEqual(calls, ['companies', 'map']);
  assert.equal(posts[0][0].ready, true);
});
test('mapa sem WebGL exibe orientação sem quebrar a consulta', () => {
  const messages = [];
  const container = { replaceChildren() {}, appendChild(p) { messages.push(p.textContent); } };
  const context = vm.createContext({ window: { DGSCI_GEO_KEYS: {} }, document: { addEventListener() {}, getElementById() { return container; }, documentElement: { getAttribute() { return 'light'; } }, createElement() { return {}; } },
    mapboxgl: { Map: class { constructor() { throw new Error('Failed to initialize WebGL'); } } }, console: { warn() {} }, fetch: async () => ({ ok: false }) });
  vm.runInContext(fs.readFileSync('public/arquivo/js/geo-map.js', 'utf8'), context);
  context.window.geoMapManager.initMap();
  assert.equal(context.window.geoMapManager.map, null);
  assert.match(messages[0], /consulta dos estabelecimentos continua disponível/);
});
