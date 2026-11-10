import {useEffect,useMemo,useRef,useState} from 'react';
import * as maplibregl from 'maplibre-gl';
import type {GeoJSONSource,Map as MapInstance,MapMouseEvent} from 'maplibre-gl';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {Protocol} from 'pmtiles';
import {layers,namedFlavor} from '@protomaps/basemaps';
import {LocateFixed,MapPin,Search,X} from 'lucide-react';
import type {Establishment} from './model';
import {loadLocationCaches,locateEstablishment,spreadLocation} from './geolocation';
import 'maplibre-gl/dist/maplibre-gl.css';

let protocolRegistered=false;
if(!protocolRegistered){const protocol=new Protocol();maplibregl.setWorkerUrl(mapLibreWorkerUrl);maplibregl.addProtocol('pmtiles',protocol.tile);protocolRegistered=true;}

const STATUS:Record<string,{label:string;color:string}>={REGULAR:{label:'Regular',color:'#16835f'},VENCIDO:{label:'Vencido',color:'#b5122d'},PARADO:{label:'Pendente',color:'#d18a16'},SEM_SISGAT:{label:'Sem SISGAT',color:'#596678'},DESATIVADO:{label:'Desativado',color:'#8993a1'}};
type PointItem=Establishment&{_lng:number;_lat:number;_precision:string};
const text=(v:unknown,fallback='Não informado')=>String(v??'').trim()||fallback;
const safeColor=(v:unknown)=>/^#[0-9a-f]{6}$/i.test(String(v))?String(v):'#64748b';

