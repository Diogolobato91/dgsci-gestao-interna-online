import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {financialTotals} from './financialWorkflow';
export {financialTotals} from './financialWorkflow';
import { Wallet, ArrowDownLeft, ArrowUpRight, Files } from 'lucide-react';
export type FinancialRecord = { valorDespesa: number | null; valorArrecadado: number | null; status?: string;competencia?:string|null };
export type FinancialBalance = { id: string; saldoAtual: number | null; informadoEm: string; linhaFonte: number };
export const brl = (value: number | null) => value == null ? 'Não informado' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export default function FinancialDashboard({ sat, dgsci, balances }: { sat: FinancialRecord[]; dgsci: FinancialRecord[]; balances: FinancialBalance[] }) {
  const [balanceId, setBalanceId] = useState('');
  const rows = [...sat, ...dgsci];
  const totals = financialTotals(rows);
  const balance = balances.find(item => item.id === balanceId) ?? (balances.length === 1 ? balances[0] : undefined);
  const categories = [{ name: 'SAT / UBM', ...financialTotals(sat) }, { name: 'DGSCI', ...financialTotals(dgsci) }];
  const statuses = Object.entries(rows.reduce<Record<string, number>>((acc, row) => { const key = row.status?.trim() || 'Não informada'; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const months=Array.from(new Set(rows.map(r=>r.competencia).filter((m):m is string=>!!m))).sort().slice(-12).map(month=>({name:month.slice(0,7).split('-').reverse().join('/'),...financialTotals(rows.filter(r=>r.competencia===month))}));
  const colors = ['#a31621', '#242424', '#777777', '#ce6d75', '#ababab'];
  return <div className="finance-dashboard">
    <div className="finance-intro"><div><span className="workspace-eyebrow">VISÃO FINANCEIRA</span><h2>Processos e execução financeira</h2><p>Consolidado dos filtros ativos para SAT / UBM e DGSCI. Totais financeiros desconsideram processos cancelados.</p></div><span className="workspace-badge">Dados do Supabase</span></div>
    <div className="finance-kpis">
      {[
        { label: 'Protocolos cadastrados', value: rows.length, hint: 'SAT / UBM e DGSCI', icon: Files },
        { label: 'Despesas registradas', value: brl(totals.expense), hint: `${rows.filter(r => r.valorDespesa == null).length} registros sem valor informado`, icon: ArrowUpRight },
        { label: 'Arrecadação registrada', value: brl(totals.revenue), hint: `${rows.filter(r => r.valorArrecadado == null).length} registros sem valor informado`, icon: ArrowDownLeft },
        { label: 'Saldo da planilha', value: balance ? brl(balance.saldoAtual) : 'Selecione a referência', hint: balance ? `Referência: ${balance.informadoEm || 'sem data'} · linha ${balance.linhaFonte}` : 'Saldos de referência não são somados', icon: Wallet },
      ].map(({ label, value, hint, icon: Icon }) => <article className="finance-kpi" key={label}><div><span>{label}</span><Icon size={19}/></div><strong>{value}</strong><small>{hint}</small></article>)}
    </div>
    <div className="finance-balance-select"><label htmlFor="finance-balance">Referência do saldo</label><select id="finance-balance" value={balanceId || (balances.length === 1 ? balances[0].id : '')} onChange={e => setBalanceId(e.target.value)}><option value="">Selecione um saldo informado</option>{balances.map(row => <option key={row.id} value={row.id}>{row.informadoEm || 'Sem data'} · linha {row.linhaFonte} · {brl(row.saldoAtual)}</option>)}</select><p>Saldo preservado da fonte. Alterar um protocolo atualiza os totais, mas não recalcula esse saldo automaticamente.</p></div>
    <div className="finance-charts">
      <section className="finance-chart"><h3>Despesas e arrecadação por origem</h3><p>Valores registrados nos processos, em reais.</p><div role="img" aria-label={categories.map(r => `${r.name}: despesas ${brl(r.expense)}, arrecadação ${brl(r.revenue)}`).join('; ')}><ResponsiveContainer width="100%" height={290}><BarChart data={categories} margin={{ left: 8, right: 12, top: 16 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis tickFormatter={value => `${Number(value) / 1000} mil`} width={70}/><Tooltip formatter={value => brl(Number(value))}/><Legend/><Bar dataKey="expense" name="Despesas" fill="#a31621" radius={[5,5,0,0]}/><Bar dataKey="revenue" name="Arrecadação" fill="#242424" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>
      <section className="finance-chart"><h3>Situação dos processos</h3><p>Distribuição dos protocolos nos filtros ativos.</p>{rows.length ? <><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={statuses} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>{statuses.map((item, i) => <Cell key={item.name} fill={colors[i % colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><ul className="finance-legend">{statuses.map((item, i) => <li key={item.name}><span><i style={{ background: colors[i % colors.length] }}/>{item.name}</span><strong>{item.value}</strong></li>)}</ul></> : <p>Nenhum processo cadastrado.</p>}</section>
    </div>
    <section className="finance-chart finance-monthly"><h3>Últimas 12 competências informadas</h3><p>Despesas e arrecadações dos filtros ativos. Registros sem competência não entram nesta série.</p>{months.length?<ResponsiveContainer width="100%" height={260}><BarChart data={months}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis width={70} tickFormatter={v=>`${Number(v)/1000} mil`}/><Tooltip formatter={v=>brl(Number(v))}/><Legend/><Bar dataKey="expense" name="Despesas" fill="#a31621"/><Bar dataKey="revenue" name="Arrecadação" fill="#242424"/></BarChart></ResponsiveContainer>:<p>Nenhuma competência informada nos processos desta consulta.</p>}</section>
  </div>;
}
