import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2, ChevronDown, Clock3, Copy, Inbox, LoaderCircle,
  MessageSquareText, Pause, RefreshCw, Search, Send, UserRound, UsersRound,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { downloadFile, validateFileContent } from '@/lib/fileValidation';
import './support-desk.css';
import './support-desk-typography.css';
import './support-admin-reply.css';
import './support-ui-fixes.css';
import './support-layout-fix.css';
import './support-crm-flow.css';
import './support-productivity.css';
import './support-fixed-layout.css';

type TicketStatus='queued'|'assigned'|'in_progress'|'waiting_customer'|'completed'|'cancelled';
type Ticket={id:string;protocol:string;queue_id:string;service_id:string;cnpj:string;requester_name:string;phone?:string;email?:string;summary?:string;internal_notes?:string;unread?:boolean;last_customer_message?:string|null;last_customer_message_at?:string|null;assigned_to?:string|null;assigned_name?:string|null;city:string;status:TicketStatus;version:number;created_at:string;updated_at:string};
type Message={item_key:string;id:string|null;ticket_id:string;author_kind:'customer'|'agent'|'system';event_action?:'assigned'|'transferred'|'started'|'completed'|null;actor_label?:string;body:string|null;created_at:string};
type InboxData={is_agent?:boolean;available?:boolean;active_count:number;capacity:number;tickets:Ticket[]};
type CatalogItem={id:string;label:string};
type TransferAgent={user_id:string;display_name:string;queue_ids:string[];available:boolean;active_count:number;capacity:number};
type QuickReply={id:string;title:string;body:string};
type Attachment={id:string;file_name:string;file_path:string;mime_type:string;size_bytes:number;created_at:string};

const statusLabels:Record<TicketStatus,string>={queued:'Na fila',assigned:'Novo atendimento',in_progress:'Em atendimento',waiting_customer:'Aguardando cliente',completed:'Concluído',cancelled:'Cancelado'};
const formatCnpj=(value:string)=>value.replace(/\D/g,'').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
const elapsed=(date:string)=>{const seconds=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/1000));const hours=Math.floor(seconds/3600);const minutes=Math.floor((seconds%3600)/60);return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;};
const time=(date:string)=>new Date(date).toLocaleTimeString('pt-BR',{timeZone:'America/Belem',hour:'2-digit',minute:'2-digit'});
const timelineText=(message:Message)=>{if(!message.event_action)return message.body||'';const at=new Date(message.created_at);const day=at.toLocaleDateString('pt-BR',{timeZone:'America/Belem'});const hour=at.toLocaleTimeString('pt-BR',{timeZone:'America/Belem',hour:'2-digit',minute:'2-digit'});return `${message.body||'Atualização do atendimento'} em ${day}, às ${hour}.`;};

