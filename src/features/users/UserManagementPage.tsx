import { useCallback, useEffect, useState } from 'react';
import { UsersRound, UserPlus, Pencil, ShieldCheck, LockKeyhole, UnlockKeyhole, RefreshCw, Save, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PageHeader, ActionButton, SearchField, DataPanel, SummaryStrip, EmptyResults, LoadState, usePagination, TablePagination } from '@/components/workspace/Workspace';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { isFullAdministrator, normalizeSearch } from '@/features/records/recordAccess';
import { USER_SECTORS, USER_STATUS_LABELS, isManagedSuperadmin, type ManagedUser } from './types';
import type { UserProfile } from '@/types/auth';

type Draft = {
 email:string; name:string; sectors:UserProfile[]; superadmin:boolean;
 enabled:boolean; original:ManagedUser|null;
};
function rpcMessage(problem:{code?:string;message?:string}|null){
 if(problem?.code==='42501')return 'Sua conta não possui permissão para gerenciar usuários.';
 if(problem?.code==='40001')return 'Este cadastro foi alterado. Atualize a lista e abra a edição novamente.';
 if(problem?.code==='23505')return 'Este e-mail já está cadastrado.';
 if(problem?.code==='22023')return problem.message || 'Confira os dados informados.';
 return 'Não foi possível concluir. Verifique a conexão e tente novamente.';
}
const dateLabel=(value:string|null)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Ainda não acessou';

