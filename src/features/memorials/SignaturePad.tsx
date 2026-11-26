import { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

type SignaturePadProps={label:string;name:string;value:string;onChange:(value:string)=>void};
const WIDTH=720,HEIGHT=180,MAX_DATA_URL_LENGTH=66_000;

export default function SignaturePad({label,name,value,onChange}:SignaturePadProps){
 const canvasRef=useRef<HTMLCanvasElement>(null);const drawing=useRef(false);const [error,setError]=useState('');
 const prepareCanvas=()=>{const canvas=canvasRef.current;if(!canvas)return null;const context=canvas.getContext('2d');if(!context)return null;context.lineWidth=3.4;context.lineCap='round';context.lineJoin='round';context.strokeStyle='#182638';context.fillStyle='#fff';return{canvas,context};};
 useEffect(()=>{const target=canvasRef.current;if(!target)return;const context=target.getContext('2d');if(!context)return;context.fillStyle='#fff';context.fillRect(0,0,WIDTH,HEIGHT);if(value){const image=new Image();image.onload=()=>{context.fillStyle='#fff';context.fillRect(0,0,WIDTH,HEIGHT);context.drawImage(image,0,0,WIDTH,HEIGHT);};image.src=value;}},[value]);
 const point=(event:React.PointerEvent<HTMLCanvasElement>)=>{const rect=event.currentTarget.getBoundingClientRect();return{x:(event.clientX-rect.left)*WIDTH/rect.width,y:(event.clientY-rect.top)*HEIGHT/rect.height};};
 const start=(event:React.PointerEvent<HTMLCanvasElement>)=>{event.preventDefault();const prepared=prepareCanvas();if(!prepared)return;const p=point(event);event.currentTarget.setPointerCapture(event.pointerId);prepared.context.beginPath();prepared.context.moveTo(p.x,p.y);prepared.context.lineTo(p.x+.1,p.y+.1);prepared.context.stroke();drawing.current=true;setError('');};
 const move=(event:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;event.preventDefault();const prepared=prepareCanvas();if(!prepared)return;const p=point(event);prepared.context.lineTo(p.x,p.y);prepared.context.stroke();};
 const finish=()=>{if(!drawing.current)return;drawing.current=false;saveCanvas();};
 const saveCanvas=()=>{const canvas=canvasRef.current;if(!canvas)return;const image=canvas.toDataURL('image/jpeg',.62);if(image.length>MAX_DATA_URL_LENGTH){setError('A assinatura ficou grande demais. Limpe e tente novamente com um traço mais simples.');onChange('');return;}setError('');onChange(image);};
 const clear=()=>{const prepared=prepareCanvas();if(!prepared)return;prepared.context.fillStyle='#fff';prepared.context.fillRect(0,0,WIDTH,HEIGHT);onChange('');setError('');};
 const useTypedName=()=>{const prepared=prepareCanvas();if(!prepared)return;if(!name.trim()){setError('Preencha o nome do responsável antes de inserir a assinatura digitada.');return;}const {context}=prepared;context.fillStyle='#fff';context.fillRect(0,0,WIDTH,HEIGHT);let size=52;context.textAlign='center';context.textBaseline='middle';context.fillStyle='#182638';context.font=`italic ${size}px cursive`;while(context.measureText(name.trim()).width>WIDTH-36&&size>28){size-=2;context.font=`italic ${size}px cursive`;}context.fillText(name.trim(),WIDTH/2,HEIGHT/2,WIDTH-36);saveCanvas();};
 return <div className="memorial-signature-pad" role="group" aria-label={`Assinatura de ${label}`}>
  <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img" aria-label={`Área para desenhar a assinatura de ${label}. Também é possível inserir o nome digitado.`} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/>
  <div className="memorial-signature-tools"><span>{value?'Assinatura registrada':'Desenhe com o dedo, caneta ou mouse'}</span><div><button type="button" onClick={useTypedName} aria-label={`Inserir assinatura digitada de ${label}`}><PenLine size={15}/>Usar nome digitado</button><button type="button" onClick={clear} aria-label={`Limpar assinatura de ${label}`}><Eraser size={15}/>Limpar</button></div></div>
  {error&&<small className="memorial-signature-error" role="alert">{error}</small>}
 </div>;
}
