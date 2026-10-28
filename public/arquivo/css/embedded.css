/* Integration boundary: messages are accepted only from the same-origin parent. */
document.addEventListener('DOMContentLoaded', () => {
  if (window.parent === window || new URLSearchParams(location.search).get('embedded') !== '1') return;
  document.documentElement.classList.add('embedded');
  document.documentElement.setAttribute('data-theme', 'light');
  const app = window.app;
  if (!app) return;
  const views = new Set(['companies', 'map', 'overview', 'analytics']);
  const sendStatus = () => {
    const count = app.store.companies.length;
    const date = app.store.lastSync ? new Date(app.store.lastSync).toLocaleString('pt-BR') : null;
    const message = app.databaseMode ? `${count.toLocaleString('pt-BR')} registros no banco${date?' · Última alteração: '+date:''}` : date ? `${count.toLocaleString('pt-BR')} registros · Última consulta completa: ${date}` : 'Buscando os dados das planilhas…';
    parent.postMessage({ type: 'dgsci:status', ready: true, message }, location.origin);
  };
  let syncing = true;
  Promise.resolve(app.initialSync).finally(() => { syncing = false; });
  document.addEventListener('click',event=>{
    const button=event?.target?.closest?.('.btn-edit-establishment');
    if(button&&app.canEditEstablishments)parent.postMessage({type:'dgsci:edit-establishment',id:button.dataset.id},location.origin);
  });
  const originalSync = app.syncLiveSheet.bind(app);
  app.syncLiveSheet = async (...args) => {
    if (syncing) return;
    syncing = true;
    parent.postMessage({ type: 'dgsci:status', ready: true, message: app.databaseMode?'Consultando o banco de estabelecimentos…':'Atualizando as planilhas. A última consulta completa será preservada em caso de falha.' }, location.origin);
    try { await originalSync(...args); } finally { syncing = false; }
  };
  app.store.subscribe(sendStatus);
  document.addEventListener('click',event=>{
    const target=event?.target?.closest?.('#btnExportUnlocatedExcel,#btnExportCompaniesExcel,#btnPrintCompanyDossier');
    if(target)parent.postMessage({type:'dgsci:activity',reference:target.id},location.origin);
  });
  addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin) return;
    if (event.data?.type === 'dgsci:viewport' && Number.isFinite(event.data.top) && Number.isFinite(event.data.height)) { document.documentElement.style.setProperty('--host-top',Math.max(0,event.data.top)+'px');document.documentElement.style.setProperty('--host-height',Math.max(160,event.data.height)+'px'); }
    if (event.data?.type === 'dgsci:view' && views.has(event.data.view)) { app.switchTab(event.data.view); window.geoMapManager?.map?.scrollZoom?.disable(); }
    if (event.data?.type === 'dgsci:sync') app.syncLiveSheet(true);
  });
  let lastHeight = 0;
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { const height=Math.ceil(document.querySelector('.app-main')?.getBoundingClientRect().height || document.body.scrollHeight); if(Math.abs(height-lastHeight)>2){lastHeight=height;parent.postMessage({type:'dgsci:height',height:height+12},location.origin);} }) : null;
  observer?.observe(document.querySelector('.app-main') || document.body);
  app.switchTab('overview');
  sendStatus();
});
