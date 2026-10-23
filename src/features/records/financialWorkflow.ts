export const WORKFLOW_STATUS={aguardando:'Aguardando',autorizado:'Autorizado',pago:'Pago',cancelado:'Cancelado'} as const;
export type WorkflowStatus=keyof typeof WORKFLOW_STATUS;
export type Authorization={id:string;category:'sat'|'dgsci';linhaFonte:number;protocolo:string;unidade?:string;referencia:string;destino:string;qtdEfetivo:number|null;periodo:string;valorDespesa:number|null;valorArrecadado:number|null;status?:string;workflowStatus?:WorkflowStatus;situacaoOriginal?:string;competencia:string|null;dataAutorizacao?:string;observacao?:string;version:number};
export type Budget={id:string;competencia:string;unidade:string;saldo_inicial:number;observacao:string;version:number};
export const unitKey=(unit:string|null|undefined)=>unit?.trim().toLocaleUpperCase('pt-BR')||'';
export function normalizeWorkflow(value:string|undefined):WorkflowStatus {
 const text=(value||'').toUpperCase();return text.includes('CANCEL')?'cancelado':text.includes('PAGA')||text==='PAGO'?'pago':text.includes('AUTORIZ')?'autorizado':'aguardando';
}
export function financialTotals(rows:{valorDespesa:number|null;valorArrecadado:number|null;status?:string;workflowStatus?:WorkflowStatus}[]) {
 return rows.filter(r=>(r.workflowStatus||normalizeWorkflow(r.status))!=='cancelado').reduce((total,r)=>({expense:Math.round((total.expense+(r.valorDespesa??0))*100)/100,revenue:Math.round((total.revenue+(r.valorArrecadado??0))*100)/100}),{expense:0,revenue:0});
}
export function scopedBalance(rows:Authorization[],budget:Budget|undefined) {
 if(!budget)return null;
 const selected=rows.filter(r=>r.competencia===budget.competencia&&unitKey(r.unidade||(r.category==='dgsci'?'DGSCI':''))===unitKey(budget.unidade));
 if(selected.some(r=>(r.workflowStatus||normalizeWorkflow(r.status))!=='cancelado'&&(r.valorDespesa==null||r.valorArrecadado==null)))return null;
 const totals=financialTotals(selected);
 return Math.round((budget.saldo_inicial+totals.revenue-totals.expense)*100)/100;
}
export function financeError(error:{code?:string;message?:string}|null) {
 if(error?.code==='23505')return 'Já existe um registro para essa referência. Atualize a consulta.';
 if(error?.code==='22023')return error.message||'Confira os dados informados.';
 if(error?.code==='42501')return 'Somente a Subdiretoria pode fazer esta alteração.';
 return 'Não foi possível salvar. Confira os dados e tente novamente.';
}

export function financialCompleteness(rows: {valorDespesa:number|null;valorArrecadado:number|null;status?:string;workflowStatus?:WorkflowStatus}[]) {
 const active=rows.filter(r=>(r.workflowStatus||normalizeWorkflow(r.status))!=='cancelado');
 return {active:active.length,cancelled:rows.length-active.length,missingExpense:active.filter(r=>r.valorDespesa==null).length,missingRevenue:active.filter(r=>r.valorArrecadado==null).length};
}
export function financialStatus(row:{status?:string;workflowStatus?:WorkflowStatus}) {
 return WORKFLOW_STATUS[row.workflowStatus||normalizeWorkflow(row.status)];
}
