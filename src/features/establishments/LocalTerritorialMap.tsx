import {useEffect,useMemo,useRef,useState} from 'react';
import * as L from 'leaflet';
import {leafletLayer} from 'protomaps-leaflet';
import {LocateFixed,MapPin,Search,X} from 'lucide-react';
import type {Establishment} from './model';
import {loadLocationCaches,locateEstablishment,spreadLocation} from './geolocation';
import 'leaflet/dist/leaflet.css';

// protomaps-leaflet extends the Leaflet global at runtime. Expose the same
// module instance imported above so the layer also works after bundling.
(globalThis as typeof globalThis & {L:typeof L}).L=L;

const STATUS:Record<string,{label:string;color:string}>={REGULAR:{label:'Regular',color:'#16835f'},VENCIDO:{label:'Vencido',color:'#b5122d'},PARADO:{label:'Pendente',color:'#d18a16'},SEM_SISGAT:{label:'Sem SISGAT',color:'#596678'},DESATIVADO:{label:'Desativado',color:'#8993a1'}};
type PointItem=Establishment&{_lng:number;_lat:number;_precision:string};
const text=(value:unknown,fallback='Não informado')=>String(value??'').trim()||fallback;
const safeColor=(value:unknown)=>/^#[0-9a-f]{6}$/i.test(String(value))?String(value):'#64748b';

function popupContent(item:Establishment,canEdit:boolean,onEdit:(item:Establishment)=>void){
 const root=document.createElement('div');root.className='territorial-popup';
 const statusInfo=STATUS[text(item.normalizedStatus)]??{label:text(item.situacao),color:'#64748b'};
 root.innerHTML='<span class="map-popup-status"></span><strong></strong><p></p><dl><div><dt>CNPJ/CPF</dt><dd></dd></div><div><dt>Setor</dt><dd></dd></div></dl>';
 const statusBadge=root.querySelector<HTMLElement>('.map-popup-status')!;statusBadge.textContent=statusInfo.label;statusBadge.style.setProperty('--status-color',statusInfo.color);
 root.querySelector('strong')!.textContent=text(item.razao);root.querySelector('p')!.textContent=`${text(item.endereco)} · ${text(item.bairro)}`;
 const values=root.querySelectorAll('dd');values[0].textContent=text(item.cnpj);values[1].textContent=text(item.setor);
 if(canEdit){const button=document.createElement('button');button.type='button';button.textContent='Editar cadastro';button.onclick=()=>onEdit(item);root.append(button);}
 return root;
}

