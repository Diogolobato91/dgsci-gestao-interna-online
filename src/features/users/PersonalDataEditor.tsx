import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ActionButton } from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
import { MILITARY_RANKS } from '@/lib/rankHierarchy';
import { maskCpf, validateCpf } from '@/lib/userValidation';
import type { ManagedUser } from './types';
export default function PersonalDataEditor({account,onClose,onSaved}:{account:ManagedUser;onClose:()=>void;onSaved:()=>void}){
 const [name,setName]=useState(account.display_name),[rank,setRank]=useState(account.posto_graduacao||''),[mf,setMf]=useState(account.matricula||''),[cpf,setCpf]=useState(maskCpf(account.cpf)),[birth,setBirth]=useState(account.data_nascimento||''),[phone,setPhone]=useState(account.contato||'');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <Dialog open onOpenChange={o=>{if(!o&&!busy)onClose();}}><DialogContent className="record-dialog editor-dialog"><DialogHeader><DialogTitle>Corrigir dados pessoais</DialogTitle><DialogDescription>{account.email}. Esta alteração preserva a situação e as permissões de acesso.</DialogDescription></DialogHeader><form className="record-form" onSubmit={async e=>{e.preventDefault();if(!supabase||busy)return;setError('');if(cpf&&!validateCpf(cpf)){setError('CPF inválido. Confira os dígitos.');return;}setBusy(true);try{
 const result=await supabase.rpc('admin_update_personal_data',{p_user_id:account.user_id,p_version:account.version,p_nome:name.trim(),p_posto:rank||null,p_matricula:mf.trim()||null,p_cpf:cpf.replace(/\D/g,'')||null,p_nascimento:birth||null,p_contato:phone.replace(/\D/g,'')||null});
 if(result.error)throw new Error(result.error.code==='40001'?'Cadastro alterado por outra pessoa. Feche e atualize a lista.':result.error.code==='23505'?'Os dados informados conflitam com outro cadastro existente.':result.error.code==='22023'?result.error.message:'Não foi possível salvar. Confira sua permissão e conexão.');onSaved();onClose();
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}}}>
 <div className="form-field"><label htmlFor="personal-name">Nome completo *</label><input id="personal-name" required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></div>
 <div className="form-field"><label htmlFor="personal-rank">Posto / graduação</label><select id="personal-rank" value={rank} onChange={e=>setRank(e.target.value)}><option value="">Não informado</option>{MILITARY_RANKS.map(r=><option key={r}>{r}</option>)}</select></div>
 <div className="form-field"><label htmlFor="personal-mf">Matrícula</label><input id="personal-mf" maxLength={50} value={mf} onChange={e=>setMf(e.target.value)}/></div>
 <div className="form-field"><label htmlFor="personal-cpf">CPF</label><input id="personal-cpf" inputMode="numeric" maxLength={14} value={cpf} onChange={e=>setCpf(maskCpf(e.target.value))}/></div>
 <div className="form-field"><label htmlFor="personal-birth">Data de nascimento</label><input id="personal-birth" type="date" min="1900-01-01" value={birth} onChange={e=>setBirth(e.target.value)}/></div>
 <div className="form-field"><label htmlFor="personal-phone">Contato com DDD</label><input id="personal-phone" type="tel" maxLength={20} value={phone} onChange={e=>setPhone(e.target.value)}/></div>
 <p className="workspace-description">Informações desconhecidas podem permanecer em branco. As correções ficam registradas no histórico da conta.</p>{error&&<p role="alert" className="form-error">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={onClose}>Cancelar</ActionButton><ActionButton disabled={busy} type="submit" variant="primary">{busy?'Salvando…':'Salvar dados pessoais'}</ActionButton></div>
 </form></DialogContent></Dialog>;
}
