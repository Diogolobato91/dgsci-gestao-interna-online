import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function useDatabaseRows<T>(table: 'sat_commands' | 'ordinance_years' | 'ordinances' | 'sat_regions' | 'support_documents', columns: string, order: string, enabled = true) {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setData([]); setError(''); setLoading(true);
    if (!enabled || !user) { setLoading(false); return; }
    (async () => {
      try {
        if (!supabase) throw new Error('Conexão indisponível.');
        const rows: T[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data: page, error: problem } = await supabase.from(table).select(columns).order(order).range(offset, offset + 999);
          if (problem) throw problem;
          if (!active) return;
          rows.push(...(page ?? []) as T[]);
          if (!page || page.length < 1000) break;
        }
        if (active) setData(rows);
      } catch { if (active) setError('Não foi possível carregar os registros. Verifique sua conexão e tente novamente.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [table, columns, order, enabled, user, revision]);
  return { data, loading, error, reload };
}
