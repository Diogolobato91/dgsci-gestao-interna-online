import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bookmark, Building2, Check, Compass, FileText, Info, Megaphone, Search, X, Plus, Pencil, BookOpen, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TYPE_LABELS } from './content';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { canManageSupport, canManageModels } from '@/features/records/recordAccess';
import { useDatabaseRows } from '@/features/records/useDatabaseRows';
import SupportEditor from './SupportEditor';
import { PageHeader, ActionButton, SearchField } from '@/components/workspace/Workspace';
import { matchesContent, readLocal, saveLocal, SupportContent } from './catalog';

const icons = { model: FileText, guide: Compass, notice: Megaphone };
export default function SupportLibrary() {
  const { pathname } = useLocation();
  const { user } = useAuth(); const canEdit = pathname === '/modelos-padronizados' || pathname === '/modelos-auto-infracao' ? canManageModels(user) : canManageSupport(user);
  const canEditItem = (item: SupportContent) => item.type === 'model' ? canManageModels(user) : canManageSupport(user);
  const {data,loading,error,reload} = useDatabaseRows<SupportContent & {is_demo:boolean}>('support_documents','id,type,title,description,area,date,format,tags,version,file,featured,checklist,related,sections,attachments,is_demo,revision','id');
  const content = useMemo(()=>data.filter(item=>item.type!=='guide').map(({is_demo,...item})=>({...item,isDemo:is_demo})),[data]);
  const [editor,setEditor] = useState<{item:SupportContent|null}|null>(null);
  const [downloading,setDownloading] = useState('');
  async function downloadAttachment(path:string,name:string){
    if(!supabase||downloading)return;setDownloading(path);
    try{const {data:blob,error:problem}=await supabase.storage.from('dgsci-support').download(path);if(problem||!blob)throw new Error();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    catch{toast({title:'Não foi possível baixar o anexo',description:'Confira sua conexão e permissão.',variant:'destructive'});}finally{setDownloading('');}
  }
  const initialType = pathname === '/modelos-padronizados' || pathname === '/modelos-auto-infracao' ? 'model' : pathname === '/ajuda-vistoriador' ? 'guide' : pathname === '/comunicados' ? 'notice' : 'all';
  const favoritesOnly = pathname === '/favoritos';
  const [query, setQuery] = useState('');
  const [type, setType] = useState(initialType);
  const [area, setArea] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState<SupportContent | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const value = readLocal('favorites', []);
    return Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];
  });
  const [checklists, setChecklists] = useState<Record<string, number[]>>(() => {
    const value = readLocal<Record<string, number[]>>('checklists', {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  });
  const { toast } = useToast();
  useEffect(() => {
    setType(initialType); setArea('all'); setQuery(''); setSelected(null);
  }, [pathname, initialType]);
  const results = useMemo(() => content.filter(item => matchesContent(item, query, type, area) && (!favoritesOnly || favorites.includes(item.id)))
    .sort((a, b) => sort === 'alpha' ? a.title.localeCompare(b.title, 'pt-BR') : b.date.localeCompare(a.date)), [content, query, type, area, favoritesOnly, favorites, sort]);
  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next);
    if (!saveLocal('favorites', next)) toast({ title: 'Favorito salvo nesta sessão', description: 'O armazenamento deste navegador está indisponível.' });
  }
  function updateChecklist(item: SupportContent, index: number) {
    const raw = checklists[item.id];
    const current = Array.isArray(raw) ? raw.filter(i => Number.isInteger(i) && i >= 0 && i < (item.checklist?.length || 0)) : [];
    const next = { ...checklists, [item.id]: current.includes(index) ? current.filter(i => i !== index) : [...current, index] };
    setChecklists(next);
    if (!saveLocal('checklists', next)) toast({ title: 'Progresso mantido nesta sessão', description: 'O navegador não permitiu salvar o checklist.' });
  }
  const clear = () => { setQuery(''); setType(initialType); setArea('all'); };
  const checked = selected && Array.isArray(checklists[selected.id]) ? checklists[selected.id].filter(i => Number.isInteger(i) && i >= 0 && i < (selected.checklist?.length || 0)) : [];
  const heading = favoritesOnly ? 'Meus favoritos' : type === 'model' ? 'Modelos padronizados' : type === 'guide' ? 'Ajuda ao vistoriador' : type === 'notice' ? 'Comunicados' : 'Biblioteca de apoio';

  return <div className="portal-page workspace-page">
    <PageHeader eyebrow="Gestão e apoio operacional" title={pathname==='/dashboard'?'Painel principal':heading} description={initialType==='notice'?'Informações e atualizações para os setores da DGSCI.':initialType==='guide'?'Orientações e documentos para apoiar a rotina de vistoria.':initialType==='model'?'Documentos padronizados e modelos de auto de infração.':'Documentos, orientações e consultas internas da DGSCI / CBMPA.'} icon={initialType==='notice'?Megaphone:initialType==='guide'?Compass:BookOpen} actions={<><ActionButton disabled={loading} onClick={reload}><RefreshCw size={16}/>Atualizar</ActionButton>{canEdit&&<ActionButton variant="primary" onClick={()=>setEditor({item:null})}><Plus size={17}/>{initialType==='notice'?'Novo comunicado':initialType==='guide'?'Nova orientação':initialType==='model'?'Novo modelo':'Novo comunicado'}</ActionButton>}</>}/>
    {pathname==='/dashboard'&&<div className="overview-access"><Link to="/estabelecimentos"><span className="overview-access-icon"><Building2 size={23}/></span><div><strong>Estabelecimentos</strong><p>Cadastros, mapa e indicadores</p></div><ArrowUpRight size={18}/></Link><Link to="/cmt-sub-sats"><span className="overview-access-icon"><Compass size={23}/></span><div><strong>Comando das SATs</strong><p>Comandantes e subcomandantes</p></div><ArrowUpRight size={18}/></Link></div>}
    {error&&<div className="workspace-feedback is-error" role="alert">{error}</div>}
    <div className="library-workspace">
    <section id="biblioteca" className="portal-library">
      <div className="data-panel-heading"><h2>{pathname==='/dashboard'?'Biblioteca de apoio':favoritesOnly?'Conteúdos salvos':'Acervo para consulta'}</h2><span className="workspace-count">{results.length}</span></div>
      <div className="library-search-row"><SearchField id="library-query" value={query} onChange={setQuery} placeholder="Pesquisar por título, conteúdo ou assunto…"/>{type==='model'&&<div className="workspace-segments" role="group" aria-label="Categoria dos modelos"><button aria-pressed={area==='all'} onClick={()=>{setQuery('');setArea('all');}}>Todos os modelos</button><button aria-pressed={area==='Notificação e Autos'} onClick={()=>setArea('Notificação e Autos')}>Notificação e Autos</button></div>}</div>
      <div className="portal-filters"><div role="group" aria-label="Tipo de conteúdo">{(initialType==='all'?[['all', 'Todos'], ['model', 'Modelos'], ['notice', 'Comunicados']]:[[initialType,initialType==='model'?'Modelos':initialType==='guide'?'Ajuda rápida':'Comunicados']]).map(([value, label]) => <button key={value} aria-pressed={type === value} className={type === value ? 'active' : ''} onClick={() => setType(value)}>{label}<span>{content.filter(item => matchesContent(item, query, value, area) && (!favoritesOnly || favorites.includes(item.id))).length}</span></button>)}</div>
        <label><span className="sr-only">Filtrar por área</span><select value={area} onChange={e => setArea(e.target.value)}><option value="all">Todas as áreas</option>{[...new Set(content.map(item => item.area))].map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="portal-results"><span role="status" aria-live="polite">{results.length} conteúdo(s) disponível(is){query && ` para “${query}”`}</span><label>Ordenar por <select value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Mais recentes</option><option value="alpha">Título A–Z</option></select></label></div>
      {loading&&<p className="workspace-load" role="status">Carregando conteúdos…</p>}
      <div className="portal-cards">{results.map(item => { const Icon = icons[item.type]; return <article className="portal-card" key={item.id}>
        <div className="portal-card-top"><span><Icon size={14} />{TYPE_LABELS[item.type]}</span><button aria-label={`${favorites.includes(item.id) ? 'Remover dos' : 'Salvar nos'} favoritos: ${item.title}`} aria-pressed={favorites.includes(item.id)} onClick={() => toggleFavorite(item.id)}><Bookmark size={18} fill={favorites.includes(item.id) ? 'currentColor' : 'none'} /></button></div>
        <button className="portal-card-title" onClick={() => setSelected(item)}><h3>{item.title}</h3></button><p>{item.description}</p><div className="portal-card-tags"><span>{item.area}</span><span>{item.isDemo ? 'Demonstração' : 'Cadastrado pelo setor'}</span></div>
        <footer><span>{new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(item.date+'T12:00:00Z'))} · {item.format}</span><div>{canEditItem(item)&&<ActionButton variant="ghost" onClick={()=>setEditor({item})} aria-label={'Editar '+item.title} title="Editar conteúdo"><Pencil size={16}/></ActionButton>}{item.attachments?.[0]&&<ActionButton disabled={!!downloading} onClick={()=>downloadAttachment(item.attachments![0].path,item.attachments![0].name)}>Baixar</ActionButton>}<ActionButton onClick={()=>setSelected(item)}>Consultar<ArrowRight size={14}/></ActionButton></div></footer>
      </article>; })}</div>
      {!loading && !error && results.length === 0 && <div className="portal-empty"><Search size={30} /><h3>{favoritesOnly && !favorites.length ? 'Sua consulta, do seu jeito' : 'Nenhum conteúdo encontrado'}</h3><p>{favoritesOnly && !favorites.length ? 'Marque os conteúdos que deseja encontrar aqui.' : 'Tente outro termo ou remova os filtros.'}</p><button onClick={clear}>Limpar busca e filtros</button>{favoritesOnly && <Link to="/dashboard">Explorar biblioteca <ArrowRight size={14} /></Link>}</div>}
    </section>
    </div>
    <footer className="portal-footer"><strong>DGSCI<span>.</span></strong><span>Portal de apoio à rotina operacional</span><small>Conteúdos marcados como demonstração aguardam validação institucional.</small></footer>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="portal-dialog max-w-2xl max-h-[88dvh] overflow-y-auto">
      {selected && <><DialogHeader><p className="portal-eyebrow">{TYPE_LABELS[selected.type]} · {selected.area}</p><DialogTitle className="text-2xl">{selected.title}</DialogTitle><DialogDescription>{selected.description}</DialogDescription></DialogHeader>
        {selected.isDemo&&<div className="portal-note"><Info size={16} /><p><strong>Conteúdo demonstrativo — sem validade institucional.</strong> Consulte os documentos oficiais antes de usar.</p></div>}
        {selected.sections.map((section, i) => <section key={i}><h3>{section.title}</h3>{section.text && <p>{section.text}</p>}{section.items && <ul>{section.items.map(text => <li key={text}>{text}</li>)}</ul>}</section>)}
        {selected.checklist?.length>0 && <section><h3>Checklist ilustrativo <small>{checked.length}/{selected.checklist.length}</small></h3><progress aria-label="Progresso do checklist" max={selected.checklist.length} value={checked.length} />{selected.checklist.map((text, index) => <label className="portal-check" key={text}><input type="checkbox" checked={checked.includes(index)} onChange={() => updateChecklist(selected, index)} /><span>{text}</span></label>)}</section>}
        {selected.related.length > 0 && <section><h3>Conteúdos relacionados</h3>{selected.related.map(id => content.find(item => item.id === id)).filter(Boolean).map(item => <button className="portal-related" key={item.id} onClick={() => setSelected(item)}>{item.title}<ArrowRight size={15} /></button>)}</section>}
        {selected.attachments?.length>0&&<section><h3>Anexos</h3>{selected.attachments.map(file=><button className="portal-related" key={file.path} disabled={!!downloading} onClick={()=>downloadAttachment(file.path,file.name)}>{downloading===file.path?'Baixando…':file.name}<ArrowRight size={15}/></button>)}</section>}
        {canEditItem(selected)&&<button className="record-edit" onClick={()=>{setEditor({item:selected});setSelected(null);}}>Alterar conteúdo e anexos</button>}
        <div className="portal-dialog-actions"><button className="portal-secondary" onClick={() => toggleFavorite(selected.id)}><Bookmark size={16} />{favorites.includes(selected.id) ? 'Favorito salvo' : 'Salvar favorito'}</button>{selected.file && /^[a-zA-Z0-9._-]+$/.test(selected.file) && <a className="portal-primary" download href={`/portal/assets/models/${selected.file}`}>Baixar modelo .docx <ArrowRight size={16} /></a>}</div>
      </>}
    </DialogContent></Dialog>
    {editor&&<SupportEditor item={editor.item} initialType={editor.item?.type ?? (initialType==='model'?'model':'notice')} onClose={()=>setEditor(null)} onSaved={()=>{setSelected(null);reload();toast({title:'Conteúdo salvo.'});}}/>}
  </div>;
}
