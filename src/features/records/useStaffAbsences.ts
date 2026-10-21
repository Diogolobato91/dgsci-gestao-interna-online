import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { StaffAbsence } from './staffAvailability';

export async function fetchStaffAbsences(filters: { staffId?: string; start?: string; end?: string; includeCancelled?: boolean }) {
  if (!supabase) throw new Error('Conexão não configurada.');
  const rows: StaffAbsence[] = [];
  for (let offset=0; ; offset+=500) {
    let query = supabase.from('staff_absences').select('*').order('starts_on',{ascending:false}).order('id').range(offset,offset+499);
    if (filters.staffId) query=query.eq('staff_id',filters.staffId);
    if (!filters.includeCancelled) query=query.is('cancelled_at',null);
    if (filters.start) query=query.gte('ends_on',filters.start);
    if (filters.end) query=query.lte('starts_on',filters.end);
    const { data, error } = await query;
    if (error) throw new Error('Não foi possível consultar os afastamentos. Atualize a consulta.');
    rows.push(...data);
    if(data.length<500) return rows;
  }
}
export function useStaffAbsences(day: string, revision: number) {
  const { user } = useAuth();
  const [data,setData] = useState<StaffAbsence[]>([]), [error,setError] = useState(''), [loading,setLoading] = useState(true);
  useEffect(() => {
    let alive=true;setLoading(true);setError('');setData([]);
    if (!user?.allowedProfiles?.some(p=>['Secretaria','Diretoria','Subdiretoria'].includes(p))) {setLoading(false);return;}
    void fetchStaffAbsences({start:day,end:day}).then(rows=>{if(alive)setData(rows);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[day,revision,user?.id]);
  return {data,error,loading};
}
