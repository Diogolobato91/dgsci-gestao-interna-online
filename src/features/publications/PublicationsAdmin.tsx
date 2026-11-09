import { FormEvent, useCallback, useEffect, useState } from 'react';
import { BookOpen, Download, FileText, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
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

  // Estados de Edição
  const [editingRow, setEditingRow] = useState<Publication | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

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

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editingRow || editBusy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const newTitle = String(data.get('title')).trim();
    const newDescription = String(data.get('description')).trim();
    const newPdf = data.get('file') as File | null;
    const newCover = data.get('cover') as File | null;

    if (!newTitle || newTitle.length < 3) {
      setEditError('Informe um título com no mínimo 3 caracteres.');
      return;
    }

    setEditBusy(true);
    setEditError('');

    let updatedPdfPath = editingRow.file_path;
    let updatedCoverPath = editingRow.cover_path;
    const uploadedPaths: string[] = [];

    try {
      // Atualização opcional de PDF
      if (newPdf && newPdf.size > 0) {
        if (newPdf.type !== 'application/pdf' || newPdf.size > MAX_PDF_SIZE) {
          throw new Error('Envie um PDF de até 50 MB.');
        }
        if (!await validateFileContent(newPdf)) {
          throw new Error('O conteúdo do PDF é inválido ou não permitido.');
        }
        const pdfPath = `${editingRow.kind}/${editingRow.id}-${Date.now()}.pdf`;
        const uploadRes = await supabase.storage.from('publications').upload(pdfPath, newPdf, { contentType: newPdf.type, upsert: true });
        if (uploadRes.error) throw uploadRes.error;
        uploadedPaths.push(pdfPath);
        updatedPdfPath = pdfPath;
      }

      // Atualização opcional de Capa
      if (newCover && newCover.size > 0) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(newCover.type) || newCover.size > MAX_COVER_SIZE) {
          throw new Error('Envie uma capa JPG, PNG ou WebP de até 5 MB.');
        }
        if (!await validateFileContent(newCover)) {
          throw new Error('O conteúdo da capa é inválido ou não permitido.');
        }
        const coverExtension = newCover.type === 'image/png' ? 'png' : newCover.type === 'image/webp' ? 'webp' : 'jpg';
        const coverPath = `${editingRow.kind}/${editingRow.id}-${Date.now()}-cover.${coverExtension}`;
        const uploadRes = await supabase.storage.from('publications').upload(coverPath, newCover, { contentType: newCover.type, upsert: true });
        if (uploadRes.error) throw uploadRes.error;
        uploadedPaths.push(coverPath);
        updatedCoverPath = coverPath;
      }

      const { error: updateError } = await supabase.from('publications').update({
        title: newTitle,
        description: newDescription,
        file_path: updatedPdfPath,
        cover_path: updatedCoverPath,
      }).eq('id', editingRow.id);

      if (updateError) throw updateError;

      // Limpeza de arquivos antigos substituídos
      const oldToRemove: string[] = [];
      if (updatedPdfPath !== editingRow.file_path) oldToRemove.push(editingRow.file_path);
      if (updatedCoverPath !== editingRow.cover_path) oldToRemove.push(editingRow.cover_path);
      if (oldToRemove.length) {
        void supabase.storage.from('publications').remove(oldToRemove);
      }

      setEditingRow(null);
      await load();
    } catch (caught) {
      if (uploadedPaths.length) {
        void supabase.storage.from('publications').remove(uploadedPaths);
      }
      setEditError(caught instanceof Error ? caught.message : 'Não foi possível salvar as alterações.');
    } finally {
      setEditBusy(false);
    }
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
  return (
    <section className="publications-admin">
      <header>
        <div>
          <span>SUBDIRETORIA</span>
          <h1>Cartilhas e Instruções Técnicas</h1>
          <p>Publique e gerencie documentos para consulta e download no site institucional.</p>
        </div>
      </header>

      <div className="publication-tabs" role="tablist" aria-label="Tipo de publicação">
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'booklet'}
          className={kind === 'booklet' ? 'active' : ''}
          onClick={() => setKind('booklet')}
        >
          <BookOpen aria-hidden="true" />Cartilhas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'technical_instruction'}
          className={kind === 'technical_instruction' ? 'active' : ''}
          onClick={() => setKind('technical_instruction')}
        >
          <FileText aria-hidden="true" />Instruções Técnicas
        </button>
      </div>

      {error && <p className="publication-error" role="alert" aria-live="polite">{error}</p>}

      <form onSubmit={submit}>
        <h2><Plus aria-hidden="true" />Nova publicação</h2>
        <label>Título<input name="title" required minLength={3} maxLength={180} /></label>
        <label>Descrição<textarea name="description" maxLength={1000} rows={3} /></label>
        <label>Documento PDF<input name="file" type="file" accept="application/pdf" required /></label>
        <label>Capa da publicação<input name="cover" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
        <button disabled={busy}>
          {busy ? <LoaderCircle className="publication-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {busy ? 'Publicando…' : 'Publicar no site'}
        </button>
      </form>

      <div className="publication-admin-grid">
        {rows.map(row => (
          <article key={row.id}>
            <img src={publicationUrl(row.cover_path)} alt={`Capa de ${row.title}`} width="75" height="92" loading="lazy" />
            <div>
              <small>{row.kind === 'booklet' ? 'CARTILHA' : 'INSTRUÇÃO TÉCNICA'}</small>
              <strong>{row.title}</strong>
              <p>{row.description}</p>
              <button type="button" className="publication-download" onClick={() => void download(row)}>
                <Download size={15} aria-hidden="true" />Baixar PDF
              </button>
            </div>
            <div className="publication-actions">
              <button
                type="button"
                className="publication-action-btn publication-edit-btn"
                onClick={() => { setEditingRow(row); setEditError(''); }}
                disabled={busy}
                aria-label={`Editar ${row.title}`}
                title="Editar publicação"
              >
                <Pencil size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="publication-action-btn publication-delete-btn"
                onClick={() => void remove(row)}
                disabled={busy}
                aria-label={`Excluir ${row.title}`}
                title="Excluir publicação"
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
        {!rows.length && <p className="publication-empty">Nenhuma publicação cadastrada nesta categoria.</p>}
      </div>

      {/* Modal de Edição */}
      {editingRow && (
        <div className="publication-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-edit-title">
          <div className="publication-modal-dialog">
            <header className="publication-modal-header">
              <div>
                <span className="publication-modal-badge">{editingRow.kind === 'booklet' ? 'CARTILHA' : 'INSTRUÇÃO TÉCNICA'}</span>
                <h2 id="modal-edit-title">Editar Publicação</h2>
              </div>
              <button
                type="button"
                className="publication-modal-close"
                onClick={() => !editBusy && setEditingRow(null)}
                aria-label="Fechar"
                disabled={editBusy}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {editError && <p className="publication-error" role="alert">{editError}</p>}

            <form onSubmit={handleUpdate} className="publication-edit-form">
              <label>
                Título
                <input
                  name="title"
                  defaultValue={editingRow.title}
                  required
                  minLength={3}
                  maxLength={180}
                  autoFocus
                />
              </label>

              <label>
                Descrição
                <textarea
                  name="description"
                  defaultValue={editingRow.description}
                  maxLength={1000}
                  rows={3}
                />
              </label>

              <div className="publication-file-fields">
                <label>
                  <span>Atualizar Documento PDF <em>(opcional)</em></span>
                  <input name="file" type="file" accept="application/pdf" />
                  <small>Deixe em branco para manter o PDF atual.</small>
                </label>

                <label>
                  <span>Atualizar Imagem da Capa <em>(opcional)</em></span>
                  <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
                  <small>Deixe em branco para manter a capa atual.</small>
                </label>
              </div>

              <footer className="publication-modal-footer">
                <button
                  type="button"
                  className="publication-btn-secondary"
                  onClick={() => setEditingRow(null)}
                  disabled={editBusy}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="publication-btn-primary"
                  disabled={editBusy}
                >
                  {editBusy ? <LoaderCircle className="publication-spin" size={17} aria-hidden="true" /> : <Pencil size={17} aria-hidden="true" />}
                  {editBusy ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
