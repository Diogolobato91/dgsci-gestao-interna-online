import {useEffect,useState,useCallback,useRef}from'react';
import type {Accreditation}from'./model';
import {loadAccreditationsFromGoogle}from'./googleSheet';
export function useAccreditations(enabled=true){
 const [data,setData]=useState<Accreditation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[loadedAt,setLoadedAt]=useState('');
 const dataRef=useRef<Accreditation[]>([]),lastRefresh=useRef(0);
 const reload=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{let active=true;const hasData=dataRef.current.length>0;lastRefresh.current=Date.now();if(!hasData)setLoading(true);setError('');if(!enabled){setLoading(false);return;}void loadAccreditationsFromGoogle().then(rows=>{if(active){dataRef.current=rows;setData(rows);setLoadedAt(new Date().toISOString());}}).catch(()=>{if(active&&!hasData)setError('Não foi possível consultar a planilha oficial de credenciamento. Tente novamente.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[enabled,revision]);
 useEffect(()=>{if(!enabled)return;const refresh=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastRefresh.current>=15000){lastRefresh.current=now;setRevision(n=>n+1);}};const visibility=()=>{if(document.visibilityState==='visible')refresh();};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visibility);const timer=window.setInterval(refresh,300000);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visibility);window.clearInterval(timer);};},[enabled]);
 return {data,loading,error,reload,loadedAt};
}
