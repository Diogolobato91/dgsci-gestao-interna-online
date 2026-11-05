import {useEffect,useState,useCallback}from'react';
import type {Accreditation}from'./model';
import {loadAccreditationsFromGoogle}from'./googleSheet';
export function useAccreditations(userId?:string){
 const [data,setData]=useState<Accreditation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[loadedAt,setLoadedAt]=useState('');
 const reload=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{let active=true;setLoading(true);setError('');setData([]);if(!userId){setLoading(false);return;}void loadAccreditationsFromGoogle().then(rows=>{if(active){setData(rows);setLoadedAt(new Date().toISOString());}}).catch(()=>{if(active)setError('Não foi possível consultar a planilha oficial de credenciamento. Tente novamente.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[userId,revision]);
 return {data,loading,error,reload,loadedAt};
}
