import {recordSaveError,validateRecordFields} from './recordValidation';
import { useState } from 'react';
import { Save, Shield, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ActionButton } from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
type Field={key:string;label:string;multiline?:boolean;required?:boolean};
export default function RecordEditor({table,record,fields,onClose,onSaved}:{table:'sat_commands'|'sat_regions';record:Record<string,unknown>;fields:Field[];onClose:()=>void;onSaved:()=>void}){
  const [draft,setDraft]=useState(record);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const command=table==='sat_commands';
  function fieldInput(field:Field){return <div className={`form-field ${field.multiline?'form-field-wide':''}`} key={field.key}><label htmlFor={'field-'+field.key}>{field.label}{field.required&&<span aria-hidden="true"> *</span>}</label>{field.multiline?<textarea id={'field-'+field.key} rows={4} maxLength={4000} required={field.required} value={String(draft[field.key]??'')} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>:<input id={'field-'+field.key} maxLength={180} required={field.required} value={String(draft[field.key]??'')} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>}</div>;}
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="record-dialog editor-dialog"><DialogHeader><span className="dialog-context">{command?<Shield size={17}/>:<MapPin size={17}/>} {command?'COMANDO DAS SATS':'UNIDADES REGIONAIS'}</span><DialogTitle>{record.id?'Editar '+(command?'comando da SAT':'SAT regional'):'Adicionar SAT regional'}</DialogTitle><DialogDescription>Confira os dados antes de salvar. Campos com * são obrigatórios.</DialogDescription></DialogHeader>
    <form className="record-form" onSubmit={async event=>{
      event.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');
      try{const validation=validateRecordFields(fields,draft);if(validation)throw new Error(validation);const values:Record<string,unknown>=Object.fromEntries(fields.map(field=>[field.key,String(draft[field.key]??'').trim()]));if(table==='sat_regions')values.is_demo=draft.is_demo===true;
        const result=record.id?await supabase.from(table).update(values).eq('id',record.id).eq('version',record.version).select('id'):await supabase.from(table).insert(values).select('id');
        if(result.error)throw new Error(recordSaveError(result.error));if(!result.data?.length)throw new Error('O registro mudou durante a edição. Atualize a consulta e tente novamente.');onSaved();onClose();
      }catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar.');}finally{setBusy(false);}
    }}>
      {command?<><section className="editor-section"><h3>Identificação da unidade</h3>{fieldInput(fields[0])}</section><section className="editor-section editor-cmt"><h3><i/>Comandante</h3><div className="form-grid">{fields.filter(field=>field.key.startsWith('commander')).map(fieldInput)}</div></section><section className="editor-section editor-sub"><h3><i/>Subcomandante / Chefe SAT</h3><div className="form-grid">{fields.filter(field=>field.key.startsWith('deputy')).map(fieldInput)}</div></section></>:<section className="editor-section"><h3>Dados da SAT</h3><div className="form-grid">{fields.map(fieldInput)}</div></section>}
      {!command&&<label className="record-check"><input type="checkbox" checked={draft.is_demo===true} onChange={event=>setDraft({...draft,is_demo:event.target.checked})}/><span>Registro demonstrativo<small>A abrangência ainda precisa de validação do setor.</small></span></label>}
      {error&&<p className="form-error" role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={onClose}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy}><Save size={16}/>{busy?'Salvando…':'Salvar alterações'}</ActionButton></div>
    </form>
  </DialogContent></Dialog>;
}
