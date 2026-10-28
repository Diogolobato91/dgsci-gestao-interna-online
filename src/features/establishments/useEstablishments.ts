import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {useAuth} from '@/contexts/AuthContext';
import type {EstablishmentSnapshot} from './model';
export function useEstablishments(){
 const {user}=useAuth();const [snapshot,setSnapshot]=useState<EstablishmentSnapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{setSnapshot(null);},[user?.id]);
 useEffect(()=>{let active=true;setLoading(true);setError('');if(!user?.id||!supabase){setSnapshot(null);setLoading(false);return;}
 (async()=>{try{const result=await supabase.rpc('get_establishments_snapshot');if(result.error){if(result.error.code==='42501'&&active)setSnapshot(null);throw result.error;}if(!result.data||!Array.isArray(result.data.companies))throw new Error();if(active)setSnapshot(result.data);}catch{if(active)setError('Não foi possível consultar o banco de estabelecimentos. Tente novamente.');}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[user?.id,revision]);
 return {snapshot,loading,error,reload:()=>setRevision(n=>n+1)};
}
