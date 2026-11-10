import {useEffect,useMemo,useRef,useState} from 'react';
import mapboxgl,{type GeoJSONSource,type Map as MapboxMap,type MapMouseEvent} from 'mapbox-gl';
import {LocateFixed,MapPin,Search,X} from 'lucide-react';
import type {Establishment} from './model';
import {loadLocationCaches,locateEstablishment,spreadLocation} from './geolocation';
import 'mapbox-gl/dist/mapbox-gl.css';

const LocalTerritorialMap=()=>import('./LocalTerritorialMap');
const STATUS:Record<string,{label:string;color:string}>={REGULAR:{label:'Regular',color:'#16835f'},VENCIDO:{label:'Vencido',color:'#b5122d'},PARADO:{label:'Pendente',color:'#d18a16'},SEM_SISGAT:{label:'Sem SISGAT',color:'#596678'},DESATIVADO:{label:'Desativado',color:'#8993a1'}};
type PointItem=Establishment&{_lng:number;_lat:number;_precision:string};
type Props={companies:Establishment[];onEdit:(item:Establishment)=>void;canEdit:boolean};
const text=(value:unknown,fallback='Não informado')=>String(value??'').trim()||fallback;
const safeColor=(value:unknown)=>/^#[0-9a-f]{6}$/i.test(String(value))?String(value):'#64748b';

function popupContent(item:Establishment,canEdit:boolean,onEdit:(item:Establishment)=>void){
 const root=document.createElement('div');root.className='territorial-popup territorial-popup-mapbox';
 const statusInfo=STATUS[text(item.normalizedStatus)]??{label:text(item.situacao),color:'#64748b'};
 root.innerHTML='<span class="map-popup-status"></span><strong></strong><p></p><dl><div><dt>CNPJ/CPF</dt><dd></dd></div><div><dt>Setor</dt><dd></dd></div></dl>';
 const badge=root.querySelector<HTMLElement>('.map-popup-status')!;badge.textContent=statusInfo.label;badge.style.setProperty('--status-color',statusInfo.color);
 root.querySelector('strong')!.textContent=text(item.razao);root.querySelector('p')!.textContent=`${text(item.endereco)} · ${text(item.bairro)}`;
 const values=root.querySelectorAll('dd');values[0].textContent=text(item.cnpj);values[1].textContent=text(item.setor);
 if(canEdit){const button=document.createElement('button');button.type='button';button.textContent='Editar cadastro';button.onclick=()=>onEdit(item);root.append(button);}
 return root;
}