export default function UserManagementPage(){
 const {user}=useAuth();const allowed=isFullAdministrator(user);
 const [accounts,setAccounts]=useState<ManagedUser[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [query,setQuery]=useState('');const [status,setStatus]=useState('all');
 const [sector,setSector]=useState('all');const [revision,setRevision]=useState(0);
 const [draft,setDraft]=useState<Draft|null>(null);
 const [confirmation,setConfirmation]=useState<ManagedUser|null>(null);
 const [busy,setBusy]=useState(false);const [formError,setFormError]=useState('');
 const [message,setMessage]=useState('');
 const reload=useCallback(()=>setRevision(value=>value+1),[]);
 const ownEmail=user?.email?.toLowerCase();
 useEffect(()=>{
  let current=true;setError('');
  if(!allowed){setAccounts([]);setLoading(false);return;}
  setLoading(true);
  (async()=>{
   try{
    if(!supabase)throw new Error('Conexão não configurada.');
    const {data,error:problem}=await supabase.rpc('admin_list_users');
    if(problem)throw new Error(rpcMessage(problem));
    if(!Array.isArray(data))throw new Error('Resposta de usuários inválida.');
    if(current)setAccounts(data as ManagedUser[]);
   }catch(reason){if(current)setError(reason instanceof Error?reason.message:'Não foi possível carregar os usuários.');}
   finally{if(current)setLoading(false);}
  })();
  return()=>{current=false;};
 },[allowed,revision]);
 const rows=accounts.filter(account=>normalizeSearch(account.display_name+' '+account.email).includes(normalizeSearch(query)) &&
  (status==='all'||account.status===status) && (sector==='all'||account.sectors.includes(sector as UserProfile)));
 const pagination=usePagination(rows,query+'|'+status+'|'+sector);
 function edit(account:ManagedUser){
  setFormError('');setDraft({email:account.email,name:account.display_name,sectors:account.sectors,
   superadmin:isManagedSuperadmin(account),enabled:account.enabled,original:account});
 }
 async function persist(next:Draft){
  if(!supabase)throw new Error('Conexão não configurada.');
  const selected=next.superadmin?USER_SECTORS:next.sectors;
  if(!next.name.trim()||!selected.length)throw new Error('Informe o nome e ao menos um setor.');
  const {error:problem}=await supabase.rpc('admin_save_user',{
   p_email:next.email.trim().toLowerCase(),p_display_name:next.name.trim(),p_sectors:selected,
   p_enabled:next.enabled,p_superadmin:next.superadmin,p_expected_version:next.original?.version??null,
  });
  if(problem)throw new Error(rpcMessage(problem));
 }
 if(!allowed)return <section className="workspace-page"><PageHeader eyebrow="Administração do sistema" title="Gestão de Usuários" description="Controle de contas e permissões de acesso." icon={UsersRound}/><div className="workspace-feedback is-error" role="alert">Acesso exclusivo do superadministrador.</div></section>;
 return <section className="workspace-page">
  <PageHeader eyebrow="Administração do sistema" title="Gestão de Usuários" description="Cadastre os acessos e defina os setores de cada usuário." icon={UsersRound}
   actions={<><ActionButton disabled={loading||busy} onClick={reload}><RefreshCw size={16}/>Atualizar</ActionButton><ActionButton variant="primary" onClick={()=>{setFormError('');setDraft({email:'',name:'',sectors:[],enabled:true,superadmin:false,original:null});}}><UserPlus size={17}/>Cadastrar usuário</ActionButton></>}/>
  <SummaryStrip items={[
   {label:'Usuários ativos',value:accounts.filter(account=>account.status==='active').length},
   {label:'Aguardando acesso / confirmação',value:accounts.filter(account=>account.status.startsWith('pending_')).length},
   {label:'Acessos bloqueados',value:accounts.filter(account=>account.status==='blocked').length},
  ]}/>
  {message&&<p className="workspace-feedback" role="status">{message}</p>}
  <DataPanel title="Contas cadastradas" count={rows.length} toolbar={<>
   <SearchField id="users-query" value={query} onChange={setQuery} placeholder="Buscar por nome ou e-mail…"/>
   <div className="workspace-filter"><label htmlFor="users-status">Situação</label><select id="users-status" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">Todas</option>{Object.entries(USER_STATUS_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
   <div className="workspace-filter"><label htmlFor="users-sector">Setor</label><select id="users-sector" value={sector} onChange={event=>setSector(event.target.value)}><option value="all">Todos os setores</option>{USER_SECTORS.map(value=><option key={value}>{value}</option>)}</select></div>
  </>} footer={!loading&&!error&&<TablePagination {...pagination}/>}>
   {loading||error?<LoadState error={error} onRetry={reload} label="Carregando usuários…"/>:<div className="records-table"><table><thead><tr><th>Usuário</th><th>Setores e acesso</th><th>Situação</th><th>Último acesso</th><th className="table-actions-heading">Ações</th></tr></thead><tbody>{pagination.rows.map(account=><tr key={account.email}>
    <td><strong className="table-primary">{account.display_name}{account.email===ownEmail&&<span className="workspace-badge">Você</span>}</strong><span className="table-secondary">{account.email}</span></td>
    <td><div className="user-sector-tags">{isManagedSuperadmin(account)?<span className="workspace-badge"><ShieldCheck size={12}/>Superadministrador</span>:account.sectors.map(value=><span className="workspace-badge" key={value}>{value}</span>)}</div></td>
    <td><span className={'workspace-badge user-status-'+account.status}>{USER_STATUS_LABELS[account.status]}</span></td><td><span className="table-secondary">{dateLabel(account.last_sign_in_at)}</span></td>
    <td className="table-actions"><div><ActionButton variant="ghost" disabled={busy} onClick={()=>edit(account)} aria-label={'Editar '+account.display_name}><Pencil size={15}/>Editar</ActionButton><ActionButton variant="ghost" disabled={busy||account.email===ownEmail} title={account.email===ownEmail?'O próprio superadministrador não pode bloquear seu acesso':undefined} onClick={()=>{setFormError('');setConfirmation(account);}}>{account.enabled?<LockKeyhole size={15}/>:<UnlockKeyhole size={15}/>} {account.enabled?'Bloquear':'Liberar'}</ActionButton></div></td>
   </tr>)}</tbody></table>{!rows.length&&<EmptyResults onClear={()=>{setQuery('');setStatus('all');setSector('all');}}/>}</div>}
  </DataPanel>
  <p className="workspace-footnote">Cadastrar um acesso autoriza o e-mail. No primeiro acesso, o usuário escolhe sua senha e confirma o cadastro pelo e-mail recebido.</p>
  <Dialog open={!!draft} onOpenChange={open=>{if(!open&&!busy){setDraft(null);setFormError('');}}}><DialogContent className="record-dialog editor-dialog"><DialogHeader><span className="dialog-context"><UsersRound size={17}/>GESTÃO DE USUÁRIOS</span><DialogTitle>{draft?.original?'Editar usuário':'Cadastrar usuário'}</DialogTitle><DialogDescription>Defina o acesso aos setores. A senha é escolhida pelo próprio usuário.</DialogDescription></DialogHeader>{draft&&<form className="record-form" onSubmit={async event=>{
   event.preventDefault();if(busy)return;setBusy(true);setFormError('');try{await persist(draft);setMessage(draft.original?'Cadastro atualizado.':'Acesso cadastrado. O usuário já pode iniciar seu primeiro acesso.');setDraft(null);reload();}catch(reason){setFormError(reason instanceof Error?reason.message:'Não foi possível salvar.');}finally{setBusy(false);}
  }}>
   <section className="editor-section"><h3>Identificação</h3><div className="form-field"><label htmlFor="user-name">Nome completo *</label><input id="user-name" required minLength={2} maxLength={160} value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})}/></div><div className="form-field"><label htmlFor="user-email">E-mail *</label><input id="user-email" type="email" required maxLength={254} readOnly={!!draft.original} value={draft.email} onChange={event=>setDraft({...draft,email:event.target.value})}/>{draft.original&&<small className="workspace-footnote">O e-mail identifica este cadastro e não pode ser alterado aqui.</small>}</div></section>
   <section className="editor-section"><h3>Setores autorizados *</h3><div className="user-sector-options">{USER_SECTORS.map(value=><label className="record-check" key={value}><input type="checkbox" checked={draft.superadmin||draft.sectors.includes(value)} disabled={draft.superadmin} onChange={event=>setDraft({...draft,sectors:event.target.checked?[...draft.sectors,value]:draft.sectors.filter(item=>item!==value)})}/><span>{value}</span></label>)}</div></section>
   <section className="editor-section"><h3>Permissões administrativas</h3><label className="record-check"><input type="checkbox" checked={draft.superadmin} disabled={draft.email.toLowerCase()===ownEmail} onChange={event=>setDraft({...draft,superadmin:event.target.checked,sectors:event.target.checked?[...USER_SECTORS]:draft.sectors})}/><span>Superadministrador<small>Acesso a todos os setores e à gestão de usuários.</small></span></label><label className="record-check"><input type="checkbox" checked={draft.enabled} disabled={draft.email.toLowerCase()===ownEmail} onChange={event=>setDraft({...draft,enabled:event.target.checked})}/><span>Acesso liberado<small>Contas bloqueadas não podem consultar nem alterar dados.</small></span></label></section>
   {draft.superadmin&&draft.email.toLowerCase()!==ownEmail&&<p className="workspace-feedback">Este usuário poderá gerenciar outros acessos. Confirme essa permissão antes de salvar.</p>}
   {formError&&<p className="form-error" role="alert">{formError}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={()=>setDraft(null)}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy}><Save size={16}/>{busy?'Salvando…':'Salvar cadastro'}</ActionButton></div>
  </form>}</DialogContent></Dialog>
  <Dialog open={!!confirmation} onOpenChange={open=>{if(!open&&!busy){setConfirmation(null);setFormError('');}}}><DialogContent className="record-dialog compact-dialog"><DialogHeader><DialogTitle>{confirmation?.enabled?'Bloquear acesso':'Liberar acesso'}</DialogTitle><DialogDescription>{confirmation?.display_name} · {confirmation?.email}</DialogDescription></DialogHeader>{confirmation&&<div className="detail-body"><p>{confirmation.enabled?'Este usuário perderá acesso aos dados do sistema. Seu cadastro e os registros anteriores serão preservados.':'O usuário poderá acessar os setores autorizados após concluir o cadastro e confirmar o e-mail.'}</p>{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={()=>setConfirmation(null)}>Cancelar</ActionButton><ActionButton variant="primary" disabled={busy} onClick={async()=>{
   setBusy(true);setFormError('');try{await persist({email:confirmation.email,name:confirmation.display_name,sectors:confirmation.sectors,superadmin:isManagedSuperadmin(confirmation),enabled:!confirmation.enabled,original:confirmation});setMessage(confirmation.enabled?'Acesso bloqueado.':'Acesso liberado.');setConfirmation(null);reload();}catch(reason){setFormError(reason instanceof Error?reason.message:'Não foi possível alterar o acesso.');}finally{setBusy(false);}
  }}>{busy?'Salvando…':confirmation.enabled?'Confirmar bloqueio':'Confirmar liberação'}</ActionButton></div></div>}</DialogContent></Dialog>
  <div className="user-first-access"><div><strong>Orientação de primeiro acesso</strong><p>Após cadastrar o usuário, compartilhe o endereço do portal. Ele deverá clicar em “Primeiro acesso”, escolher sua senha e confirmar o e-mail.</p></div><ActionButton onClick={async()=>{try{await navigator.clipboard.writeText(window.location.origin+'/login');setMessage('Endereço de acesso copiado.');}catch{setMessage('Endereço de acesso: '+window.location.origin+'/login');}}}><Copy size={15}/>Copiar endereço</ActionButton></div>
 </section>;
}
