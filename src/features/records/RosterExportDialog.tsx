import { useState } from 'react';
import { Download } from 'lucide-react';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { ActionButton } from '@/components/workspace/Workspace';
import { supabase } from '@/lib/supabase';
import { rosterExportPeriod } from './rosterExport';
import type { RosterExportMode } from './rosterExport';
import { fetchStaffAbsences } from './useStaffAbsences';
import { shortDate } from './staffAvailability';
export default function RosterExportDialog({day,month,onClose}:{day:string;month:string;onClose:()=>void}){
 const [mode,setMode]=useState<RosterExportMode>('day'),[busy,setBusy]=useState(false),[error,setError]=useState('');const {start,end}=rosterExportPeriod(day,month,mode);
 return <Dialog open onOpenChange={o=>{if(!o&&!busy)onClose();}}><DialogContent className="record-dialog compact-dialog"><DialogHeader><DialogTitle>Baixar escala de plantão</DialogTitle><DialogDescription>Documento para impressão com funções, nomes, contatos e observações.</DialogDescription></DialogHeader><form className="record-form" onSubmit={async e=>{e.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');try{
 const [roster,people,absences]=await Promise.all([supabase.from('plantao_roster').select('*').gte('service_date',start).lte('service_date',end).order('service_date'),supabase.rpc('get_roster_people'),fetchStaffAbsences({start,end})]);
 if(roster.error||people.error)throw new Error();const {buildRosterPdf}=await import('./rosterPdf');(await buildRosterPdf({start,end,duties:roster.data||[],people:people.data||[],absences})).save(`plantao-${start}-${end}.pdf`);onClose();
 }catch{setError('Não foi possível gerar o PDF. Confira sua conexão e tente novamente.');}finally{setBusy(false);}}}><fieldset className="roster-export-options"><legend>Período</legend>{[['day','Dia selecionado'],['week','Semana do dia selecionado'],['month','Mês selecionado']].map(([value,label])=><label key={value}><input type="radio" name="export-period" value={value} checked={mode===value} onChange={()=>setMode(value as RosterExportMode)}/>{label}</label>)}</fieldset><p>{shortDate(start)} a {shortDate(end)}</p><small>A semana vai de segunda a domingo. Dias sem escala serão identificados no documento.</small>{error&&<p className="form-error" role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={onClose}>Cancelar</ActionButton><ActionButton disabled={busy} type="submit" variant="primary"><Download size={16}/>{busy?'Gerando…':'Baixar PDF'}</ActionButton></div></form></DialogContent></Dialog>;
}
