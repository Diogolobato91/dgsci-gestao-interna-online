import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bookmark, Building2, Check, Compass, FileText, Info, MapPinned, Megaphone, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CONTENT, TYPE_LABELS } from './content';
import { matchesContent, readLocal, saveLocal, SupportContent } from './catalog';

const icons = { model: FileText, guide: Compass, notice: Megaphone };
export default function SupportLibrary() {
  const { pathname } = useLocation();
  const initialType = pathname === '/modelos-padronizados' || pathname === '/modelos-auto-infracao' ? 'model' : pathname === '/ajuda-vistoriador' ? 'guide' : pathname === '/comunicados' ? 'notice' : 'all';
  const favoritesOnly = pathname === '/favoritos';
  const [query, setQuery] = useState(pathname === '/modelos-auto-infracao' ? 'infração' : '');
  const [type, setType] = useState(initialType);
  const [area, setArea] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState<SupportContent | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const value = readLocal('favorites', []);
    return Array.isArray(value) ? value.filter(id => CONTENT.some(item => item.id === id)) : [];
  });
  const [checklists, setChecklists] = useState<Record<string, number[]>>(() => {
    const value = readLocal<Record<string, number[]>>('checklists', {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  });
  const { toast } = useToast();
  useEffect(() => {
    setType(initialType); setArea('all'); setQuery(pathname === '/modelos-auto-infracao' ? 'infração' : ''); setSelected(null);
  }, [pathname, initialType]);
  const results = useMemo(() => CONTENT.filter(item => matchesContent(item, query, type, area) && (!favoritesOnly || favorites.includes(item.id)))
    .sort((a, b) => sort === 'alpha' ? a.title.localeCompare(b.title, 'pt-BR') : b.date.localeCompare(a.date)), [query, type, area, favoritesOnly, favorites, sort]);
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
  const clear = () => { setQuery(''); setType('all'); setArea('all'); };
  const checked = selected && Array.isArray(checklists[selected.id]) ? checklists[selected.id].filter(i => Number.isInteger(i) && i >= 0 && i < (selected.checklist?.length || 0)) : [];
  const heading = favoritesOnly ? 'Meus favoritos' : type === 'model' ? 'Modelos padronizados' : type === 'guide' ? 'Ajuda ao vistoriador' : type === 'notice' ? 'Comunicados' : 'Biblioteca de apoio';

  return <div className="portal-page">
    {pathname === '/dashboard' && <>
      <section className="portal-hero">
        <div className="hero-grid" aria-hidden="true" />
        <p className="portal-eyebrow"><span /> BASE DE APOIO OPERACIONAL <small>DGSCI / 01</small></p>
        <h1>Informação certa.<br /><em>Consulta mais rápida.</em></h1>
        <p>Modelos, orientações e estabelecimentos.<br />Um ponto de partida para a rotina do departamento.</p>
        <form className="portal-search" role="search" onSubmit={e => { e.preventDefault(); document.getElementById('biblioteca')?.scrollIntoView({ behavior: 'smooth' }); }}>
          <Search size={21} /><label className="sr-only" htmlFor="portal-query">Buscar na biblioteca</label>
          <input id="portal-query" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Busque um modelo, orientação ou assunto..." />
          <button type="submit">Buscar <ArrowRight size={16} /></button>
        </form>
        <div className="portal-quick"><span>Busca rápida</span>{['Relatório', 'Checklist', 'Comunicado'].map(term => <button key={term} onClick={() => setQuery(term)}>{term} <ArrowUpRight size={12} /></button>)}</div>
      </section>
      <div className="portal-shortcuts">
        <Link to="/estabelecimentos"><Building2 /><div><strong>Estabelecimentos</strong><span>Consulta às planilhas do DGSCI</span></div><ArrowUpRight size={17} /></Link>
        <Link to="/mapa"><MapPinned /><div><strong>Mapa territorial</strong><span>Localize e filtre os estabelecimentos</span></div><ArrowUpRight size={17} /></Link>
      </div>
    </>}
    <div className="portal-note"><Info size={16} /><p><strong>Biblioteca demonstrativa.</strong> Os modelos e orientações são exemplos sem validade institucional. Favoritos e checklists ficam neste navegador.</p></div>
    <section id="biblioteca" className="portal-library">
      <div className="portal-section-heading"><div><p className="portal-eyebrow">TUDO EM UM SÓ LUGAR</p><h2>{heading}<span>.</span></h2><p>Encontre o conteúdo e siga com o seu trabalho.</p></div><div className="portal-total"><strong>{results.length}</strong><span>conteúdos<br />para consulta</span></div></div>
      {pathname !== '/dashboard' && <div className="portal-search light"><Search size={19} /><label className="sr-only" htmlFor="library-query">Buscar conteúdo</label><input id="library-query" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar na biblioteca..." /></div>}
      <div className="portal-filters"><div role="group" aria-label="Tipo de conteúdo">{[['all', 'Todos'], ['model', 'Modelos'], ['guide', 'Ajuda rápida'], ['notice', 'Comunicados']].map(([value, label]) => <button key={value} aria-pressed={type === value} className={type === value ? 'active' : ''} onClick={() => setType(value)}>{label}<span>{CONTENT.filter(item => matchesContent(item, query, value, area) && (!favoritesOnly || favorites.includes(item.id))).length}</span></button>)}</div>
        <label><span className="sr-only">Filtrar por área</span><select value={area} onChange={e => setArea(e.target.value)}><option value="all">Todas as áreas</option>{[...new Set(CONTENT.map(item => item.area))].map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="portal-results"><span role="status" aria-live="polite">{results.length} conteúdo(s) disponível(is){query && ` para “${query}”`}</span><label>Ordenar por <select value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Mais recentes</option><option value="alpha">Título A–Z</option></select></label></div>
      <div className="portal-cards">{results.map(item => { const Icon = icons[item.type]; return <article className="portal-card" key={item.id}>
        <div className="portal-card-top"><span><Icon size={14} />{TYPE_LABELS[item.type]}</span><button aria-label={`${favorites.includes(item.id) ? 'Remover dos' : 'Salvar nos'} favoritos: ${item.title}`} aria-pressed={favorites.includes(item.id)} onClick={() => toggleFavorite(item.id)}><Bookmark size={18} fill={favorites.includes(item.id) ? 'currentColor' : 'none'} /></button></div>
        <button className="portal-card-title" onClick={() => setSelected(item)}><h3>{item.title}</h3></button><p>{item.description}</p><div className="portal-card-tags"><span>{item.area}</span><span>Demonstração</span></div>
        <footer><span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(item.date + 'T12:00:00Z'))} · {item.format}</span><button onClick={() => setSelected(item)}>Consultar <ArrowRight size={14} /></button></footer>
      </article>; })}</div>
      {results.length === 0 && <div className="portal-empty"><Search size={30} /><h3>{favoritesOnly && !favorites.length ? 'Sua consulta, do seu jeito' : 'Nenhum conteúdo encontrado'}</h3><p>{favoritesOnly && !favorites.length ? 'Marque os conteúdos que deseja encontrar aqui.' : 'Tente outro termo ou remova os filtros.'}</p><button onClick={clear}>Limpar busca e filtros</button>{favoritesOnly && <Link to="/dashboard">Explorar biblioteca <ArrowRight size={14} /></Link>}</div>}
    </section>
    <footer className="portal-footer"><strong>DGSCI<span>.</span></strong><span>Portal de apoio à rotina operacional</span><small>Conteúdos demonstrativos · Revisão institucional pendente</small></footer>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="portal-dialog max-w-2xl max-h-[88dvh] overflow-y-auto">
      {selected && <><DialogHeader><p className="portal-eyebrow">{TYPE_LABELS[selected.type]} · {selected.area}</p><DialogTitle className="text-2xl">{selected.title}</DialogTitle><DialogDescription>{selected.description}</DialogDescription></DialogHeader>
        <div className="portal-note"><Info size={16} /><p><strong>Conteúdo demonstrativo — sem validade institucional.</strong> Consulte os documentos oficiais antes de usar.</p></div>
        {selected.sections.map((section, i) => <section key={i}><h3>{section.title}</h3>{section.text && <p>{section.text}</p>}{section.items && <ul>{section.items.map(text => <li key={text}>{text}</li>)}</ul>}</section>)}
        {selected.checklist && <section><h3>Checklist ilustrativo <small>{checked.length}/{selected.checklist.length}</small></h3><progress aria-label="Progresso do checklist" max={selected.checklist.length} value={checked.length} />{selected.checklist.map((text, index) => <label className="portal-check" key={text}><input type="checkbox" checked={checked.includes(index)} onChange={() => updateChecklist(selected, index)} /><span>{text}</span></label>)}</section>}
        {selected.related.length > 0 && <section><h3>Conteúdos relacionados</h3>{selected.related.map(id => CONTENT.find(item => item.id === id)).filter(Boolean).map(item => <button className="portal-related" key={item.id} onClick={() => setSelected(item)}>{item.title}<ArrowRight size={15} /></button>)}</section>}
        <div className="portal-dialog-actions"><button className="portal-secondary" onClick={() => toggleFavorite(selected.id)}><Bookmark size={16} />{favorites.includes(selected.id) ? 'Favorito salvo' : 'Salvar favorito'}</button>{selected.file && <a className="portal-primary" download href={`/portal/assets/models/${selected.file}`}>Baixar modelo .docx <ArrowRight size={16} /></a>}</div>
      </>}
    </DialogContent></Dialog>
  </div>;
}
