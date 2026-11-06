import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, Check, CheckCircle2, Clock3, Copy, Inbox, LoaderCircle,
  MessageSquareText, Pause, RefreshCw, Search, Send, UserRound, UsersRound,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import './support-desk.css';
import './support-desk-typography.css';
import './support-admin-reply.css';
import './support-ui-fixes.css';
import './support-layout-fix.css';

type TicketStatus='queued'|'assigned'|'in_progress'|'waiting_customer'|'completed'|'cancelled';
type Ticket={id:string;protocol:string;queue_id:string;service_id:string;cnpj:string;requester_name:string;phone?:string;email?:string;summary?:string;internal_notes?:string;assigned_to?:string|null;assigned_name?:string|null;city:string;status:TicketStatus;version:number;created_at:string;updated_at:string};
type Message={id:string;ticket_id:string;author_kind:'customer'|'agent'|'system';actor_label?:string;body:string;created_at:string};
type InboxData={active_count:number;capacity:number;tickets:Ticket[]};
type CatalogItem={id:string;label:string};
type TransferAgent={user_id:string;display_name:string;queue_ids:string[];available:boolean;active_count:number;capacity:number};

const statusLabels:Record<TicketStatus,string>={queued:'Na fila',assigned:'Novo atendimento',in_progress:'Em atendimento',waiting_customer:'Aguardando cliente',completed:'Concluído',cancelled:'Cancelado'};
const formatCnpj=(value:string)=>value.replace(/\D/g,'').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
const elapsed=(date:string)=>{const seconds=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/1000));const hours=Math.floor(seconds/3600);const minutes=Math.floor((seconds%3600)/60);return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;};
const time=(date:string)=>new Date(date).toLocaleTimeString('pt-BR',{timeZone:'America/Belem',hour:'2-digit',minute:'2-digit'});

