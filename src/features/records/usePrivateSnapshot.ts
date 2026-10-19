import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function usePrivateSnapshot<T>(name: 'efetivo' | 'diarias') {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setData(null); setError('');
    if (!user) return;
    if (!supabase) { setError('A conexão com o Supabase não está configurada.'); return; }
    if (!user.allowedProfiles?.some(profile => ['Diretoria','Subdiretoria','ADM'].includes(profile))) { setError('Sua conta não tem acesso a este controle.'); return; }
    supabase.rpc(name === 'efetivo' ? 'get_staff_snapshot' : 'get_diarias_snapshot')
      .then(({ data: result, error: problem }) => {
        if (!current) return;
        if (problem || !result) setError('Não foi possível consultar os dados no Supabase. Confira sua sessão e tente novamente.');
        else setData(result as T);
      });
    return () => { current = false; };
  }, [name, user]);
  return { data, error };
}