function MapboxTerritorialMap({companies,onEdit,canEdit,onFallback}:{onFallback:()=>void}&Props){
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<MapboxMap|null>(null),popupRef=useRef<mapboxgl.Popup|null>(null),loadedRef=useRef(false),locatedRef=useRef<PointItem[]>([]);
 const [located,setLocated]=useState<PointItem[]>([]),[unlocated,setUnlocated]=useState(0),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[sector,setSector]=useState('all'),[colorBy,setColorBy]=useState<'status'|'sector'>('status'),[mapReady,setMapReady]=useState(false),[style,setStyle]=useState<'streets'|'dark'>('streets');
 useEffect(()=>{let active=true;loadLocationCaches().then(caches=>{if(!active)return;const points:PointItem[]=[];let missing=0;for(const company of companies){const base=locateEstablishment(company,caches);if(!base){missing++;continue;}const point=spreadLocation(company,base);points.push({...company,_lng:point.lng,_lat:point.lat,_precision:point.precision});}setLocated(points);setUnlocated(missing);});return()=>{active=false;};},[companies]);
 const sectors=useMemo(()=>[...new Set(companies.map(company=>text(company.setor,'')).filter(Boolean))].sort(),[companies]);
 const filtered=useMemo(()=>{const normalized=query.toLocaleLowerCase('pt-BR').trim();return located.filter(company=>(status==='all'||company.normalizedStatus===status)&&(sector==='all'||company.setor===sector)&&(!normalized||`${company.razao} ${company.cnpj} ${company.endereco} ${company.bairro}`.toLocaleLowerCase('pt-BR').includes(normalized)));},[located,query,status,sector]);
 const geojson=useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(()=>({type:'FeatureCollection',features:filtered.map(item=>({type:'Feature',geometry:{type:'Point',coordinates:[item._lng,item._lat]},properties:{id:item.id,color:colorBy==='sector'?safeColor(item.setorHex):(STATUS[text(item.normalizedStatus)]?.color??'#64748b')}}))}),[filtered,colorBy]);
 locatedRef.current=located;

 useEffect(()=>{
  if(!container.current||mapRef.current)return;const token=import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;if(!token){onFallback();return;}mapboxgl.accessToken=token;let map:MapboxMap;
  try{map=new mapboxgl.Map({container:container.current,style:'mapbox://styles/mapbox/streets-v12',center:[-48.46,-1.39],zoom:11.2,minZoom:8,maxZoom:21,pitch:38,bearing:-4,antialias:true,attributionControl:false,fadeDuration:350});}
  catch(error){console.error('Mapbox initialization:',error);onFallback();return;}
  mapRef.current=map;map.addControl(new mapboxgl.NavigationControl({showCompass:true,visualizePitch:true}),'top-right');map.addControl(new mapboxgl.AttributionControl({compact:true}),'bottom-right');
  const loadTimer=window.setTimeout(()=>{if(!loadedRef.current)onFallback();},15000);
  const addLayers=()=>{
   if(map.getSource('establishments'))return;
   map.addSource('establishments',{type:'geojson',data:geojson,cluster:true,clusterMaxZoom:18,clusterRadius:54});
   map.addLayer({id:'clusters',type:'circle',source:'establishments',filter:['has','point_count'],paint:{'circle-color':['step',['get','point_count'],'#9f2035',10,'#b5122d',100,'#8f1729',1000,'#6f1020'],'circle-radius':['step',['get','point_count'],17,10,21,100,26,1000,31],'circle-stroke-width':3,'circle-stroke-color':'#fff','circle-opacity':.94}});
   map.addLayer({id:'cluster-count',type:'symbol',source:'establishments',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-size':12,'text-font':['DIN Offc Pro Medium','Arial Unicode MS Bold']},paint:{'text-color':'#fff'}});
   map.addLayer({id:'establishment-points',type:'circle',source:'establishments',filter:['!', ['has','point_count']],paint:{'circle-color':['get','color'],'circle-radius':['interpolate',['linear'],['zoom'],16,5,20,8],'circle-stroke-color':'#fff','circle-stroke-width':2,'circle-opacity':.94}});
  };
  map.on('load',()=>{loadedRef.current=true;clearTimeout(loadTimer);addLayers();setMapReady(true);map.resize();});
  map.on('style.load',()=>{if(loadedRef.current){addLayers();setMapReady(true);}});
  map.on('error',event=>{const message=String(event.error?.message??'');console.error('Mapbox:',event.error);if(!loadedRef.current&&/(token|unauthorized|webgl|style)/i.test(message))onFallback();});
  map.on('click','clusters',event=>{const feature=map.queryRenderedFeatures(event.point,{layers:['clusters']})[0];const clusterId=Number(feature?.properties?.cluster_id),source=map.getSource('establishments') as GeoJSONSource|undefined;if(!source||!Number.isFinite(clusterId))return;source.getClusterExpansionZoom(clusterId,(error,zoom)=>{if(error||zoom===null)return;map.easeTo({center:(feature.geometry as GeoJSON.Point).coordinates as [number,number],zoom:Math.min(zoom,20),duration:700,easing:t=>t*(2-t)});});});
  map.on('click','establishment-points',(event:MapMouseEvent)=>{const feature=map.queryRenderedFeatures(event.point,{layers:['establishment-points']})[0],item=locatedRef.current.find(company=>company.id===String(feature?.properties?.id));if(!item)return;popupRef.current?.remove();popupRef.current=new mapboxgl.Popup({offset:14,maxWidth:'300px',closeButton:true,focusAfterOpen:false}).setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number,number]).setDOMContent(popupContent(item,canEdit,onEdit)).addTo(map);map.flyTo({center:[item._lng,item._lat],zoom:Math.max(map.getZoom(),17),pitch:48,bearing:0,duration:900,essential:true});});
  for(const layer of ['clusters','establishment-points']){map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer';});map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';});}
  const observer=new ResizeObserver(()=>map.resize());observer.observe(container.current);return()=>{clearTimeout(loadTimer);observer.disconnect();popupRef.current?.remove();map.remove();mapRef.current=null;};
 // Created once; data and style are updated by the effects below.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{const map=mapRef.current;if(!map||!loadedRef.current)return;const source=map.getSource('establishments') as GeoJSONSource|undefined;source?.setData(geojson);},[geojson,mapReady,style]);
 useEffect(()=>{const map=mapRef.current;if(!map||!loadedRef.current)return;setMapReady(false);map.setStyle(style==='dark'?'mapbox://styles/mapbox/dark-v11':'mapbox://styles/mapbox/streets-v12');},[style]);
 const fit=()=>{const map=mapRef.current;if(!map||!filtered.length)return;const bounds=new mapboxgl.LngLatBounds();filtered.forEach(item=>bounds.extend([item._lng,item._lat]));map.fitBounds(bounds,{padding:60,maxZoom:filtered.length===1?18:14,pitch:filtered.length===1?45:28,bearing:0,duration:900,essential:true});};
 return <div className="territorial-layout"><aside className="territorial-tools" aria-label="Filtros do mapa">
  <div className="territorial-count"><MapPin size={18}/><div><strong>{filtered.length.toLocaleString('pt-BR')}</strong><span>no mapa</span></div></div>
  <label className="territorial-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Empresa, CNPJ ou endereço" aria-label="Pesquisar no mapa"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Limpar pesquisa"><X size={15}/></button>}</label>
  <label>Situação<select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">Todas</option>{Object.entries(STATUS).map(([value,item])=><option key={value} value={value}>{item.label}</option>)}</select></label>
  <label>Setor<select value={sector} onChange={event=>setSector(event.target.value)}><option value="all">Todos os setores</option>{sectors.map(value=><option key={value}>{value}</option>)}</select></label>
  <fieldset><legend>Colorir pontos por</legend><div className="workspace-segments"><button type="button" aria-pressed={colorBy==='status'} onClick={()=>setColorBy('status')}>Situação</button><button type="button" aria-pressed={colorBy==='sector'} onClick={()=>setColorBy('sector')}>Setor</button></div></fieldset>
  <fieldset><legend>Visual do mapa</legend><div className="workspace-segments"><button type="button" aria-pressed={style==='streets'} onClick={()=>setStyle('streets')}>Ruas 3D</button><button type="button" aria-pressed={style==='dark'} onClick={()=>setStyle('dark')}>Noturno</button></div></fieldset>
  <button type="button" className="workspace-button workspace-button-secondary territorial-fit" onClick={fit}><LocateFixed size={16}/>Enquadrar resultados</button>
  <p><strong>{unlocated.toLocaleString('pt-BR')}</strong> cadastros sem localização suficiente. Endereços aproximados pelo bairro são identificados apenas internamente no cálculo.</p>
 </aside><div className="territorial-map-wrap"><div ref={container} className="territorial-map" aria-label="Mapa territorial dos estabelecimentos"/>{!mapReady&&<div className="territorial-map-loading" role="status"><span className="workspace-spinner"/>Carregando Mapbox…</div>}<div className="territorial-map-note">Mapbox GL · agrupamento e visualização 3D</div></div></div>;
}

export default function TerritorialMap(props:Props){
 const [fallback,setFallback]=useState(false),[Local,setLocal]=useState<React.ComponentType<Props>|null>(null);
 useEffect(()=>{if(fallback&&!Local)void LocalTerritorialMap().then(module=>setLocal(()=>module.default));},[fallback,Local]);
 if(fallback)return Local?<Local {...props}/>:<div className="territorial-layout"><div className="territorial-map-loading"><span className="workspace-spinner"/>Abrindo base cartográfica própria…</div></div>;
 return <MapboxTerritorialMap {...props} onFallback={()=>setFallback(true)}/>;
}
