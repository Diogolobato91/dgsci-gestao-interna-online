import {logActivity} from '@/features/audit/activity';
import { useEffect, useRef, useState } from 'react';
import { Megaphone, Paperclip, ArrowRight, Bell, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ActionButton } from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
type Notice={acknowledged?:boolean;published_at?:string;publication_id:string;title:string;description:string;date:string;attachments:{path:string;name:string}[];sections:{title:string;text?:string;items?:string[]}[]};
export default function NoticeNotifications(){
 const {user}=useAuth();
 const [notice,setNotice]=useState<Notice|null>(null),[reading,setReading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=useRef<Notice|null>(null);
 const [center,setCenter]=useState(false),[unseen,setUnseen]=useState(false),[offset,setOffset]=useState(0),[items,setItems]=useState<Notice[]>([]),[count,setCount]=useState(0),[total,setTotal]=useState(0),[listLoading,setListLoading]=useState(true),[listError,setListError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setListLoading(true);setListError('');if(!user){setItems([]);setCount(0);setTotal(0);setListLoading(false);return;}
  (async()=>{try{if(!supabase)throw new Error();const r=await supabase.rpc('get_my_notices',{p_offset:offset,p_unseen:unseen});if(r.error||!r.data)throw new Error();if(active){setItems(r.data.items);setCount(r.data.unseen_count);setTotal(r.data.total);if(offset>0&&offset>=r.data.total)setOffset(Math.max(0,Math.floor((r.data.total-1)/20)*20));}}catch{if(active)setListError('Não foi possível consultar as notificações.');}finally{if(active)setListLoading(false);}})();
  return()=>{active=false;};
 },[user?.id,offset,unseen,revision]);
 useEffect(()=>{
  let active=true,pending=false;current.current=null;setNotice(null);setReading(false);setError('');
  setItems([]);setCount(0);setTotal(0);setCenter(false);setOffset(0);setUnseen(false);
  if(!user)return;
  async function check(){
   if(document.visibilityState!=='hidden')setRevision(n=>n+1);
   if(document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return;
   if(!active||pending||current.current||!supabase||document.visibilityState==='hidden'||document.querySelector('[role="dialog"], [role="alertdialog"]'))return;
   pending=true;
   try{const result=await supabase.rpc('get_pending_notice');if(active&&!result.error&&result.data&&!document.querySelector('[role="dialog"], [role="alertdialog"]')){current.current=result.data as Notice;setNotice(result.data as Notice);setReading(false);setError('');}}catch{/* Nova tentativa no próximo ciclo, sem interromper o trabalho. */}finally{pending=false;}
  }
  void check();const timer=window.setInterval(()=>void check(),30000);
  const focus=()=>void check();let delayed:number|undefined;
  const published=()=>{window.clearTimeout(delayed);delayed=window.setTimeout(()=>void check(),500);};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);window.addEventListener('dgsci:new-notice',published);
  return()=>{active=false;window.clearInterval(timer);window.clearTimeout(delayed);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);window.removeEventListener('dgsci:new-notice',published);};
 },[user?.id]);
 async function acknowledge(openFull:boolean){
  if(!notice||!user||!supabase||busy)return;setBusy(true);setError('');
  try{
   const result=await supabase.from('notice_receipts').upsert({user_id:user.id,publication_id:notice.publication_id},{onConflict:'user_id,publication_id',ignoreDuplicates:true});
   if(result.error)throw result.error;
   setRevision(n=>n+1);
   if(openFull)setReading(true);else{current.current=null;setNotice(null);setReading(false);}
  }catch{setError('Não foi possível registrar o aviso. Tente novamente.');}finally{setBusy(false);}
 }
 async function download(path:string,name:string){if(!supabase||busy)return;setBusy(true);setError('');try{const result=await supabase.storage.from('dgsci-support').download(path);if(result.error||!result.data)throw new Error();void logActivity('download_request','support_documents',path);const url=URL.createObjectURL(result.data);const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('Não foi possível baixar o anexo. Confira sua conexão.');}finally{setBusy(false);}}
 async function readFromCenter(item:Notice){
  if(!supabase||!user?.id||busy)return;setBusy(true);setListError('');try{const r=await supabase.from('notice_receipts').upsert({user_id:user.id,publication_id:item.publication_id},{onConflict:'user_id,publication_id',ignoreDuplicates:true});if(r.error)throw r.error;setCenter(false);current.current=item;setNotice(item);setReading(true);setError('');setRevision(n=>n+1);}catch{setListError('Não foi possível abrir o comunicado. Tente novamente.');}finally{setBusy(false);}
 }
 return <><button className="notification-bell" onClick={()=>{setCenter(true);setRevision(n=>n+1);}} aria-label={'Notificações'+(count?', '+count+' novas':'')} title="Central de notificações"><Bell size={20}/>{count>0&&<span aria-hidden="true">{count>99?'99+':count}</span>}</button>
 <Dialog open={center} onOpenChange={setCenter}><DialogContent className="notification-center"><DialogHeader><DialogTitle>Central de notificações</DialogTitle><DialogDescription>Comunicados institucionais, incluindo os avisos já recebidos.</DialogDescription></DialogHeader><div className="notification-center-toolbar"><div className="workspace-segments" role="group" aria-label="Filtrar notificações"><button aria-pressed={!unseen} onClick={()=>{setUnseen(false);setOffset(0);}}>Todos</button><button aria-pressed={unseen} onClick={()=>{setUnseen(true);setOffset(0);}}>Novos {count>0&&`(${count})`}</button></div><ActionButton onClick={()=>setRevision(n=>n+1)} disabled={listLoading} aria-label="Atualizar notificações"><RefreshCw size={16}/></ActionButton></div>
 {listLoading?<p role="status">Carregando notificações…</p>:listError?<p className="form-error" role="alert">{listError}</p>:!items.length?<p className="dashboard-empty">{unseen?'Nenhum aviso novo.':'Nenhuma notificação disponível.'}</p>:<ul className="notification-list">{items.map(item=><li key={item.publication_id}><button disabled={busy} onClick={()=>void readFromCenter(item)} className={item.acknowledged?'':'is-new'}><span>{item.acknowledged?'Recebido':'Novo'}</span><strong>{item.title}</strong><p>{item.description}</p><small>{new Date(item.date+'T12:00:00Z').toLocaleDateString('pt-BR')} · Ler comunicado</small></button></li>)}</ul>}
 <div className="notification-center-pagination"><span>{total?`${offset+1}–${Math.min(offset+20,total)} de ${total}`:'0 notificações'}</span><div><ActionButton disabled={listLoading||offset===0} onClick={()=>setOffset(n=>Math.max(0,n-20))} aria-label="Notificações anteriores"><ChevronLeft size={16}/></ActionButton><ActionButton disabled={listLoading||offset+20>=total} onClick={()=>setOffset(n=>n+20)} aria-label="Próximas notificações"><ChevronRight size={16}/></ActionButton></div></div>
 </DialogContent></Dialog>
 <Dialog open={!!notice} onOpenChange={open=>{if(!open)void acknowledge(false);}}><DialogContent className="notice-notification"><DialogHeader><span className="notice-notification-eyebrow"><Megaphone size={18}/>Novo comunicado</span><DialogTitle>{notice?.title}</DialogTitle><DialogDescription>{notice?.date&&new Date(notice.date+'T12:00:00Z').toLocaleDateString('pt-BR')} · Informação institucional da DGSCI</DialogDescription></DialogHeader>
 {notice&&<><div className={'notice-notification-body'+(reading?' is-reading':'')}><p>{notice.description}</p>{reading&&notice.sections?.map((s,i)=><section key={i}><h3>{s.title}</h3>{s.text&&<p>{s.text}</p>}{s.items&&<ul>{s.items.map((text,j)=><li key={j}>{text}</li>)}</ul>}</section>)}</div>
 {reading&&notice.attachments?.map(file=><ActionButton disabled={busy} key={file.path} onClick={()=>void download(file.path,file.name)}><Paperclip size={16}/>{file.name}</ActionButton>)}
 {error&&<p className="form-error" role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={()=>void acknowledge(false)}>{reading?'Fechar':'Depois'}</ActionButton>{!reading&&<ActionButton disabled={busy} variant="primary" onClick={()=>void acknowledge(true)}>Ler comunicado <ArrowRight size={16}/></ActionButton>}</div></>}
 </DialogContent></Dialog></>;
}
