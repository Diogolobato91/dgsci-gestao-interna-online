import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ActionButton } from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
const fields = [
  ['protocolo', 'Protocolo', 'text'], ['unidade', 'Unidade', 'text'],
  ['referencia', 'Referência / processo', 'text'], ['destino', 'Destino', 'text'],
  ['periodo', 'Período', 'text'], ['data_autorizacao', 'Data da autorização (conforme registro)', 'text'],
  ['qtd_efetivo', 'Quantidade de efetivo', 'number'], ['valor_despesa', 'Despesa (R$)', 'number'],
  ['valor_arrecadado', 'Arrecadação (R$)', 'number'], ['status', 'Situação', 'text'],
] as const;
export default function AuthorizationEditor({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [stamp, setStamp] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void (async () => {
      const result = await supabase?.from('authorizations').select('protocolo,unidade,referencia,destino,periodo,data_autorizacao,qtd_efetivo,valor_despesa,valor_arrecadado,status,observacao,updated_at').eq('id', id).single();
      if (!alive) return;
      if (!result || result.error) setError('Não foi possível carregar o protocolo.');
      else {
        setDraft(Object.fromEntries(Object.entries(result.data).map(([key, value]) => [key, value == null ? '' : String(value)])));
        setStamp(result.data.updated_at);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="record-dialog editor-dialog"><DialogHeader>
      <DialogTitle>Editar protocolo</DialogTitle><DialogDescription>Atualize os dados do processo e os valores financeiros. Os saldos informados permanecem separados.</DialogDescription>
    </DialogHeader><form className="record-form" onSubmit={async event => {
      event.preventDefault(); if (!supabase || busy || !stamp) return;
      setBusy(true); setError('');
      try {
        const values: Record<string, string | number | null> = {};
        for (const [key, , type] of fields) {
          const raw = (draft[key] || '').trim();
          if (key === 'protocolo' && !raw) throw new Error('Informe o protocolo.');
          if (type === 'number' && raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0 || (key === 'qtd_efetivo' && !Number.isInteger(Number(raw))))) throw new Error('Confira os valores numéricos.');
          values[key] = raw === '' ? null : type === 'number' ? Number(raw) : raw;
        }
        values.observacao = draft.observacao?.trim() || null;
        const { data, error: problem } = await supabase.from('authorizations').update(values).eq('id', id).eq('updated_at', stamp).select('id');
        if (problem) throw new Error('Não foi possível salvar. Confira sua permissão e os valores.');
        if (!data?.length) throw new Error('O protocolo foi alterado por outra pessoa. Feche e abra novamente para revisar.');
        onSaved(); onClose();
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar.'); }
      finally { setBusy(false); }
    }}>
      {loading ? <p role="status">Carregando protocolo…</p> : stamp && <section className="editor-section"><h3>Dados do protocolo</h3><div className="form-grid">
        {fields.map(([key, label, type]) => <div className="form-field" key={key}><label htmlFor={'auth-' + key}>{label}</label><input id={'auth-' + key} type={type} min={type === 'number' ? 0 : undefined} step={key === 'qtd_efetivo' ? 1 : '0.01'} required={key === 'protocolo'} value={draft[key] || ''} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/></div>)}
        <div className="form-field form-field-wide"><label htmlFor="auth-note">Observação</label><textarea id="auth-note" rows={3} value={draft.observacao || ''} onChange={e => setDraft({ ...draft, observacao: e.target.value })}/></div>
      </div></section>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="record-actions"><ActionButton disabled={busy} onClick={onClose}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy || loading || !stamp}><Save size={16}/>{busy ? 'Salvando…' : 'Salvar protocolo'}</ActionButton></div>
    </form></DialogContent>
  </Dialog>;
}
