import { useState, useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Inbox, RefreshCw, LoaderCircle, type LucideIcon } from 'lucide-react';

export function ActionButton({variant='secondary',className='',type='button',children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'}) {
  return <button type={type} className={`workspace-button workspace-button-${variant} ${className}`} {...props}>{children}</button>;
}
export function PageHeader({eyebrow,title,description,icon:Icon,actions}:{eyebrow:string;title:string;description:string;icon:LucideIcon;actions?:ReactNode}){
  return <header className="workspace-header"><div className="workspace-heading"><span className="workspace-page-icon"><Icon size={23} strokeWidth={1.6}/></span><div><p className="workspace-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="workspace-description">{description}</p></div></div>{actions&&<div className="workspace-actions">{actions}</div>}</header>;
}
export function SearchField({id,value,onChange,placeholder}:{id:string;value:string;onChange:(value:string)=>void;placeholder:string}){
  return <div className="workspace-search"><Search size={18}/><label className="sr-only" htmlFor={id}>{placeholder}</label><input id={id} type="search" value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder}/>{value&&<button type="button" aria-label="Limpar busca" onClick={()=>onChange('')}><X size={16}/></button>}</div>;
}
export function DataPanel({title,count,toolbar,children,footer}:{title:string;count?:number;toolbar?:ReactNode;children:ReactNode;footer?:ReactNode}){
  return <section className="data-panel" aria-label={title}><div className="data-panel-heading"><h2>{title}</h2>{count!==undefined&&<span className="workspace-count">{count}</span>}</div>{toolbar&&<div className="data-panel-toolbar">{toolbar}</div>}<div className="data-panel-body">{children}</div>{footer}</section>;
}
export function EmptyResults({text='Nenhum registro encontrado.',onClear}:{text?:string;onClear?:()=>void}){
  return <div className="workspace-empty"><span><Inbox size={27} strokeWidth={1.5}/></span><strong>{text}</strong><p>Revise a busca ou os filtros aplicados.</p>{onClear&&<ActionButton onClick={onClear}>Limpar filtros</ActionButton>}</div>;
}
export function LoadState({error,onRetry,label='Carregando registros…'}:{error?:string;onRetry?:()=>void;label?:string}){
  return <div className={`workspace-load ${error?'is-error':''}`} role={error?'alert':'status'}>{error?<Inbox size={24}/>:<LoaderCircle className="workspace-spinner" size={24}/>}<p>{error||label}</p>{error&&onRetry&&<ActionButton onClick={onRetry}><RefreshCw size={15}/>Tentar novamente</ActionButton>}</div>;
}
export function SummaryStrip({items}:{items:{label:string;value:ReactNode;hint?:string}[]}){
  return <div className="workspace-summary">{items.map(item=><div key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{item.hint&&<small>{item.hint}</small>}</div>)}</div>;
}
export function usePagination<T>(rows:T[],key:string,size=15){
  const [state,setState]=useState({key,page:1});
  useEffect(()=>setState({key,page:1}),[key]);
  const pages=Math.max(1,Math.ceil(rows.length/size));const page=state.key===key?Math.min(state.page,pages):1;
  return {rows:rows.slice((page-1)*size,page*size),page,pages,total:rows.length,size,setPage:(next:number)=>setState({key,page:Math.max(1,Math.min(next,pages))})};
}
export function TablePagination({page,pages,total,size,setPage}:{page:number;pages:number;total:number;size:number;setPage:(page:number)=>void}){
  return <footer className="workspace-pagination"><span>{total?`${(page-1)*size+1}–${Math.min(page*size,total)} de ${total} registros`:'0 registros'}</span><div><ActionButton variant="ghost" disabled={page===1} onClick={()=>setPage(page-1)} aria-label="Página anterior"><ChevronLeft size={17}/></ActionButton><span>Página <strong>{page}</strong> de {pages}</span><ActionButton variant="ghost" disabled={page===pages} onClick={()=>setPage(page+1)} aria-label="Próxima página"><ChevronRight size={17}/></ActionButton></div></footer>;
}
