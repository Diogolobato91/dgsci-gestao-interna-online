import { useEffect, useRef, useState } from 'react';
import { Building2, MapPinned, BarChart3, RefreshCw, Info } from 'lucide-react';
import { PageHeader, ActionButton } from '@/components/workspace/Workspace';
import { useLocation } from 'react-router-dom';

const views = [{ id: 'companies', title: 'Estabelecimentos', Icon: Building2 }, { id: 'map', title: 'Mapa territorial', Icon: MapPinned }, { id: 'overview', title: 'Indicadores', Icon: BarChart3 }];
export default function EstablishmentsWorkspace() {
  const location = useLocation();
  const iframe = useRef<HTMLIFrameElement>(null);
  const [view, setView] = useState(location.pathname === '/mapa' ? 'map' : 'companies');
  const [status, setStatus] = useState('Conectando às planilhas…');
  const [ready, setReady] = useState(false);
  useEffect(() => { setView(location.pathname === '/mapa' ? 'map' : 'companies'); }, [location.pathname]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframe.current?.contentWindow || event.data?.type !== 'dgsci:status') return;
      if (typeof event.data.message === 'string') setStatus(event.data.message.slice(0, 160));
      if (event.data.ready === true) setReady(true);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);
  useEffect(() => {
    if (ready) iframe.current?.contentWindow?.postMessage({ type: 'dgsci:view', view }, window.location.origin);
  }, [view, ready]);
  return <section className="establishments-workspace workspace-page">
    <PageHeader eyebrow="Arquivo DGSCI" title="Estabelecimentos" description="Consulta de cadastros, localização e indicadores dos estabelecimentos." icon={Building2} actions={<ActionButton disabled={!ready} onClick={()=>iframe.current?.contentWindow?.postMessage({type:'dgsci:sync'},window.location.origin)}><RefreshCw size={16}/>Atualizar cadastros</ActionButton>}/>
    <div className="establishments-tabs"><div className="workspace-segments" role="group" aria-label="Visualização dos estabelecimentos">{views.map(({id,title,Icon})=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}><Icon size={16}/>{title}</button>)}</div><p role="status" aria-live="polite">{status}</p></div>
    <iframe ref={iframe} title="Consulta de estabelecimentos e mapa territorial DGSCI" src="/arquivo/index.html?embedded=1" className="archive-frame" allow="geolocation 'self'" referrerPolicy="strict-origin-when-cross-origin" />
    <p className="workspace-footnote">Consulta às planilhas. Alterações cadastrais são realizadas na origem; não há consulta direta ao SISGAT.</p>
  </section>;
}
