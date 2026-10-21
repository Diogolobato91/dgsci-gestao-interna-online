import { useState } from 'react';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { ActionButton } from '@/components/workspace/Workspace';
import { MILITARY_RANKS } from '@/lib/rankHierarchy';
import { maskCpf,validateCpf,cleanDigits,validateBirthDate } from '@/lib/userValidation';
import { supabase } from '@/lib/supabase';
import { institutionalToday,toInputDate,staffOperationError,validPeriod } from './staffAvailability';
import type { Staff } from './staffAvailability';

export default function StaffEditor({person,onClose,onSaved}:{person:Partial<Staff>;onClose:()=>void;onSaved:()=>void}) {
  const [draft,setDraft]=useState({...person,postoGraduacao:person.postoGraduacao||'SD',dataNascimento:toInputDate(person.dataNascimento)});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="record-dialog editor-dialog"><DialogHeader><DialogTitle>{person.id?'Editar cadastro do efetivo':'Novo integrante do efetivo'}</DialogTitle><DialogDescription>Dados desconhecidos podem permanecer em branco. O cadastro do efetivo não concede acesso ao portal.</DialogDescription></DialogHeader><form className="record-form" onSubmit={async e=>{
    e.preventDefault();if(busy||!supabase)return;setBusy(true);setError('');
    try {
      const cpf=cleanDigits(draft.cpf);const previous=cleanDigits(person.cpf);const contact=cleanDigits(draft.contato);
      if(cpf&&cpf!==previous&&!validateCpf(cpf))throw new Error('Informe um CPF válido ou deixe o campo em branco.');
      if(contact&&!/^\d{10,11}$/.test(contact))throw new Error('Informe o contato com DDD (10 ou 11 dígitos).');
      if(draft.dataNascimento&&(!validateBirthDate(draft.dataNascimento).valid||!validPeriod(draft.dataNascimento,draft.dataNascimento)))throw new Error('Confira a data de nascimento.');
      const result=await supabase.rpc('save_staff_member',{p_id:person.id||null,p_version:person.version??null,p_nome:draft.nome?.trim(),p_rank:draft.postoGraduacao,p_mf:draft.mf?.trim()||null,p_cpf:cpf||null,p_birth:draft.dataNascimento||null,p_contact:contact||null});
      if(result.error)throw new Error(staffOperationError(result.error));onSaved();
    }catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar.');}finally{setBusy(false);}
  }}><section className="editor-section"><div className="form-grid">
    <div className="form-field form-field-wide"><label htmlFor="staff-name">Nome completo *</label><input id="staff-name" required minLength={2} maxLength={160} autoComplete="name" value={draft.nome||''} onChange={e=>setDraft({...draft,nome:e.target.value})}/></div>
    <div className="form-field"><label htmlFor="staff-rank">Posto / graduação *</label><select id="staff-rank" required value={draft.postoGraduacao} onChange={e=>setDraft({...draft,postoGraduacao:e.target.value})}>{!MILITARY_RANKS.some(r=>r===draft.postoGraduacao)&&<option value="">Selecione uma graduação</option>}{MILITARY_RANKS.map(rank=><option key={rank}>{rank}</option>)}</select></div>
    <div className="form-field"><label htmlFor="staff-mf">Matrícula</label><input id="staff-mf" minLength={2} maxLength={50} value={draft.mf||''} onChange={e=>setDraft({...draft,mf:e.target.value})}/></div>
    <div className="form-field"><label htmlFor="staff-cpf">CPF</label><input id="staff-cpf" inputMode="numeric" maxLength={14} value={maskCpf(draft.cpf)} onChange={e=>setDraft({...draft,cpf:maskCpf(e.target.value)})}/></div>
    <div className="form-field"><label htmlFor="staff-birth">Nascimento</label><input id="staff-birth" type="date" min="1900-01-01" max={institutionalToday()} value={draft.dataNascimento||''} onChange={e=>setDraft({...draft,dataNascimento:e.target.value})}/></div>
    <div className="form-field form-field-wide"><label htmlFor="staff-contact">Contato (DDD + telefone)</label><input id="staff-contact" type="tel" inputMode="tel" maxLength={20} placeholder="(91) 99999-9999" value={draft.contato||''} onChange={e=>setDraft({...draft,contato:e.target.value})}/><small>O telefone fica disponível na escala. Deixe em branco para remover o contato.</small></div>
  </div></section>{error&&<p role="alert" className="form-error">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={onClose}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy}>{busy?'Salvando…':'Salvar cadastro'}</ActionButton></div></form></DialogContent></Dialog>;
}