export default function TerritorialMap({companies,onEdit,canEdit}:{companies:Establishment[];onEdit:(item:Establishment)=>void;canEdit:boolean}){
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<MapInstance|null>(null),popup=useRef<maplibregl.Popup|null>(null);
 const geojsonRef=useRef<GeoJSON.FeatureCollection<GeoJSON.Point>>({type:'FeatureCollection',features:[]});
 const [located,setLocated]=useState<PointItem[]>([]),[unlocated,setUnlocated]=useState(0),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[sector,setSector]=useState('all'),[colorBy,setColorBy]=useState<'status'|'sector'>('status'),[mapError,setMapError]=useState('');
 useEffect(()=>{let active=true;loadLocationCaches().then(caches=>{if(!active)return;const points:PointItem[]=[];let missing=0;for(const company of companies){const base=locateEstablishment(company,caches);if(!base){missing++;continue;}const p=spreadLocation(company,base);points.push({...company,_lng:p.lng,_lat:p.lat,_precision:p.precision});}setLocated(points);setUnlocated(missing);});return()=>{active=false;};},[companies]);
 const sectors=useMemo(()=>[...new Set(companies.map(c=>text(c.setor,'')).filter(Boolean))].sort(),[companies]);
 const filtered=useMemo(()=>{const q=query.toLocaleLowerCase('pt-BR').trim();return located.filter(c=>(status==='all'||c.normalizedStatus===status)&&(sector==='all'||c.setor===sector)&&(!q||`${c.razao} ${c.cnpj} ${c.endereco} ${c.bairro}`.toLocaleLowerCase('pt-BR').includes(q)));},[located,query,status,sector]);
 const geojson=useMemo(()=>({type:'FeatureCollection' as const,features:filtered.map(c=>({type:'Feature' as const,geometry:{type:'Point' as const,coordinates:[c._lng,c._lat]},properties:{id:c.id,color:colorBy==='sector'?safeColor(c.setorHex):(STATUS[text(c.normalizedStatus)]?.color??'#64748b')}}))}),[filtered,colorBy]);
 geojsonRef.current=geojson;

 useEffect(()=>{
  if(!container.current||mapRef.current)return;
  const style={version:8 as const,glyphs:`${location.origin}/maps/fonts/{fontstack}/{range}.pbf`,sprite:`${location.origin}/maps/sprites/light`,sources:{protomaps:{type:'vector' as const,url:`pmtiles://${location.origin}/maps/belem-rmb.pmtiles`,attribution:'© OpenStreetMap contributors · Protomaps'}},layers:layers('protomaps',namedFlavor('light'),{lang:'pt'})};
  const map=new maplibregl.Map({container:container.current,style,center:[-48.46,-1.39],zoom:10.5,minZoom:8,maxZoom:17,attributionControl:false});
  mapRef.current=map;map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
  map.on('error',e=>{console.error('Territorial map:',e.error);setMapError('Não foi possível carregar a base cartográfica local.');});
  map.on('load',()=>{
   map.addSource('establishments',{type:'geojson',data:geojsonRef.current,cluster:true,clusterMaxZoom:14,clusterRadius:48});
   map.addLayer({id:'clusters',type:'circle',source:'establishments',filter:['has','point_count'],paint:{'circle-color':'#a9152d','circle-radius':['step',['get','point_count'],18,25,23,100,29],'circle-stroke-color':'#fff','circle-stroke-width':2}});
   map.addLayer({id:'cluster-count',type:'symbol',source:'establishments',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Noto Sans Medium'],'text-size':12},paint:{'text-color':'#fff'}});
   map.addLayer({id:'establishment-points',type:'circle',source:'establishments',filter:['!', ['has','point_count']],paint:{'circle-color':['get','color'],'circle-radius':7,'circle-stroke-color':'#fff','circle-stroke-width':2}});
   map.on('click','clusters',async e=>{const feature=map.queryRenderedFeatures(e.point,{layers:['clusters']})[0];const id=Number(feature?.properties?.cluster_id);const source=map.getSource('establishments') as GeoJSONSource;if(!Number.isFinite(id))return;const zoom=await source.getClusterExpansionZoom(id);map.easeTo({center:(feature.geometry as GeoJSON.Point).coordinates as [number,number],zoom});});
   map.on('click','establishment-points',(e:MapMouseEvent)=>{const feature=map.queryRenderedFeatures(e.point,{layers:['establishment-points']})[0];const item=companies.find(c=>c.id===String(feature?.properties?.id));if(!item)return;popup.current?.remove();const root=document.createElement('div');root.className='territorial-popup';const statusInfo=STATUS[text(item.normalizedStatus)]??{label:text(item.situacao),color:'#64748b'};root.innerHTML=`<span class="map-popup-status" style="--status-color:${statusInfo.color}">${statusInfo.label}</span><strong></strong><p></p><dl><div><dt>CNPJ/CPF</dt><dd></dd></div><div><dt>Setor</dt><dd></dd></div></dl>`;root.querySelector('strong')!.textContent=text(item.razao);root.querySelector('p')!.textContent=`${text(item.endereco)} · ${text(item.bairro)}`;const dds=root.querySelectorAll('dd');dds[0].textContent=text(item.cnpj);dds[1].textContent=text(item.setor);if(canEdit){const button=document.createElement('button');button.type='button';button.textContent='Editar cadastro';button.onclick=()=>onEdit(item);root.append(button);}popup.current=new maplibregl.Popup({offset:12,maxWidth:'300px'}).setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number,number]).setDOMContent(root).addTo(map);});
   for(const layer of ['clusters','establishment-points']){map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer';});map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';});}
  });
  return()=>{popup.current?.remove();map.remove();mapRef.current=null;};
 // The map instance is intentionally created once; data updates through the source below.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{const map=mapRef.current;if(!map?.isStyleLoaded())return;const source=map.getSource('establishments') as GeoJSONSource|undefined;source?.setData(geojson);},[geojson]);
 const fit=()=>{const map=mapRef.current;if(!map||!filtered.length)return;const bounds=new maplibregl.LngLatBounds();filtered.forEach(p=>bounds.extend([p._lng,p._lat]));map.fitBounds(bounds,{padding:60,maxZoom:14,duration:650});};

 return <div className="territorial-layout">
  <aside className="territorial-tools" aria-label="Filtros do mapa">
   <div className="territorial-count"><MapPin size={18}/><div><strong>{filtered.length.toLocaleString('pt-BR')}</strong><span>no mapa</span></div></div>
   <label className="territorial-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Empresa, CNPJ ou endereço" aria-label="Pesquisar no mapa"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Limpar pesquisa"><X size={15}/></button>}</label>
   <label>Situação<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todas</option>{Object.entries(STATUS).map(([value,item])=><option key={value} value={value}>{item.label}</option>)}</select></label>
   <label>Setor<select value={sector} onChange={e=>setSector(e.target.value)}><option value="all">Todos os setores</option>{sectors.map(value=><option key={value}>{value}</option>)}</select></label>
   <fieldset><legend>Colorir pontos por</legend><div className="workspace-segments"><button type="button" aria-pressed={colorBy==='status'} onClick={()=>setColorBy('status')}>Situação</button><button type="button" aria-pressed={colorBy==='sector'} onClick={()=>setColorBy('sector')}>Setor</button></div></fieldset>
   <button type="button" className="workspace-button workspace-button-secondary territorial-fit" onClick={fit}><LocateFixed size={16}/>Enquadrar resultados</button>
   <p><strong>{unlocated.toLocaleString('pt-BR')}</strong> cadastros sem localização suficiente. Endereços aproximados pelo bairro são identificados apenas internamente no cálculo.</p>
  </aside>
  <div className="territorial-map-wrap"><div ref={container} className="territorial-map" aria-label="Mapa territorial dos estabelecimentos"/>{mapError&&<div className="territorial-map-error" role="alert">{mapError}</div>}<div className="territorial-map-note">Base própria · sem consumo da API Mapbox</div></div>
 </div>;
}