export default function TerritorialMap({companies,onEdit,canEdit}:{companies:Establishment[];onEdit:(item:Establishment)=>void;canEdit:boolean}){
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<L.Map|null>(null),pointsRef=useRef<L.LayerGroup|null>(null),canvasRef=useRef<L.Canvas|null>(null);
 const [located,setLocated]=useState<PointItem[]>([]),[unlocated,setUnlocated]=useState(0),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[sector,setSector]=useState('all'),[colorBy,setColorBy]=useState<'status'|'sector'>('status'),[mapError,setMapError]=useState(''),[mapReady,setMapReady]=useState(false);
 useEffect(()=>{let active=true;loadLocationCaches().then(caches=>{if(!active)return;const points:PointItem[]=[];let missing=0;for(const company of companies){const base=locateEstablishment(company,caches);if(!base){missing++;continue;}const point=spreadLocation(company,base);points.push({...company,_lng:point.lng,_lat:point.lat,_precision:point.precision});}setLocated(points);setUnlocated(missing);});return()=>{active=false;};},[companies]);
 const sectors=useMemo(()=>[...new Set(companies.map(company=>text(company.setor,'')).filter(Boolean))].sort(),[companies]);
 const filtered=useMemo(()=>{const normalized=query.toLocaleLowerCase('pt-BR').trim();return located.filter(company=>(status==='all'||company.normalizedStatus===status)&&(sector==='all'||company.setor===sector)&&(!normalized||`${company.razao} ${company.cnpj} ${company.endereco} ${company.bairro}`.toLocaleLowerCase('pt-BR').includes(normalized)));},[located,query,status,sector]);

 useEffect(()=>{
  if(!container.current||mapRef.current)return;
  let map:L.Map;
  try{
   map=L.map(container.current,{center:[-1.39,-48.46],zoom:11,minZoom:8,maxZoom:20,zoomControl:false,attributionControl:true,preferCanvas:true,zoomAnimation:true,fadeAnimation:true,markerZoomAnimation:true,zoomSnap:.5,wheelDebounceTime:30,wheelPxPerZoomLevel:90});
   L.control.zoom({position:'topright'}).addTo(map);
   const base=leafletLayer({url:`${location.origin}/maps/belem-rmb.pmtiles`,flavor:'light',lang:'pt',minZoom:8,maxZoom:20,maxDataZoom:15,noWrap:true,bounds:[[-1.58,-48.7],[-1,-48.15]],attribution:'© OpenStreetMap contributors · Protomaps'});
   base.on('load',()=>{setMapReady(true);setMapError('');map.invalidateSize(false);});
   base.on('tileerror',(event:unknown)=>{console.error('Territorial base map:',event);setMapError('Não foi possível carregar a base cartográfica local.');});
   base.addTo(map);mapRef.current=map;canvasRef.current=L.canvas({padding:.5,tolerance:7});pointsRef.current=L.layerGroup().addTo(map);
  }catch(error){console.error('Territorial map initialization:',error);setMapError('O mapa não conseguiu iniciar. Atualize a página para tentar novamente.');return;}
  const resize=()=>map.invalidateSize(false),observer=new ResizeObserver(resize);observer.observe(container.current);
  const frame=requestAnimationFrame(resize),timer=window.setTimeout(resize,500);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);clearTimeout(timer);map.remove();mapRef.current=null;pointsRef.current=null;canvasRef.current=null;};
 // The map instance is created once and receives point updates through the layer below.
 },[]);

 useEffect(()=>{
  const map=mapRef.current,group=pointsRef.current,renderer=canvasRef.current;if(!map||!group||!renderer)return;group.clearLayers();
  const addPoint=(item:PointItem)=>{const color=colorBy==='sector'?safeColor(item.setorHex):(STATUS[text(item.normalizedStatus)]?.color??'#64748b'),zoom=map.getZoom();const marker=L.circleMarker([item._lat,item._lng],{renderer,radius:zoom>=19?5:6,weight:2,color:'#fff',fillColor:color,fillOpacity:.9,bubblingMouseEvents:false});marker.bindPopup(()=>popupContent(item,canEdit,onEdit),{maxWidth:300,minWidth:250,offset:[0,-6],autoPanPadding:[45,45],keepInView:true});marker.addTo(group);};
  const renderPoints=()=>{
   group.clearLayers();const zoom=map.getZoom();
   if(zoom>18){filtered.forEach(addPoint);return;}
   const cellSize=zoom<11?72:zoom<13?64:zoom<16?58:52;
   const clusters:{items:PointItem[];x:number;y:number}[]=[],buckets=new Map<string,number[]>();
   for(const item of filtered){
    const point=map.project([item._lat,item._lng],zoom),gx=Math.floor(point.x/cellSize),gy=Math.floor(point.y/cellSize);let nearest=-1,distance=cellSize;
    for(let x=gx-1;x<=gx+1;x++)for(let y=gy-1;y<=gy+1;y++)for(const index of buckets.get(`${x}:${y}`)??[]){const cluster=clusters[index],current=Math.hypot(point.x-cluster.x,point.y-cluster.y);if(current<distance){nearest=index;distance=current;}}
    if(nearest>=0){const cluster=clusters[nearest],count=cluster.items.length;cluster.x=(cluster.x*count+point.x)/(count+1);cluster.y=(cluster.y*count+point.y)/(count+1);cluster.items.push(item);}
    else{const index=clusters.push({items:[item],x:point.x,y:point.y})-1,key=`${gx}:${gy}`;buckets.set(key,[...(buckets.get(key)??[]),index]);}
   }
   for(const {items} of clusters){
    if(items.length===1){addPoint(items[0]);continue;}
    const center:L.LatLngExpression=[items.reduce((sum,item)=>sum+item._lat,0)/items.length,items.reduce((sum,item)=>sum+item._lng,0)/items.length];
    const radius=items.length<10?17:items.length<100?21:26;
    const cluster=L.circleMarker(center,{renderer,radius,weight:3,color:'#fff',fillColor:'#a9152d',fillOpacity:.94,bubblingMouseEvents:false});
    cluster.bindTooltip(items.length.toLocaleString('pt-BR'),{permanent:true,direction:'center',className:'territorial-cluster-count',opacity:1});
    cluster.on('click',()=>map.flyTo(center,Math.min(zoom+2,19),{animate:true,duration:.7,easeLinearity:.22}));cluster.addTo(group);
   }
  };
  renderPoints();map.on('zoomend',renderPoints);
  return()=>{map.off('zoomend',renderPoints);group.clearLayers();};
 },[filtered,colorBy,canEdit,onEdit]);

 const fit=()=>{const map=mapRef.current;if(!map||!filtered.length)return;map.flyToBounds(L.latLngBounds(filtered.map(point=>[point._lat,point._lng] as L.LatLngTuple)),{padding:[55,55],maxZoom:filtered.length===1?18:14,animate:true,duration:.8,easeLinearity:.22});};
 return <div className="territorial-layout">
  <aside className="territorial-tools" aria-label="Filtros do mapa">
   <div className="territorial-count"><MapPin size={18}/><div><strong>{filtered.length.toLocaleString('pt-BR')}</strong><span>no mapa</span></div></div>
   <label className="territorial-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Empresa, CNPJ ou endereço" aria-label="Pesquisar no mapa"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Limpar pesquisa"><X size={15}/></button>}</label>
   <label>Situação<select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">Todas</option>{Object.entries(STATUS).map(([value,item])=><option key={value} value={value}>{item.label}</option>)}</select></label>
   <label>Setor<select value={sector} onChange={event=>setSector(event.target.value)}><option value="all">Todos os setores</option>{sectors.map(value=><option key={value}>{value}</option>)}</select></label>
   <fieldset><legend>Colorir pontos por</legend><div className="workspace-segments"><button type="button" aria-pressed={colorBy==='status'} onClick={()=>setColorBy('status')}>Situação</button><button type="button" aria-pressed={colorBy==='sector'} onClick={()=>setColorBy('sector')}>Setor</button></div></fieldset>
   <button type="button" className="workspace-button workspace-button-secondary territorial-fit" onClick={fit}><LocateFixed size={16}/>Enquadrar resultados</button>
   <p><strong>{unlocated.toLocaleString('pt-BR')}</strong> cadastros sem localização suficiente. Endereços aproximados pelo bairro são identificados apenas internamente no cálculo.</p>
  </aside>
  <div className="territorial-map-wrap"><div ref={container} className="territorial-map" aria-label="Mapa territorial dos estabelecimentos"/>{!mapReady&&!mapError&&<div className="territorial-map-loading" role="status"><span className="workspace-spinner"/>Carregando mapa territorial…</div>}{mapError&&<div className="territorial-map-error" role="alert">{mapError}</div>}<div className="territorial-map-note">Base própria · sem consumo da API Mapbox</div></div>
 </div>;
}
