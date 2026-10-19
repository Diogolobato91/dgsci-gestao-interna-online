import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
type Field = {key: string; label: string; multiline?: boolean; required?: boolean};
export default function RecordEditor({table, record, fields, onClose, onSaved}: {table: 'sat_commands' | 'sat_regions'; record: Record<string, unknown>; fields: Field[]; onClose: () => void; onSaved: () => void}) {
 const [draft,setDraft]=useState(record);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="record-dialog"><DialogHeader><DialogTitle>{record.id?'Alterar registro':'Adicionar SAT'}</DialogTitle><DialogDescription>As alterações serão salvas para consulta dos setores.</DialogDescription></DialogHeader><form className="record-form" onSubmit={async event=>{
 event.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');
 try{const values: Record<string, unknown>=Object.fromEntries(fields.map(field=>[field.key,String(draft[field.key]??'').trim()]));if(table==='sat_regions')values.is_demo=draft.is_demo===true;
 const result=record.id?await supabase.from(table).update(values).eq('id',record.id).eq('version',record.version).select('id'):await supabase.from(table).insert(values).select('id');
 if(result.error)throw new Error('Não foi possível salvar. Confira sua conexão e permissão.');if(!result.data?.length)throw new Error('O registro mudou durante a edição. Atualize a consulta e tente novamente.');onSaved();onClose();
 }catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar.');}finally{setBusy(false);}
 }}>{fields.map(field=><div key={field.key}><label htmlFor={'field-'+field.key}>{field.label}</label>{field.multiline?<textarea id={'field-'+field.key} rows={4} required={field.required} value={String(draft[field.key]??'')} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>:<input id={'field-'+field.key} required={field.required} value={String(draft[field.key]??'')} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>}</div>)}
 {table==='sat_regions'&&<label><input type="checkbox" checked={draft.is_demo===true} onChange={event=>setDraft({...draft,is_demo:event.target.checked})}/> Registro demonstrativo, pendente de validação</label>}{error&&<p role="alert">{error}</p>}<div className="record-actions"><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="portal-primary" disabled={busy}>{busy?'Salvando…':'Salvar'}</button></div></form></DialogContent></Dialog>;
}
