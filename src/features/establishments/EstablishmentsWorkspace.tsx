import {logActivity} from '@/features/audit/activity';
import { useEffect, useRef, useState } from 'react';
import { Building2, MapPinned, BarChart3, RefreshCw, Info } from 'lucide-react';
import { PageHeader, ActionButton } from '@/components/workspace/Workspace';
import { useAuth } from '@/contexts/AuthContext';
import { canManageSupport } from '@/features/records/recordAccess';
import EstablishmentEditor from './EstablishmentEditor';
import {useEstablishments} from './useEstablishments';
import type {Establishment} from './model';
import { useLocation } from 'react-router-dom';

const views = [{ id: 'overview', title: 'Indicadores', Icon: BarChart3 }, { id: 'map', title: 'Mapa territorial', Icon: MapPinned }, { id: 'companies', title: 'Estabelecimentos', Icon: Building2 }];
export default function EstablishmentsWorkspace() {
  const location = useLocation();
  const {user}=useAuth();const canEdit=canManageSupport(user);
  const {snapshot,loading,error,reload}=useEstablishments();
  const [editor,setEditor]=useState<{item:Establishment|null}|null>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const [view, setView] = useState(location.pathname === '/mapa' ? 'map' : 'overview');
  const [status, setStatus] = useState('Conectando ao banco de estabelecimentos…');
  const [ready, setReady] = useState(false);
  const [frameHeight, setFrameHeight] = useState(800);
  useEffect(() => { setView(location.pathname === '/mapa' ? 'map' : 'overview'); }, [location.pathname]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframe.current?.contentWindow || !['dgsci:status','dgsci:height','dgsci:activity','dgsci:database-ready','dgsci:database-refresh','dgsci:edit-establishment'].includes(event.data?.type)) return;
      if(event.data.type==='dgsci:database-ready'){setReady(true);iframe.current?.contentWindow?.postMessage({type:'dgsci:database-data',payload:snapshot??{companies:[],vistorias:[],loadedTabs:[],timestamp:null},canEdit},window.location.origin);return;}
      if(event.data.type==='dgsci:database-refresh'){if(!loading)reload();return;}
      if(event.data.type==='dgsci:edit-establishment'){if(canEdit){const item=snapshot?.companies.find(c=>c.id===event.data.id);if(item)setEditor({item});}return;}
      if(event.data.type==='dgsci:activity'){if(['btnExportUnlocatedExcel','btnExportCompaniesExcel','btnPrintCompanyDossier'].includes(event.data.reference))void logActivity('download_request','estabelecimentos',event.data.reference);return;}
      if (event.data.type === 'dgsci:height' && Number.isFinite(event.data.height)) { setFrameHeight(Math.max(500, event.data.height)); return; }
      if (typeof event.data.message === 'string') setStatus(event.data.message.slice(0, 160));
      if (event.data.ready === true) setReady(true);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [snapshot,canEdit,loading]);
  useEffect(()=>{if(ready)iframe.current?.contentWindow?.postMessage({type:'dgsci:database-data',payload:snapshot??{companies:[],vistorias:[],loadedTabs:[],timestamp:null},canEdit},window.location.origin);},[snapshot,ready,canEdit]);
  useEffect(() => {
    if (ready) iframe.current?.contentWindow?.postMessage({ type: 'dgsci:view', view }, window.location.origin);
  }, [view, ready]);
  useEffect(() => {
    const send = () => { const rect=iframe.current?.getBoundingClientRect(); const viewportTop=Math.max(0,document.querySelector('.shell-topbar')?.getBoundingClientRect().bottom??0); if(rect) iframe.current?.contentWindow?.postMessage({type:'dgsci:viewport',top:Math.max(0,viewportTop-rect.top),height:Math.max(160,Math.min(window.innerHeight,rect.bottom)-Math.max(viewportTop,rect.top)-16)},window.location.origin); };
    window.addEventListener('scroll',send,{passive:true});window.addEventListener('resize',send);send();
    return () => {window.removeEventListener('scroll',send);window.removeEventListener('resize',send);};
  },[ready,frameHeight]);
  return <section className="establishments-workspace workspace-page">
    <PageHeader eyebrow="Arquivo DGSCI" title="Estabelecimentos" description="Consulta de cadastros, localização e indicadores dos estabelecimentos." icon={Building2} actions={<><ActionButton disabled={loading} onClick={reload}><RefreshCw size={16}/>{loading?'Consultando banco…':'Atualizar cadastros'}</ActionButton>{canEdit&&<ActionButton variant="primary" onClick={()=>setEditor({item:null})}>Cadastrar estabelecimento</ActionButton>}</>}/>
    <div className="establishments-tabs"><div className="workspace-segments" role="group" aria-label="Visualização dos estabelecimentos">{views.map(({id,title,Icon})=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}><Icon size={16}/>{title}</button>)}</div><p role="status" aria-live="polite">{loading?'Consultando banco de estabelecimentos…':error||status}</p></div>
    <iframe ref={iframe} title="Consulta de estabelecimentos e mapa territorial DGSCI" src="/arquivo/index.html?embedded=1&database=1" onLoad={()=>setReady(true)} className="archive-frame" style={{height:frameHeight,minHeight:0,border:0,borderRadius:0,display:"block"}} scrolling="no" allow="geolocation 'self'" referrerPolicy="strict-origin-when-cross-origin" />
    {error&&<p className="form-error" role="alert">{error}{snapshot?' A última consulta foi mantida na tela.':''}</p>}
    <p className="workspace-footnote">Base compartilhada no banco da DGSCI. A situação reflete os dados registrados, sem consulta direta ao SISGAT. Alterações feitas na planilha depois da migração não são importadas automaticamente.</p>
    {snapshot?.import&&<p className="workspace-footnote">Base inicial: {snapshot.import.record_count.toLocaleString('pt-BR')} registros · Importada em {new Date(snapshot.import.imported_at).toLocaleString('pt-BR',{timeZone:'America/Belem'})}.</p>}
    {editor&&<EstablishmentEditor item={editor.item} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);reload();}}/>}
  </section>;
}
