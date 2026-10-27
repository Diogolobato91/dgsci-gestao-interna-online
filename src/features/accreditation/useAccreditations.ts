import {useEffect,useState,useCallback}from'react';
import {supabase}from'@/lib/supabase';
import type {Accreditation,AccreditationImport}from'./model';
export function useAccreditations(userId?:string){
 const [data,setData]=useState<Accreditation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [imports,setImports]=useState<AccreditationImport[]>([]);
 const reload=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{
  let active=true;setLoading(true);setError('');setData([]);setImports([]);
  if(!userId){setLoading(false);return;}
  void(async()=>{try{
   if(!supabase)throw new Error();const rows:Accreditation[]=[];
   for(let offset=0;;offset+=1000){
    const r=await supabase.from('accreditations').select('id,kind,modality,name,contact,region,protocol,valid_until,version,updated_at,updated_by_name').order('id').range(offset,offset+999);
    if(r.error)throw r.error;if(!active)return;rows.push(...r.data);if(r.data.length<1000)break;
   }
   const source=await supabase.from('accreditation_imports').select('kind,source_author,source_date,source_rows,imported_rows,duplicates,imported_at');
   if(source.error)throw source.error;
   if(active){setData(rows);setImports(source.data||[]);}
  }catch{if(active)setError('Não foi possível carregar o credenciamento. Tente novamente.');}finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 },[userId,revision]);
 return {data,imports,loading,error,reload};
}
