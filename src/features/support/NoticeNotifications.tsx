import { useEffect, useRef, useState } from 'react';
import { Megaphone, Paperclip, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ActionButton } from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
type Notice={publication_id:string;title:string;description:string;date:string;attachments:{path:string;name:string}[];sections:{title:string;text?:string;items?:string[]}[]};
export default function NoticeNotifications(){
 const {user}=useAuth();
 const [notice,setNotice]=useState<Notice|null>(null),[reading,setReading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=useRef<Notice|null>(null);
 useEffect(()=>{
  let active=true,pending=false;current.current=null;setNotice(null);setReading(false);setError('');
  if(!user)return;
  async function check(){
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
   if(openFull)setReading(true);else{current.current=null;setNotice(null);setReading(false);}
  }catch{setError('Não foi possível registrar o aviso. Tente novamente.');}finally{setBusy(false);}
 }
 async function download(path:string,name:string){if(!supabase||busy)return;setBusy(true);setError('');try{const result=await supabase.storage.from('dgsci-support').download(path);if(result.error||!result.data)throw new Error();const url=URL.createObjectURL(result.data);const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('Não foi possível baixar o anexo. Confira sua conexão.');}finally{setBusy(false);}}
 return <Dialog open={!!notice} onOpenChange={open=>{if(!open)void acknowledge(false);}}><DialogContent className="notice-notification"><DialogHeader><span className="notice-notification-eyebrow"><Megaphone size={18}/>Novo comunicado</span><DialogTitle>{notice?.title}</DialogTitle><DialogDescription>{notice?.date&&new Date(notice.date+'T12:00:00Z').toLocaleDateString('pt-BR')} · Informação institucional da DGSCI</DialogDescription></DialogHeader>
 {notice&&<><div className={'notice-notification-body'+(reading?' is-reading':'')}><p>{notice.description}</p>{reading&&notice.sections?.map((s,i)=><section key={i}><h3>{s.title}</h3>{s.text&&<p>{s.text}</p>}{s.items&&<ul>{s.items.map((text,j)=><li key={j}>{text}</li>)}</ul>}</section>)}</div>
 {reading&&notice.attachments?.map(file=><ActionButton disabled={busy} key={file.path} onClick={()=>void download(file.path,file.name)}><Paperclip size={16}/>{file.name}</ActionButton>)}
 {error&&<p className="form-error" role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={()=>void acknowledge(false)}>{reading?'Fechar':'Depois'}</ActionButton>{!reading&&<ActionButton disabled={busy} variant="primary" onClick={()=>void acknowledge(true)}>Ler comunicado <ArrowRight size={16}/></ActionButton>}</div></>}
 </DialogContent></Dialog>;
}
