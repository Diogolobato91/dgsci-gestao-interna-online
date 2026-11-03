import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {financialTotals,financialCompleteness,financialStatus} from './financialWorkflow';
export {financialTotals} from './financialWorkflow';
import { Wallet, ArrowDownLeft, ArrowUpRight, Files } from 'lucide-react';
export type FinancialRecord = { valorDespesa: number | null; valorArrecadado: number | null; status?: string;workflowStatus?:import('./financialWorkflow').WorkflowStatus;dataInicio?:string|null;competencia?:string|null };
export type FinancialBalance = { id: string; saldoAtual: number | null; informadoEm: string; linhaFonte: number };
export const brl = (value: number | null) => value == null ? 'Não informado' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export default function FinancialDashboard({ sat, dgsci, currentBalance, balanceYear, hasAnnualBudget }: { sat: FinancialRecord[]; dgsci: FinancialRecord[]; currentBalance:number|null;balanceYear:string;hasAnnualBudget:boolean }) {
  const rows = [...sat, ...dgsci];
  const totals = financialTotals(rows);
  const completeness=financialCompleteness(rows);
  const categories = [{ name: 'SAT / UBM', ...financialTotals(sat) }, { name: 'DGSCI', ...financialTotals(dgsci) }];
  const statuses = Object.entries(rows.reduce<Record<string, number>>((acc, row) => { const key = financialStatus(row); acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const colors = ['#a31621', '#242424', '#777777', '#ce6d75', '#ababab'];
  return <div className="finance-dashboard">
    <div className="finance-intro"><div><span className="workspace-eyebrow">VISÃO FINANCEIRA</span><h2>Processos e execução financeira</h2><p>Consolidado dos filtros ativos para SAT / UBM e DGSCI. Totais financeiros desconsideram processos cancelados.</p></div><span className="workspace-badge">Dados do Supabase</span></div>
    <div className="finance-kpis">
      {[
        { label: 'Protocolos cadastrados', value: rows.length, hint: 'SAT / UBM e DGSCI', icon: Files },
        { label: completeness.missingExpense?'Despesas — subtotal informado':'Despesas registradas', value: brl(totals.expense), hint: `${completeness.missingExpense} processos ativos sem despesa informada`, icon: ArrowUpRight },
        { label: completeness.missingRevenue?'Arrecadação — subtotal informado':'Arrecadação registrada', value: brl(totals.revenue), hint: `${completeness.missingRevenue} processos ativos sem arrecadação informada`, icon: ArrowDownLeft },
        { label: 'Saldo atual', value: currentBalance!==null?brl(currentBalance):hasAnnualBudget?'Aguardando revisão':'Saldo inicial não cadastrado', hint: `Exercício ${balanceYear} · Saldo inicial anual − despesas do ano, sem somar arrecadação. Independente dos filtros da consulta.`, icon: Wallet },
      ].map(({ label, value, hint, icon: Icon }) => <article className="finance-kpi" key={label}><div><span>{label}</span><Icon size={19}/></div><strong>{value}</strong><small>{hint}</small></article>)}
    </div>
    {(completeness.missingExpense>0||completeness.missingRevenue>0)&&<p className="staff-warning" role="status">Os totais são parciais: há valores não informados em processos ativos. Campo vazio não significa R$ 0,00. Os {completeness.cancelled} processos cancelados ficam fora dos totais financeiros.</p>}
    <details className="finance-values"><summary>Conferir valores dos gráficos</summary><p>Mesmos filtros do painel; processos cancelados excluídos dos valores. Campos vazios não são somados.</p><div className="records-table" tabIndex={0} role="region" aria-label="Valores financeiros por origem"><table><thead><tr><th>Origem</th><th>Despesa informada</th><th>Arrecadação informada</th></tr></thead><tbody>{categories.map(c=><tr key={c.name}><th scope="row">{c.name}</th><td>{brl(c.expense)}</td><td>{brl(c.revenue)}</td></tr>)}</tbody></table></div></details>
    <div className="finance-charts">
      <section className="finance-chart"><h3>Despesas e arrecadação por origem</h3><p>Valores registrados nos processos, em reais.</p><div role="img" aria-label={categories.map(r => `${r.name}: despesas ${brl(r.expense)}, arrecadação ${brl(r.revenue)}`).join('; ')}><ResponsiveContainer width="100%" height={290}><BarChart data={categories} margin={{ left: 8, right: 12, top: 16 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis tickFormatter={value => `${Number(value) / 1000} mil`} width={70}/><Tooltip formatter={value => brl(Number(value))}/><Legend/><Bar dataKey="expense" name="Despesas" fill="#a31621" radius={[5,5,0,0]}/><Bar dataKey="revenue" name="Arrecadação" fill="#242424" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>
      <section className="finance-chart"><h3>Situação dos processos</h3><p>Distribuição dos protocolos nos filtros ativos.</p>{rows.length ? <><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={statuses} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>{statuses.map((item, i) => <Cell key={item.name} fill={colors[i % colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><ul className="finance-legend">{statuses.map((item, i) => <li key={item.name}><span><i style={{ background: colors[i % colors.length] }}/>{item.name}</span><strong>{item.value}</strong></li>)}</ul></> : <p>Nenhum processo cadastrado.</p>}</section>
    </div>

  </div>;
}
