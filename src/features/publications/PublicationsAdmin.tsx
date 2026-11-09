import { FormEvent, useCallback, useEffect, useState } from 'react';
import { BookOpen, Download, FileText, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listPublications, publicationUrl, type Publication } from '@/features/public/publications';
import { downloadFile, validateFileContent } from '@/lib/fileValidation';
import { supabase } from '@/lib/supabase';
import './publications-admin.css';

const MAX_PDF_SIZE = 50 * 1024 * 1024;
const MAX_COVER_SIZE = 5 * 1024 * 1024;

export default function PublicationsAdmin() {
  const { user } = useAuth();
  const allowed = !!user?.allowedProfiles?.includes('Subdiretoria');
  const [rows, setRows] = useState<Publication[]>([]);
  const [kind, setKind] = useState<Publication['kind']>('booklet');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!allowed) return;
    try { setRows(await listPublications(kind, true)); setError(''); }
    catch { setError('Não foi possível carregar as publicações. Atualize a página e tente novamente.'); }
  }, [allowed, kind]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const pdf = data.get('file') as File;
    const cover = data.get('cover') as File;
    if (!pdf?.size || !cover?.size) return;
    if (pdf.type !== 'application/pdf' || pdf.size > MAX_PDF_SIZE) { setError('Envie um PDF de até 50 MB.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(cover.type) || cover.size > MAX_COVER_SIZE) { setError('Envie uma capa JPG, PNG ou WebP de até 5 MB.'); return; }
    if (!await validateFileContent(pdf) || !await validateFileContent(cover)) { setError('O conteúdo de um dos arquivos não corresponde ao formato informado ou contém recursos não permitidos.'); return; }

    setBusy(true); setError('');
    const id = crypto.randomUUID();
    const base = `${kind}/${id}`;
    const pdfPath = `${base}.pdf`;
    const coverExtension = cover.type === 'image/png' ? 'png' : cover.type === 'image/webp' ? 'webp' : 'jpg';
    const coverPath = `${base}-cover.${coverExtension}`;
    const uploadedPaths: string[] = [];
    try {
      const pdfUpload = await supabase.storage.from('publications').upload(pdfPath, pdf, { contentType: pdf.type, upsert: false });
      if (pdfUpload.error) throw pdfUpload.error;
      uploadedPaths.push(pdfPath);
      const coverUpload = await supabase.storage.from('publications').upload(coverPath, cover, { contentType: cover.type, upsert: false });
      if (coverUpload.error) throw coverUpload.error;
      uploadedPaths.push(coverPath);
      const inserted = await supabase.from('publications').insert({ kind, title: String(data.get('title')).trim(), description: String(data.get('description')).trim(), file_path: pdfPath, cover_path: coverPath, created_by: user?.id });
      if (inserted.error) throw inserted.error;
      form.reset(); await load();
    } catch {
      if (uploadedPaths.length) await supabase.storage.from('publications').remove(uploadedPaths);
      setError('Não foi possível publicar. Nenhum arquivo parcial foi mantido; tente novamente.');
    } finally { setBusy(false); }
  };

  const remove = async (row: Publication) => {
    if (!supabase || busy || !window.confirm(`Excluir “${row.title}” do site?`)) return;
    setBusy(true); setError('');
    const deleted = await supabase.from('publications').delete().eq('id', row.id);
    if (deleted.error) setError('Não foi possível excluir a publicação.');
    else {
      const storage = await supabase.storage.from('publications').remove([row.file_path, row.cover_path]);
      if (storage.error) setError('A publicação foi retirada do site, mas os arquivos precisam de limpeza administrativa.');
      await load();
    }
    setBusy(false);
  };

  const download = async (row: Publication) => {
    try { await downloadFile(publicationUrl(row.file_path), `${row.title}.pdf`); }
    catch { setError('Não foi possível baixar o PDF. Tente novamente.'); }
  };

  if (!allowed) return <section className="publications-denied"><h1>Gestão de publicações</h1><p>Acesso exclusivo da Subdiretoria.</p></section>;
  return <section className="publications-admin">
    <header><div><span>SUBDIRETORIA</span><h1>Cartilhas e Instruções Técnicas</h1><p>Publique documentos para consulta e download no site institucional.</p></div></header>
    <div className="publication-tabs" role="tablist" aria-label="Tipo de publicação"><button type="button" role="tab" aria-selected={kind === 'booklet'} className={kind === 'booklet' ? 'active' : ''} onClick={() => setKind('booklet')}><BookOpen aria-hidden="true" />Cartilhas</button><button type="button" role="tab" aria-selected={kind === 'technical_instruction'} className={kind === 'technical_instruction' ? 'active' : ''} onClick={() => setKind('technical_instruction')}><FileText aria-hidden="true" />Instruções Técnicas</button></div>
    {error && <p className="publication-error" role="alert" aria-live="polite">{error}</p>}
    <form onSubmit={submit}><h2><Plus aria-hidden="true" />Nova publicação</h2><label>Título<input name="title" required minLength={3} maxLength={180} /></label><label>Descrição<textarea name="description" maxLength={1000} rows={3} /></label><label>Documento PDF<input name="file" type="file" accept="application/pdf" required /></label><label>Capa da publicação<input name="cover" type="file" accept="image/jpeg,image/png,image/webp" required /></label><button disabled={busy}>{busy ? <LoaderCircle aria-hidden="true" /> : <Plus aria-hidden="true" />}{busy ? 'Publicando…' : 'Publicar no site'}</button></form>
    <div className="publication-admin-grid">{rows.map(row => <article key={row.id}><img src={publicationUrl(row.cover_path)} alt={`Capa de ${row.title}`} width="75" height="92" loading="lazy" /><div><small>{row.kind === 'booklet' ? 'CARTILHA' : 'INSTRUÇÃO TÉCNICA'}</small><strong>{row.title}</strong><p>{row.description}</p><button type="button" className="publication-download" onClick={() => void download(row)}><Download size={15} aria-hidden="true" />Baixar PDF</button></div><button type="button" onClick={() => void remove(row)} disabled={busy} aria-label={`Excluir ${row.title}`}><Trash2 aria-hidden="true" /></button></article>)}{!rows.length && <p>Nenhuma publicação cadastrada nesta categoria.</p>}</div>
  </section>;
}
