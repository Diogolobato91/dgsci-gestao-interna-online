import { useEffect, useRef, useState } from 'react';
import { Building2, MapPinned, BarChart3, RefreshCw, Info } from 'lucide-react';
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
  return <section className="establishments-workspace">
    <div className="portal-section-heading"><div><p className="portal-eyebrow">ARQUIVO DGSCI · BASE COMPARTILHADA</p><h1>Estabelecimentos<span>.</span></h1><p>Informações das planilhas e consulta territorial reunidas.</p></div></div>
    <div className="source-note"><Info size={17} /><p><strong>Consulta às planilhas.</strong> Atualize os cadastros na origem. Esta versão não grava alterações nos estabelecimentos e não consulta o SISGAT.</p></div>
    <div className="workspace-toolbar"><div role="group" aria-label="Visualização dos estabelecimentos">{views.map(({ id, title, Icon }) => <button key={id} aria-pressed={view === id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={16} />{title}</button>)}</div><button disabled={!ready} onClick={() => iframe.current?.contentWindow?.postMessage({ type: 'dgsci:sync' }, window.location.origin)}><RefreshCw size={15} />Atualizar</button></div>
    <p className="workspace-status" role="status" aria-live="polite">{status}</p>
    <iframe ref={iframe} title="Consulta de estabelecimentos e mapa territorial DGSCI" src="/arquivo/index.html?embedded=1" className="archive-frame" allow="geolocation 'self'" referrerPolicy="strict-origin-when-cross-origin" />
  </section>;
}