export default function SupportDesk(){
 const {user}=useAuth();
 const admin=!!user?.allowedProfiles?.some(profile=>profile==='Diretoria'||profile==='Subdiretoria');
 const superadmin=user?.role==='administrator';
 const [inbox,setInbox]=useState<InboxData>({active_count:0,capacity:5,tickets:[]});
 const [queues,setQueues]=useState<CatalogItem[]>([]),[services,setServices]=useState<CatalogItem[]>([]);
 const [messages,setMessages]=useState<Message[]>([]),[selectedId,setSelectedId]=useState('');
 const [agents,setAgents]=useState<TransferAgent[]>([]),[transferAgent,setTransferAgent]=useState(''),[transferReason,setTransferReason]=useState('');
 const [assignAgent,setAssignAgent]=useState(''),[notes,setNotes]=useState('');
 const [hasMore,setHasMore]=useState(false),[loadingMore,setLoadingMore]=useState(false),[statusOpen,setStatusOpen]=useState(false);
 const [quickReplies,setQuickReplies]=useState<QuickReply[]>([]),[attachments,setAttachments]=useState<Attachment[]>([]),[uploading,setUploading]=useState(false);
 const [notificationsEnabled,setNotificationsEnabled]=useState(()=>typeof Notification!=='undefined'&&Notification.permission==='granted');
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<'active'|'queued'|'waiting'|'completed'>('active');
 const [draft,setDraft]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lastMessageId=useRef<string|null>(null);
 const selected=inbox.tickets.find(ticket=>ticket.id===selectedId)||null;
 const queueLabel=(id:string)=>queues.find(item=>item.id===id)?.label||id;
 const serviceLabel=(id:string)=>services.find(item=>item.id===id)?.label||id;

 const loadInbox=useCallback(async(silent=false)=>{
  if(!supabase)return;
  if(!silent)setLoading(true);
  const [box,catalogQueues,catalogServices,replies]=await Promise.all([
   supabase.rpc('get_my_support_inbox'),
   supabase.from('support_queues').select('id,label').order('label'),
   supabase.from('support_services').select('id,label').eq('enabled',true).order('sort_order'),
   Promise.resolve({data:[],error:null}),
  ]);
  if(box.error){setError(box.error.message.includes('atendimento')?'Seu usuário ainda não está configurado como atendente. A Diretoria ou Subdiretoria pode habilitar suas filas.':'Não foi possível carregar a central de atendimento.');}
  else{const next=box.data as InboxData;setInbox(next);setError('');setSelectedId(current=>next.tickets.some(ticket=>ticket.id===current)?current:(next.tickets[0]?.id||''));}
  if(!catalogQueues.error)setQueues(catalogQueues.data||[]);
  if(!catalogServices.error)setServices(catalogServices.data||[]);
  if(!replies.error)setQuickReplies((replies.data||[]) as QuickReply[]);
  if(admin){const dashboard=await supabase.rpc('get_support_admin_dashboard');if(!dashboard.error)setAgents(((dashboard.data as {agents:TransferAgent[]})?.agents)||[]);}
  if(!silent)setLoading(false);
 },[admin]);
 const loadMessages=useCallback(async(ticketId:string,before:string|null=null)=>{
  if(!supabase||!ticketId){setMessages([]);return;}
  if(before)setLoadingMore(true);
  const {data,error:loadError}=await supabase.rpc('get_support_ticket_messages',{p_ticket:ticketId,p_before:before,p_limit:10});
  const page=(data||[]) as Message[];
  if(loadError)setError('Não foi possível carregar as mensagens deste atendimento.');else{setHasMore(page.length===10);setMessages(current=>before?[...page,...current.filter(item=>!page.some(previous=>previous.item_key===item.item_key))]:page);}
  setLoadingMore(false);
 },[]);
 const loadAttachments=useCallback(async(ticketId:string)=>{if(!supabase||!ticketId){setAttachments([]);return;}const {data}=await supabase.rpc('get_support_attachments',{p_ticket:ticketId});setAttachments((data||[]) as Attachment[]);},[]);
 useEffect(()=>{void loadInbox();const timer=window.setInterval(()=>void loadInbox(true),10000);return()=>window.clearInterval(timer);},[loadInbox]);
 useEffect(()=>{void loadMessages(selectedId);void loadAttachments(selectedId);if(supabase&&selectedId)void supabase.rpc('support_mark_read',{p_ticket:selectedId});},[selectedId,loadMessages,loadAttachments]);
 useEffect(()=>{if(!supabase||!selectedId){setQuickReplies([]);return;}void supabase.rpc('get_support_quick_replies_for_ticket',{p_ticket:selectedId}).then(({data})=>setQuickReplies((data||[]) as QuickReply[]));},[selectedId]);
 useEffect(()=>{setNotes(selected?.internal_notes||'');setAssignAgent('');},[selected?.id,selected?.internal_notes]);
 useEffect(()=>{const last=messages[messages.length-1]?.item_key||null;if(last&&last!==lastMessageId.current){const pane=document.querySelector<HTMLElement>('.support-messages');pane?.scrollTo({top:pane.scrollHeight,behavior:lastMessageId.current?'smooth':'auto'});}lastMessageId.current=last;},[messages]);
 useEffect(()=>{
  if(!supabase)return;
  const channel=supabase.channel(`support-desk-${user?.id||'user'}`).on('postgres_changes',{event:'*',schema:'public',table:'support_tickets'},()=>void loadInbox(true)).on('postgres_changes',{event:'INSERT',schema:'public',table:'support_messages'},payload=>{const row=payload.new as Message;if(row.ticket_id===selectedId)void loadMessages(selectedId);if(row.author_kind==='customer'&&typeof Notification!=='undefined'&&Notification.permission==='granted')new Notification('Nova mensagem no atendimento DGSCI',{body:'Um cliente enviou uma nova mensagem.'});void loadInbox(true);}).subscribe();
  return()=>{void supabase.removeChannel(channel);};
 },[loadInbox,loadMessages,selectedId,user?.id]);

 const visible=useMemo(()=>inbox.tickets.filter(ticket=>{
  if(filter==='active'&&['completed','cancelled'].includes(ticket.status))return false;
  if(filter==='queued'&&ticket.status!=='queued')return false;
  if(filter==='waiting'&&ticket.status!=='waiting_customer')return false;
  if(filter==='completed'&&(!superadmin||ticket.status!=='completed'))return false;
  const service=services.find(item=>item.id===ticket.service_id)?.label||ticket.service_id;
  const haystack=`${ticket.protocol} ${ticket.requester_name} ${ticket.cnpj} ${service}`.toLocaleLowerCase('pt-BR');
  return haystack.includes(query.trim().toLocaleLowerCase('pt-BR'));
 }),[inbox.tickets,filter,query,services,superadmin]);
 const queued=inbox.tickets.filter(ticket=>ticket.status==='queued').length;
 const waiting=inbox.tickets.filter(ticket=>ticket.status==='waiting_customer').length;
 const active=inbox.tickets.filter(ticket=>['assigned','in_progress','waiting_customer'].includes(ticket.status)).length;
 const send=async(event:FormEvent)=>{event.preventDefault();if(!supabase||!selected||!draft.trim()||busy)return;setBusy(true);const body=draft.trim();const {error:sendError}=await supabase.rpc('support_send_message',{p_ticket:selected.id,p_body:body});if(sendError)setError('Não foi possível enviar a mensagem.');else{setDraft('');await Promise.all([loadMessages(selected.id),loadInbox(true)]);}setBusy(false);};
 const setStatus=async(status:TicketStatus)=>{if(!supabase||!selected||busy)return;setBusy(true);setStatusOpen(false);const {error:statusError}=await supabase.rpc('support_set_ticket_status',{p_ticket:selected.id,p_status:status,p_version:selected.version});if(statusError)setError(statusError.code==='40001'?'O atendimento foi atualizado. Confira os dados e tente novamente.':'Não foi possível alterar a situação.');await Promise.all([loadInbox(true),loadMessages(selected.id)]);setBusy(false);};
 const transfer=async()=>{if(!supabase||!selected||!transferAgent||transferReason.trim().length<10||busy)return;setBusy(true);const {error:transferError}=await supabase.rpc('support_transfer_to_queue',{p_ticket:selected.id,p_queue:transferAgent,p_reason:transferReason.trim(),p_version:selected.version});if(transferError)setError(transferError.code==='40001'?'O atendimento foi atualizado. Confira os dados e tente novamente.':transferError.message||'Não foi possível transferir o atendimento.');else{setTransferAgent('');setTransferReason('');setSelectedId('');}await loadInbox(true);setBusy(false);};
 const assign=async()=>{if(!supabase||!selected||!assignAgent||busy)return;setBusy(true);const {error:assignError}=await supabase.rpc('admin_assign_support_ticket',{p_ticket:selected.id,p_agent:assignAgent,p_version:selected.version});if(assignError)setError(assignError.code==='40001'?'O atendimento foi atualizado. Confira os dados e tente novamente.':assignError.message||'Não foi possível atribuir o atendimento.');else setAssignAgent('');await loadInbox(true);setBusy(false);};
 const saveNotes=async()=>{if(!supabase||!selected||busy)return;setBusy(true);const {error:notesError}=await supabase.rpc('support_set_internal_notes',{p_ticket:selected.id,p_notes:notes,p_version:selected.version});if(notesError)setError(notesError.code==='40001'?'O atendimento foi atualizado. Confira os dados e tente novamente.':'Não foi possível salvar as observações.');await loadInbox(true);setBusy(false);};

 const uploadAttachment=async(file:File)=>{if(!supabase||!selected||uploading)return;if(file.size>10485760||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)||!await validateFileContent(file)){setError('Envie uma imagem ou PDF válido, sem conteúdo ativo, de até 10 MB.');return;}setUploading(true);setError('');const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${selected.id}/${crypto.randomUUID()}-${safe}`;const uploaded=await supabase.storage.from('support-attachments').upload(path,file,{contentType:file.type});if(uploaded.error)setError('Não foi possível enviar o arquivo.');else{const registered=await supabase.rpc('support_register_attachment',{p_ticket:selected.id,p_file_name:file.name,p_file_path:path,p_mime_type:file.type,p_size:file.size});if(registered.error){await supabase.storage.from('support-attachments').remove([path]);setError('O arquivo não pôde ser validado e foi removido.');}else{const announced=await supabase.rpc('support_send_message',{p_ticket:selected.id,p_body:`Arquivo enviado: ${file.name}`});if(announced.error)setError('O arquivo foi salvo, mas não foi possível avisar o cliente.');await Promise.all([loadAttachments(selected.id),loadMessages(selected.id),loadInbox(true)]);}}setUploading(false);};
 const openAttachment=async(item:Attachment)=>{if(!supabase)return;const {data,error:signError}=await supabase.storage.from('support-attachments').createSignedUrl(item.file_path,60);if(signError||!data?.signedUrl){setError('Não foi possível baixar o arquivo.');return;}try{await downloadFile(data.signedUrl,item.file_name);}catch{setError('Não foi possível baixar o arquivo.');}};
 const enableNotifications=async()=>{if(typeof Notification==='undefined')return;const permission=await Notification.requestPermission();setNotificationsEnabled(permission==='granted');};
 const toggleAvailability=async()=>{if(!supabase||!inbox.is_agent||busy)return;setBusy(true);const {error:availabilityError}=await supabase.rpc('support_set_my_availability',{p_available:!inbox.available});if(availabilityError)setError('Não foi possível alterar sua disponibilidade.');await loadInbox(true);setBusy(false);};
 const copy=(value:string)=>navigator.clipboard?.writeText(value).catch(()=>undefined);

 return <section className="support-desk-page">
  <header className="support-desk-title"><div><span>CENTRAL DE ATENDIMENTO</span><h1>{admin?'Visão da operação':'Minha caixa'}</h1><p>{admin?'Acompanhe as filas e os atendimentos em andamento.':'Atenda os protocolos distribuídos para sua seção.'}</p></div><div className="support-title-actions">{inbox.is_agent&&<button type="button" className={`support-self-availability ${inbox.available?'is-on':''}`} onClick={()=>void toggleAvailability()} disabled={busy}>{inbox.available?'Disponível':'Indisponível'}</button>}{!notificationsEnabled&&<button type="button" onClick={()=>void enableNotifications()}>Ativar alertas</button>}<button type="button" onClick={()=>void loadInbox()} disabled={loading}><RefreshCw size={16}/>Atualizar</button></div></header>
  <div className="support-kpis">
   <article><MessageSquareText/><div><strong>{active}</strong><span>ativos</span><small>Atendimentos em andamento</small></div></article>
   <article><UserRound/><div><strong>{Math.max(0,inbox.capacity-inbox.active_count)}</strong><span>vagas</span><small>Na capacidade de {inbox.capacity}</small></div></article>
   <article><Inbox/><div><strong>{queued}</strong><span>aguardando</span><small>{admin?'Em todas as seções':'Nas suas filas'}</small></div></article>
   <article><Pause/><div><strong>{waiting}</strong><span>pendentes</span><small>Aguardando o cliente</small></div></article>
  </div>
  {error&&<div className="support-desk-error" role="alert">{error}</div>}
  {loading?<div className="support-desk-loading" role="status"><LoaderCircle size={25}/>Carregando central…</div>:<div className="support-desk-workspace">
   <aside className="support-ticket-pane"><div className="support-pane-heading"><div><strong>{admin?'Atendimentos':'Minha caixa'}</strong><span>{visible.length}</span></div><label><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Protocolo, cliente ou serviço"/></label><div className="support-filters"><button className={filter==='active'?'is-active':''} onClick={()=>setFilter('active')}>Todos</button><button className={filter==='queued'?'is-active':''} onClick={()=>setFilter('queued')}>Fila</button><button className={filter==='waiting'?'is-active':''} onClick={()=>setFilter('waiting')}>Aguardando</button>{superadmin&&<button className={filter==='completed'?'is-active':''} onClick={()=>setFilter('completed')}>Concluídos</button>}</div></div><div className="support-ticket-list">{visible.map(ticket=><button type="button" key={ticket.id} className={[ticket.id===selectedId?'is-selected':'',ticket.unread?'is-unread':''].filter(Boolean).join(' ')} onClick={()=>setSelectedId(ticket.id)}><span><strong>{ticket.protocol}</strong><i className={`is-${ticket.status}${ticket.unread?' has-unread':''}`}/></span><b><Building2 size={14}/>{ticket.requester_name}</b>{ticket.assigned_name&&<span className="support-card-agent">Atendente: {ticket.assigned_name}</span>}<small>{serviceLabel(ticket.service_id)}</small>{ticket.last_customer_message&&<span className="support-card-preview"><b>{ticket.last_customer_message}</b><time>{ticket.last_customer_message_at?time(ticket.last_customer_message_at):''}</time></span>}<em><Clock3 size={13}/>{statusLabels[ticket.status]} · {elapsed(ticket.updated_at)}</em></button>)}{visible.length===0&&<p>Nenhum atendimento neste filtro.</p>}</div></aside>
   <main className="support-conversation">{selected ? <>
    <header><div><strong>{selected.protocol}</strong><span>{selected.requester_name} · {serviceLabel(selected.service_id)}{selected.assigned_name && <> · Atendido por <b>{selected.assigned_name}</b></>}</span></div><div className="support-status-control"><button type="button" className={`support-status is-${selected.status}`} disabled={['queued','completed','cancelled'].includes(selected.status)} onClick={() => setStatusOpen(open => !open)}>{statusLabels[selected.status]}{!['queued','completed','cancelled'].includes(selected.status) && <ChevronDown size={14} />}</button>{statusOpen && <div className="support-status-menu">{selected.status === 'waiting_customer' && <button onClick={() => void setStatus('in_progress')}>Retomar atendimento</button>}{selected.status === 'in_progress' && <button onClick={() => void setStatus('waiting_customer')}>Aguardar cliente</button>}<button className="is-resolve" onClick={() => void setStatus('completed')}>Marcar como resolvido</button></div>}</div></header>
    <div className="support-messages" aria-live="polite">{hasMore && <button className="support-load-more" disabled={loadingMore} onClick={() => void loadMessages(selected.id, messages[0]?.created_at || null)}>{loadingMore ? 'Carregando…' : 'Carregar 10 mensagens anteriores'}</button>}{messages.map(message => {
      const match = (message.body || '').match(/^Arquivo (?:enviado|anexado):\s*(.+)$/i);
      const attachment = match ? attachments.find(item => item.file_name === match[1]) : null;
      return <article key={message.item_key} className={`is-${message.event_action ? 'system' : message.author_kind}`}><small>{message.event_action ? 'Registro do atendimento' : message.actor_label || (message.author_kind === 'customer' ? selected.requester_name : 'DGSCI')}</small>{attachment ? <button type="button" className="support-inline-file" onClick={() => void openAttachment(attachment)}>📎 {attachment.file_name} · {Math.ceil(attachment.size_bytes / 1024)} KB</button> : <p>{timelineText(message)}</p>}<time dateTime={message.created_at}>{time(message.created_at)}</time></article>;
    })}</div>
    <form onSubmit={send}>{admin && selected.status === 'queued' && <p className="support-admin-reply-note">Resposta da administração — atribua o atendimento a um VC para retirá-lo da fila.</p>}<div className="support-composer-tools"><select aria-label="Resposta rápida" defaultValue="" onChange={event => { const reply = quickReplies.find(item => item.id === event.target.value); if (reply) setDraft(reply.body); event.target.value = ''; }}><option value="">Resposta rápida…</option>{quickReplies.map(reply => <option key={reply.id} value={reply.id}>{reply.title}</option>)}</select><label className="support-attach-button">{uploading ? 'Enviando…' : 'Anexar arquivo'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadAttachment(file); event.target.value = ''; }} /></label></div><label className="sr-only" htmlFor="agent-message">Mensagem para o cliente</label><textarea id="agent-message" value={draft} onChange={event => setDraft(event.target.value)} rows={3} maxLength={4000} placeholder="Digite uma mensagem ao cliente…" disabled={['completed','cancelled'].includes(selected.status) || (selected.status === 'queued' && !admin)} /><button type="submit" disabled={busy || !draft.trim() || ['completed','cancelled'].includes(selected.status) || (selected.status === 'queued' && !admin)}><Send size={17} />{busy ? 'Enviando…' : 'Enviar'}</button></form>
   </> : <div className="support-empty"><MessageSquareText size={32} /><strong>Selecione um atendimento</strong><p>A conversa e os dados do cliente aparecerão aqui.</p></div>}</main>
   <aside className="support-customer-pane">{selected?<>
    <header><Building2 size={20}/><strong>Dados do cliente</strong></header>
    <dl><div><dt>CNPJ</dt><dd>{formatCnpj(selected.cnpj)}<button onClick={()=>copy(selected.cnpj)} aria-label="Copiar CNPJ"><Copy size={14}/></button></dd></div><div><dt>Responsável</dt><dd>{selected.requester_name}</dd></div><div><dt>Município</dt><dd>{selected.city}</dd></div><div><dt>Serviço</dt><dd>{serviceLabel(selected.service_id)}</dd></div><div><dt>Protocolo</dt><dd>{selected.protocol}<button onClick={()=>copy(selected.protocol)} aria-label="Copiar protocolo"><Copy size={14}/></button></dd></div><div><dt>Fila</dt><dd>{queueLabel(selected.queue_id)}</dd></div><div><dt>Atendente</dt><dd>{selected.assigned_name||'Ainda não atribuído'}</dd></div></dl>
    {admin&&selected.status==='queued'&&<div className="support-assignment"><strong>Atribuir atendimento</strong><select value={assignAgent} onChange={event=>setAssignAgent(event.target.value)}><option value="">Escolha o VC</option>{agents.filter(agent=>agent.available&&agent.active_count<agent.capacity&&(selected.queue_id==='access'||agent.queue_ids.includes(selected.queue_id))).map(agent=><option key={agent.user_id} value={agent.user_id}>{agent.display_name} · {agent.active_count}/{agent.capacity}</option>)}</select><button disabled={!assignAgent||busy} onClick={()=>void assign()}>Atribuir e retirar da fila</button></div>}
    <div className="support-notes"><strong>Observações internas</strong><textarea rows={3} maxLength={4000} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Registre informações visíveis somente para a equipe DGSCI."/><button disabled={busy||notes===(selected.internal_notes||'')} onClick={()=>void saveNotes()}>Salvar observações</button></div>

    <div className="support-attachment-list"><strong>Anexos</strong>{attachments.length?attachments.map(item=><button key={item.id} onClick={()=>void openAttachment(item)}>{item.file_name}<small>{Math.ceil(item.size_bytes/1024)} KB</small></button>):<p>Nenhum arquivo anexado.</p>}</div>
    {(admin||selected.assigned_to===user?.id)&&['assigned','in_progress','waiting_customer'].includes(selected.status)&&<div className="support-transfer"><strong>Transferir para outra seção</strong><select value={transferAgent} onChange={event=>setTransferAgent(event.target.value)}><option value="">Selecione a seção</option>{queues.filter(queue=>queue.id!==selected.queue_id).map(queue=><option key={queue.id} value={queue.id}>{queue.label}</option>)}</select><textarea rows={2} maxLength={500} value={transferReason} onChange={event=>setTransferReason(event.target.value)} placeholder="Motivo da transferência (mínimo 10 caracteres)"/><button disabled={!transferAgent||transferReason.trim().length<10||busy} onClick={()=>void transfer()}>Transferir para a seção</button></div>}
   </>:<div className="support-empty"><UsersRound size={28}/><p>Dados do atendimento selecionado.</p></div>}</aside>
  </div>}
 </section>;
}