export default function SupportDesk(){
 const {user}=useAuth();
 const admin=!!user?.allowedProfiles?.some(profile=>profile==='Diretoria'||profile==='Subdiretoria');
 const [inbox,setInbox]=useState<InboxData>({active_count:0,capacity:5,tickets:[]});
 const [queues,setQueues]=useState<CatalogItem[]>([]),[services,setServices]=useState<CatalogItem[]>([]);
 const [messages,setMessages]=useState<Message[]>([]),[selectedId,setSelectedId]=useState('');
 const [agents,setAgents]=useState<TransferAgent[]>([]),[transferAgent,setTransferAgent]=useState(''),[transferReason,setTransferReason]=useState('');
 const [assignAgent,setAssignAgent]=useState(''),[notes,setNotes]=useState('');
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<'active'|'queued'|'waiting'>('active');
 const [draft,setDraft]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const selected=inbox.tickets.find(ticket=>ticket.id===selectedId)||null;
 const queueLabel=(id:string)=>queues.find(item=>item.id===id)?.label||id;
 const serviceLabel=(id:string)=>services.find(item=>item.id===id)?.label||id;

 const loadInbox=useCallback(async(silent=false)=>{
  if(!supabase)return;
  if(!silent)setLoading(true);
  const [box,catalogQueues,catalogServices]=await Promise.all([
   supabase.rpc('get_my_support_inbox'),
   supabase.from('support_queues').select('id,label').order('label'),
   supabase.from('support_services').select('id,label').eq('enabled',true).order('sort_order'),
  ]);
  if(box.error){setError(box.error.message.includes('atendimento')?'Seu usuário ainda não está configurado como atendente. A Diretoria ou Subdiretoria pode habilitar suas filas.':'Não foi possível carregar a central de atendimento.');}
  else{const next=box.data as InboxData;setInbox(next);setError('');setSelectedId(current=>next.tickets.some(ticket=>ticket.id===current)?current:(next.tickets[0]?.id||''));}
  if(!catalogQueues.error)setQueues(catalogQueues.data||[]);
  if(!catalogServices.error)setServices(catalogServices.data||[]);
  if(admin){const dashboard=await supabase.rpc('get_support_admin_dashboard');if(!dashboard.error)setAgents(((dashboard.data as {agents:TransferAgent[]})?.agents)||[]);}
  if(!silent)setLoading(false);
 },[admin]);
 const loadMessages=useCallback(async(ticketId:string)=>{
  if(!supabase||!ticketId){setMessages([]);return;}
  const {data,error:loadError}=await supabase.rpc('get_support_ticket_messages',{p_ticket:ticketId});
  if(loadError)setError('Não foi possível carregar as mensagens deste atendimento.');else setMessages((data||[]) as Message[]);
 },[]);
 useEffect(()=>{void loadInbox();const timer=window.setInterval(()=>void loadInbox(true),10000);return()=>window.clearInterval(timer);},[loadInbox]);
 useEffect(()=>{void loadMessages(selectedId);},[selectedId,loadMessages]);
 useEffect(()=>{setNotes(selected?.internal_notes||'');setAssignAgent('');},[selected?.id,selected?.internal_notes]);
 useEffect(()=>{
  if(!supabase)return;
  const channel=supabase.channel(`support-desk-${user?.id||'user'}`).on('postgres_changes',{event:'*',schema:'public',table:'support_tickets'},()=>void loadInbox(true)).on('postgres_changes',{event:'INSERT',schema:'public',table:'support_messages'},payload=>{const row=payload.new as Message;if(row.ticket_id===selectedId)void loadMessages(selectedId);}).subscribe();
  return()=>{void supabase.removeChannel(channel);};
 },[loadInbox,loadMessages,selectedId,user?.id]);

 const visible=useMemo(()=>inbox.tickets.filter(ticket=>{
  if(filter==='queued'&&ticket.status!=='queued')return false;
  if(filter==='waiting'&&ticket.status!=='waiting_customer')return false;
  const service=services.find(item=>item.id===ticket.service_id)?.label||ticket.service_id;
  const haystack=`${ticket.protocol} ${ticket.requester_name} ${ticket.cnpj} ${service}`.toLocaleLowerCase('pt-BR');
  return haystack.includes(query.trim().toLocaleLowerCase('pt-BR'));
 }),[inbox.tickets,filter,query,services]);
 const queued=inbox.tickets.filter(ticket=>ticket.status==='queued').length;
 const waiting=inbox.tickets.filter(ticket=>ticket.status==='waiting_customer').length;
 const active=inbox.tickets.filter(ticket=>['assigned','in_progress','waiting_customer'].includes(ticket.status)).length;
 const send=async(event:FormEvent)=>{event.preventDefault();if(!supabase||!selected||!draft.trim()||busy)return;setBusy(true);const body=draft.trim();const {error:sendError}=await supabase.rpc('support_send_message',{p_ticket:selected.id,p_body:body});if(sendError)setError('Não foi possível enviar a mensagem.');else{setDraft('');await Promise.all([loadMessages(selected.id),loadInbox(true)]);}setBusy(false);};
 const setStatus=async(status:TicketStatus)=>{if(!supabase||!selected||busy)return;setBusy(true);const {error:statusError}=await supabase.rpc('support_set_ticket_status',{p_ticket:selected.id,p_status:status,p_version:selected.version});if(statusError)setError(statusError.code==='40001'?'O atendimento foi atualizado. Confira os dados e tente novamente.':'Não foi possível alterar a situação.');await loadInbox(true);setBusy(false);};
 const transfer=async()=>{if(!supabase||!selected||!transferAgent||transferReason.trim().length<10||busy)return;setBusy(true);const {error:transferError}=await supabase.rpc('admin_transfer_support_ticket',{p_ticket:selected.id,p_agent:transferAgent,p_reason:transferReason.trim(),p_version:selected.version});if(transferError)setError(transferError.code==='40001'?'O atendimento foi atualizado. Confira os dados e tente novamente.':transferError.message||'Não foi possível transferir o atendimento.');else{setTransferAgent('');setTransferReason('');}await loadInbox(true);setBusy(false);};
 const assign=async()=>{if(!supabase||!selected||!assignAgent||busy)return;setBusy(true);const {error:assignError}=await supabase.rpc('admin_assign_support_ticket',{p_ticket:selected.id,p_agent:assignAgent,p_version:selected.version});if(assignError)setError(assignError.code==='40001'?'O atendimento foi atualizado. Confira os dados e tente novamente.':assignError.message||'Não foi possível atribuir o atendimento.');else setAssignAgent('');await loadInbox(true);setBusy(false);};
 const saveNotes=async()=>{if(!supabase||!selected||busy)return;setBusy(true);const {error:notesError}=await supabase.rpc('support_set_internal_notes',{p_ticket:selected.id,p_notes:notes,p_version:selected.version});if(notesError)setError(notesError.code==='40001'?'O atendimento foi atualizado. Confira os dados e tente novamente.':'Não foi possível salvar as observações.');await loadInbox(true);setBusy(false);};
 const copy=(value:string)=>navigator.clipboard?.writeText(value).catch(()=>undefined);

 return <section className="support-desk-page">
  <header className="support-desk-title"><div><span>CENTRAL DE ATENDIMENTO</span><h1>{admin?'Visão da operação':'Minha caixa'}</h1><p>{admin?'Acompanhe as filas e os atendimentos em andamento.':'Atenda os protocolos distribuídos para sua seção.'}</p></div><button type="button" onClick={()=>void loadInbox()} disabled={loading}><RefreshCw size={16}/>Atualizar</button></header>
  <div className="support-kpis">
   <article><MessageSquareText/><div><strong>{active}</strong><span>ativos</span><small>Atendimentos em andamento</small></div></article>
   <article><UserRound/><div><strong>{Math.max(0,inbox.capacity-inbox.active_count)}</strong><span>vagas</span><small>Na capacidade de {inbox.capacity}</small></div></article>
   <article><Inbox/><div><strong>{queued}</strong><span>aguardando</span><small>{admin?'Em todas as seções':'Nas suas filas'}</small></div></article>
   <article><Pause/><div><strong>{waiting}</strong><span>pendentes</span><small>Aguardando o cliente</small></div></article>
  </div>
  {error&&<div className="support-desk-error" role="alert">{error}</div>}
  {loading?<div className="support-desk-loading" role="status"><LoaderCircle size={25}/>Carregando central…</div>:<div className="support-desk-workspace">
   <aside className="support-ticket-pane"><div className="support-pane-heading"><div><strong>{admin?'Atendimentos':'Minha caixa'}</strong><span>{visible.length}</span></div><label><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Protocolo, cliente ou serviço"/></label><div className="support-filters"><button className={filter==='active'?'is-active':''} onClick={()=>setFilter('active')}>Todos</button><button className={filter==='queued'?'is-active':''} onClick={()=>setFilter('queued')}>Fila</button><button className={filter==='waiting'?'is-active':''} onClick={()=>setFilter('waiting')}>Aguardando</button></div></div><div className="support-ticket-list">{visible.map(ticket=><button type="button" key={ticket.id} className={ticket.id===selectedId?'is-selected':''} onClick={()=>setSelectedId(ticket.id)}><span><strong>{ticket.protocol}</strong><i className={`is-${ticket.status}`}/></span><b><Building2 size={14}/>{ticket.requester_name}</b><small>{serviceLabel(ticket.service_id)}</small><em><Clock3 size={13}/>{statusLabels[ticket.status]} · {elapsed(ticket.updated_at)}</em></button>)}{visible.length===0&&<p>Nenhum atendimento neste filtro.</p>}</div></aside>
   <main className="support-conversation">{selected?<><header><div><strong>{selected.protocol}</strong><span>{selected.requester_name} · {serviceLabel(selected.service_id)}{selected.assigned_name&&<> · Atendido por <b>{selected.assigned_name}</b></>}</span></div><span className={`support-status is-${selected.status}`}>{statusLabels[selected.status]}</span></header><div className="support-messages" aria-live="polite">{messages.map(message=><article key={message.id} className={`is-${message.author_kind}`}><small>{message.actor_label||(message.author_kind==='customer'?selected.requester_name:'DGSCI')}</small><p>{message.body}</p><time dateTime={message.created_at}>{time(message.created_at)}</time></article>)}</div><form onSubmit={send}>{admin&&selected.status==='queued'&&<p className="support-admin-reply-note">Resposta da administração — atribua o atendimento a um VC para retirá-lo da fila.</p>}<label className="sr-only" htmlFor="agent-message">Mensagem para o cliente</label><textarea id="agent-message" value={draft} onChange={event=>setDraft(event.target.value)} rows={3} maxLength={4000} placeholder="Digite uma mensagem ao cliente…" disabled={['completed','cancelled'].includes(selected.status)||(selected.status==='queued'&&!admin)}/><button type="submit" disabled={busy||!draft.trim()||['completed','cancelled'].includes(selected.status)||(selected.status==='queued'&&!admin)}><Send size={17}/>{busy?'Enviando…':'Enviar'}</button></form></>:<div className="support-empty"><MessageSquareText size={32}/><strong>Selecione um atendimento</strong><p>A conversa e os dados do cliente aparecerão aqui.</p></div>}</main>
   <aside className="support-customer-pane">{selected?<>
    <header><Building2 size={20}/><strong>Dados do cliente</strong></header>
    <dl><div><dt>CNPJ</dt><dd>{formatCnpj(selected.cnpj)}<button onClick={()=>copy(selected.cnpj)} aria-label="Copiar CNPJ"><Copy size={14}/></button></dd></div><div><dt>Responsável</dt><dd>{selected.requester_name}</dd></div><div><dt>Município</dt><dd>{selected.city}</dd></div><div><dt>Serviço</dt><dd>{serviceLabel(selected.service_id)}</dd></div><div><dt>Protocolo</dt><dd>{selected.protocol}<button onClick={()=>copy(selected.protocol)} aria-label="Copiar protocolo"><Copy size={14}/></button></dd></div><div><dt>Fila</dt><dd>{queueLabel(selected.queue_id)}</dd></div><div><dt>Atendente</dt><dd>{selected.assigned_name||'Ainda não atribuído'}</dd></div></dl>
    {admin&&selected.status==='queued'&&<div className="support-assignment"><strong>Atribuir atendimento</strong><select value={assignAgent} onChange={event=>setAssignAgent(event.target.value)}><option value="">Escolha o VC</option>{agents.filter(agent=>agent.available&&agent.active_count<agent.capacity&&(selected.queue_id==='access'||agent.queue_ids.includes(selected.queue_id))).map(agent=><option key={agent.user_id} value={agent.user_id}>{agent.display_name} · {agent.active_count}/{agent.capacity}</option>)}</select><button disabled={!assignAgent||busy} onClick={()=>void assign()}>Atribuir e retirar da fila</button></div>}
    <div className="support-notes"><strong>Observações internas</strong><textarea rows={3} maxLength={4000} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Registre informações visíveis somente para a equipe DGSCI."/><button disabled={busy||notes===(selected.internal_notes||'')} onClick={()=>void saveNotes()}>Salvar observações</button></div>
    <section><h2><Clock3 size={17}/>Histórico do atendimento</h2><ol>{messages.map(message=><li key={message.id}><i/><div><strong>{message.actor_label||(message.author_kind==='customer'?'Mensagem do cliente':'Resposta da DGSCI')}</strong><small>{new Date(message.created_at).toLocaleString('pt-BR',{timeZone:'America/Belem'})}</small></div></li>)}</ol></section>
    {admin&&['assigned','in_progress','waiting_customer'].includes(selected.status)&&<div className="support-transfer"><strong>Transferir atendimento</strong><select value={transferAgent} onChange={event=>setTransferAgent(event.target.value)}><option value="">Escolha o VC</option>{agents.filter(agent=>agent.available&&agent.user_id!==selected.assigned_to&&agent.active_count<agent.capacity&&(selected.queue_id==='access'||agent.queue_ids.includes(selected.queue_id))).map(agent=><option key={agent.user_id} value={agent.user_id}>{agent.display_name} · {agent.active_count}/{agent.capacity}</option>)}</select><textarea rows={2} maxLength={500} value={transferReason} onChange={event=>setTransferReason(event.target.value)} placeholder="Justificativa obrigatória (mínimo 10 caracteres)"/><button disabled={!transferAgent||transferReason.trim().length<10||busy} onClick={()=>void transfer()}>Confirmar transferência</button></div>}
    <footer>{selected.status==='assigned'&&<button onClick={()=>void setStatus('in_progress')} disabled={busy}><UserRound size={16}/>Iniciar</button>}{selected.status==='waiting_customer'&&<button onClick={()=>void setStatus('in_progress')} disabled={busy}><MessageSquareText size={16}/>Retomar</button>}{selected.status==='in_progress'&&<button onClick={()=>void setStatus('waiting_customer')} disabled={busy}><Pause size={16}/>Aguardar cliente</button>}{['assigned','in_progress','waiting_customer'].includes(selected.status)&&<button className="is-primary" onClick={()=>void setStatus('completed')} disabled={busy}><Check size={16}/>Resolvido</button>}</footer>
   </>:<div className="support-empty"><UsersRound size={28}/><p>Dados do atendimento selecionado.</p></div>}</aside>
  </div>}
 </section>;
}
