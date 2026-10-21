import { useState } from 'react';
import { Save, Paperclip, X, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ActionButton } from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
import type { SupportContent, ContentType } from './catalog';
export default function SupportEditor({item,initialType,onClose,onSaved}:{item:SupportContent|null;initialType:ContentType;onClose:()=>void;onSaved:()=>void}) {
  const type=item?.type??initialType;
  const model=type==='model';
  const [title,setTitle]=useState(item?.title??'');
  const [description,setDescription]=useState(item?.description??'');
  const [attachments,setAttachments]=useState(item?.attachments??[]);
  const [files,setFiles]=useState<File[]>([]);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const noun=model?'modelo':'comunicado';
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="record-dialog editor-dialog support-editor">
    <DialogHeader><span className="dialog-context"><FileText size={17}/>{model?'MODELOS PADRONIZADOS':'COMUNICADOS'}</span><DialogTitle>{item?'Editar '+noun:'Novo '+noun}</DialogTitle><DialogDescription>{model?'Informe o nome, descreva a finalidade e anexe o documento.':'Informe o assunto e o texto do comunicado. Anexos são opcionais.'}</DialogDescription></DialogHeader>
    <form className="record-form" onSubmit={async event=>{
      event.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');const uploaded:string[]=[];
      try {
        if(!title.trim())throw new Error('Informe o nome.');
        if(model&&!attachments.length&&!files.length)throw new Error('Anexe o documento do modelo.');
        if(files.some(file=>file.size>20*1024*1024))throw new Error('Cada arquivo deve ter até 20 MB.');
        const id=item?.id??crypto.randomUUID();const next=[...attachments];
        for(const file of files){
          const path=type+'/'+id+'/'+crypto.randomUUID()+'-'+file.name.normalize('NFD').replace(/[^a-zA-Z0-9._-]/g,'_');
          const {error:problem}=await supabase.storage.from('dgsci-support').upload(path,file,{upsert:false,contentType:file.type||undefined});
          if(problem)throw new Error('Não foi possível anexar '+file.name+'. Confira o formato e a permissão.');
          uploaded.push(path);next.push({path,name:file.name});
        }
        const values={type,title:title.trim(),description:description.trim(),area:model?'Notificação e Autos':'Geral',sections:[],checklist:[],attachments:next,is_demo:false,tags:model?['Notificação e Autos']:[],date:new Date().toLocaleDateString('en-CA'),format:next.length?'ARQUIVO':'LEITURA',file:null};
        const response=item?await supabase.from('support_documents').update(values).eq('id',id).eq('revision',item.revision).select('id'):await supabase.from('support_documents').insert({id,...values}).select('id');
        if(response.error)throw new Error('Não foi possível salvar. Confira sua conexão e permissão.');
        if(!response.data?.length)throw new Error('O documento foi alterado por outra pessoa. Atualize a lista e tente novamente.');
        onSaved();onClose();
      }catch(reason){if(uploaded.length)await supabase.storage.from('dgsci-support').remove(uploaded);setError(reason instanceof Error?reason.message:'Não foi possível salvar.');}
      finally{setBusy(false);}
    }}>
      <section className="editor-section"><div className="form-field"><label htmlFor="support-title">{model?'Nome do modelo':'Assunto'} *</label><input id="support-title" required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} autoFocus/></div><div className="form-field"><label htmlFor="support-description">{model?'Descrição':'Texto do comunicado'}</label><textarea id="support-description" rows={model?3:6} value={description} onChange={e=>setDescription(e.target.value)}/></div></section>
      <section className="editor-section"><h3>{model?'Documento *':'Anexos'}</h3><div className="editor-upload"><Paperclip size={24}/><div><strong>{model?'Anexar documento':'Anexar arquivo'}</strong><p>PDF, Word, Excel ou imagem. Até 20 MB por arquivo.</p></div><label className="workspace-button workspace-button-secondary" htmlFor="support-files">Selecionar arquivo</label><input className="sr-only" id="support-files" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt" onChange={event=>{setFiles([...files,...Array.from(event.target.files??[])]);event.target.value='';}}/></div>
      {attachments.map(file=><div className="editor-file" key={file.path}><FileText size={17}/><strong>{file.name}</strong><ActionButton variant="ghost" aria-label={'Retirar '+file.name} onClick={()=>setAttachments(attachments.filter(row=>row.path!==file.path))}><X size={16}/></ActionButton></div>)}
      {files.map((file,index)=><div className="editor-file" key={file.name+index}><FileText size={17}/><strong>{file.name}</strong><ActionButton variant="ghost" aria-label={'Retirar '+file.name} onClick={()=>setFiles(files.filter((_,i)=>i!==index))}><X size={16}/></ActionButton></div>)}
      </section>{error&&<p className="form-error" role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={onClose}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy}><Save size={16}/>{busy?'Salvando…':'Salvar '+noun}</ActionButton></div>
    </form>
  </DialogContent></Dialog>;
}
