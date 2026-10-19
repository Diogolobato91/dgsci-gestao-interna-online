import { useState } from 'react';
import { Plus, Save, Paperclip, X, ChevronDown, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ActionButton } from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
import type { SupportContent, ContentType } from './catalog';
import { TYPE_LABELS } from './content';

export default function SupportEditor({item,initialType,onClose,onSaved}:{item:SupportContent|null;initialType:ContentType;onClose:()=>void;onSaved:()=>void}){
  const [title,setTitle]=useState(item?.title??'');
  const [description,setDescription]=useState(item?.description??'');
  const [area,setArea]=useState(item?.area??'Geral');
  const [type,setType]=useState<ContentType>(item?.type??initialType);
  const [sections,setSections]=useState(item?.sections??[{title:'Conteúdo',text:''}]);
  const [checklist,setChecklist]=useState(item?.checklist?.join('\n')??'');
  const [demo,setDemo]=useState(item?.isDemo??false);
  const [attachments,setAttachments]=useState(item?.attachments??[]);
  const [files,setFiles]=useState<File[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function save(event:React.FormEvent){
    event.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');const uploaded:string[]=[];
    try{
      if(!title.trim())throw new Error('Informe o título.');
      if(files.some(file=>file.size>20*1024*1024))throw new Error('Cada arquivo deve ter até 20 MB.');
      const id=item?.id??crypto.randomUUID();const next=[...attachments];
      for(const file of files){
        const path=id+'/'+crypto.randomUUID()+'-'+file.name.normalize('NFD').replace(/[^a-zA-Z0-9._-]/g,'_');
        const {error:problem}=await supabase.storage.from('dgsci-support').upload(path,file,{upsert:false,contentType:file.type||undefined});
        if(problem)throw new Error('Não foi possível anexar '+file.name+'. Confira o formato e a permissão.');
        uploaded.push(path);next.push({path,name:file.name});
      }
      const now=new Date();
      const values={type,title:title.trim(),description:description.trim(),area:area.trim()||'Geral',sections,checklist:checklist.split('\n').map(line=>line.trim()).filter(Boolean),attachments:next,is_demo:demo,date:[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'),format:next.length?'ARQUIVO':'LEITURA'};
      const response=item?await supabase.from('support_documents').update(values).eq('id',id).eq('revision',item.revision).select('id'):await supabase.from('support_documents').insert({id,...values}).select('id');
      if(response.error)throw new Error('Não foi possível salvar o conteúdo. Confira a conexão e sua permissão.');
      if(!response.data?.length)throw new Error('O conteúdo foi alterado durante a edição. Atualize a lista e tente novamente.');
      onSaved();onClose();
    }catch(reason){
      if(uploaded.length)await supabase.storage.from('dgsci-support').remove(uploaded);
      setError(reason instanceof Error?reason.message:'Não foi possível salvar.');
    }finally{setBusy(false);}
  }
  function addFiles(incoming:File[]){
    setFiles(current=>[...current,...incoming.filter(file=>!current.some(existing=>existing.name===file.name&&existing.size===file.size&&existing.lastModified===file.lastModified))]);
  }
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="record-dialog editor-dialog support-editor"><DialogHeader><span className="dialog-context"><FileText size={17}/>BIBLIOTECA DE APOIO</span><DialogTitle>{item?'Editar conteúdo':'Adicionar conteúdo'}</DialogTitle><DialogDescription>Organize a orientação ou documento que será consultado pelos setores.</DialogDescription></DialogHeader>
    <form className="record-form" onSubmit={save}>
      <section className="editor-section"><h3>Identificação</h3><div className="form-grid"><div className="form-field"><label htmlFor="support-type">Tipo de conteúdo</label><select id="support-type" value={type} onChange={event=>setType(event.target.value as ContentType)}>{Object.entries(TYPE_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><div className="form-field"><label htmlFor="support-area">Área responsável</label><input id="support-area" value={area} onChange={event=>setArea(event.target.value)}/></div><div className="form-field form-field-wide"><label htmlFor="support-title">Título *</label><input id="support-title" required value={title} placeholder="Informe um título claro para consulta" onChange={event=>setTitle(event.target.value)}/></div><div className="form-field form-field-wide"><label htmlFor="support-description">Resumo</label><textarea id="support-description" rows={2} value={description} placeholder="Descreva brevemente o assunto do conteúdo" onChange={event=>setDescription(event.target.value)}/></div></div></section>
      <section className="editor-section"><div className="editor-section-heading"><h3>Conteúdo</h3><span>{sections.length} seções</span></div>
        {sections.map((section,index)=><details className="editor-block" key={index} open={index===0}><summary><span className="editor-step">{index+1}</span><strong>{section.title||'Nova seção'}</strong><ChevronDown size={16}/></summary><div className="editor-block-body"><div className="form-field"><label htmlFor={'section-title-'+index}>Título da seção</label><input id={'section-title-'+index} value={section.title} onChange={event=>setSections(sections.map((row,i)=>i===index?{...row,title:event.target.value}:row))}/></div><div className="form-field"><label htmlFor={'section-text-'+index}>Texto</label><textarea id={'section-text-'+index} rows={4} value={section.text??''} onChange={event=>setSections(sections.map((row,i)=>i===index?{...row,text:event.target.value}:row))}/></div><div className="form-field"><label htmlFor={'section-items-'+index}>Lista de itens <small>Opcional · um item por linha</small></label><textarea id={'section-items-'+index} rows={3} value={section.items?.join('\n')??''} onChange={event=>setSections(sections.map((row,i)=>i===index?{...row,items:event.target.value.split('\n')}:row))}/></div><ActionButton variant="ghost" className="editor-remove" onClick={()=>setSections(sections.filter((_,i)=>i!==index))}><X size={14}/>Remover seção</ActionButton></div></details>)}
        <ActionButton onClick={()=>setSections([...sections,{title:'',text:''}])}><Plus size={15}/>Adicionar seção</ActionButton>
      </section>
      <details className="editor-block"><summary><strong>Checklist de consulta</strong><span className="editor-optional">Opcional</span><ChevronDown size={16}/></summary><div className="editor-block-body"><label htmlFor="support-checklist">Um item por linha</label><textarea id="support-checklist" rows={4} value={checklist} onChange={event=>setChecklist(event.target.value)}/></div></details>
      <section className="editor-section"><div className="editor-section-heading"><h3>Anexos</h3><span>{attachments.length+files.length} arquivos</span></div><div className="editor-upload"><Paperclip size={23}/><div><strong>Documentos para consulta</strong><p>PDF, Word, Excel, imagens ou texto. Até 20 MB por arquivo.</p></div><label className="workspace-button workspace-button-secondary" htmlFor="support-files">Selecionar arquivos</label><input className="sr-only" id="support-files" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt" onChange={event=>{addFiles(Array.from(event.target.files??[]));event.target.value='';}}/></div>
        {attachments.map(file=><div className="editor-file" key={file.path}><FileText size={17}/><div><strong>{file.name}</strong><small>Anexo cadastrado</small></div><ActionButton variant="ghost" aria-label={'Retirar anexo '+file.name} title="Retirar do conteúdo" onClick={()=>setAttachments(attachments.filter(row=>row.path!==file.path))}><X size={16}/></ActionButton></div>)}
        {files.map((file,index)=><div className="editor-file" key={file.name+index}><FileText size={17}/><div><strong>{file.name}</strong><small>Novo arquivo · {(file.size/1024/1024).toLocaleString('pt-BR',{maximumFractionDigits:2})} MB</small></div><ActionButton variant="ghost" aria-label={'Retirar arquivo '+file.name} onClick={()=>setFiles(files.filter((_,i)=>i!==index))}><X size={16}/></ActionButton></div>)}
      </section>
      <label className="record-check"><input type="checkbox" checked={demo} onChange={event=>setDemo(event.target.checked)}/><span>Conteúdo demonstrativo<small>Marque quando o material ainda não tiver validade institucional.</small></span></label>
      {error&&<p className="form-error" role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={onClose}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy}><Save size={16}/>{busy?'Salvando…':'Salvar conteúdo'}</ActionButton></div>
    </form>
  </DialogContent></Dialog>;
}
