import type { SVGProps } from 'react';
/** Vassoura: ícone de serviço de limpeza, no padrão visual dos demais ícones. */
export default function CleaningIcon({size=24,...props}:SVGProps<SVGSVGElement>&{size?:number}) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="m19 3-8 10M9 11l4 4M9 11c-4 1-6 4-6 8l6 2c3-2 4-4 4-6Z"/><path d="m5 19 3-5m0 6 3-5"/></svg>;
}
