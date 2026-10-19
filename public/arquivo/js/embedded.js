/* Integration boundary: messages are accepted only from the same-origin parent. */
document.addEventListener('DOMContentLoaded', () => {
  if (window.parent === window || new URLSearchParams(location.search).get('embedded') !== '1') return;
  document.documentElement.classList.add('embedded');
  document.documentElement.setAttribute('data-theme', 'light');
  const app = window.app;
  if (!app) return;
  const views = new Set(['companies', 'map', 'overview', 'analytics', 'catalog']);
  const sendStatus = () => {
    const count = app.store.companies.length;
    const date = app.store.lastSync ? new Date(app.store.lastSync).toLocaleString('pt-BR') : null;
    const message = date ? `${count.toLocaleString('pt-BR')} registros · Última consulta completa: ${date}` : 'Buscando os dados das planilhas…';
    parent.postMessage({ type: 'dgsci:status', ready: true, message }, location.origin);
  };
  let syncing = true;
  Promise.resolve(app.initialSync).finally(() => { syncing = false; });
  const originalSync = app.syncLiveSheet.bind(app);
  app.syncLiveSheet = async (...args) => {
    if (syncing) return;
    syncing = true;
    parent.postMessage({ type: 'dgsci:status', ready: true, message: 'Atualizando as planilhas. A última consulta completa será preservada em caso de falha.' }, location.origin);
    try { await originalSync(...args); } finally { syncing = false; }
  };
  app.store.subscribe(sendStatus);
  addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin) return;
    if (event.data?.type === 'dgsci:view' && views.has(event.data.view)) app.switchTab(event.data.view);
    if (event.data?.type === 'dgsci:sync') app.syncLiveSheet(true);
  });
  app.switchTab('companies');
  sendStatus();
});
