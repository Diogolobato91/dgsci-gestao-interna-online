import {useEffect,useState} from 'react';
import {UserRound,LockKeyhole} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/lib/supabase';
import {PageHeader,ActionButton,LoadState} from '@/components/workspace/Workspace';
import {maskCpf} from '@/lib/userValidation';
import {shortDate} from '@/features/records/staffAvailability';
import {formatContact} from '@/features/records/roster';
import {passwordAction,validatePasswordChange} from './passwordService';
type Account={nome:string;email:string;posto:string|null;matricula:string|null;cpf:string|null;nascimento:string|null;contato:string|null;setores:string[]};
export default function MyAccountPage(){
 const {user}=useAuth();const [account,setAccount]=useState<Account|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[revision,setRevision]=useState(0);
 const [oldPassword,setOldPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;setAccount(null);setLoading(true);setLoadError('');void(async()=>{try{if(!supabase)throw new Error();const r=await supabase.rpc('get_my_account');if(r.error||!r.data)throw new Error();if(active)setAccount(r.data);}catch{if(active)setLoadError('Não foi possível consultar sua conta.');}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[user?.id,revision]);
 return <section className="workspace-page"><PageHeader eyebrow="Meu acesso" title="Minha conta" description="Consulte seus dados cadastrais e altere sua senha de acesso." icon={UserRound}/>{loading||!account?<LoadState error={loadError} onRetry={()=>setRevision(n=>n+1)}/>:<div className="my-account-grid">
 <section className="my-account-identification"><h2>Identificação</h2><dl>{[['Nome completo',account.nome],['E-mail',account.email],['Posto / graduação',account.posto],['Matrícula',account.matricula],['CPF',account.cpf?maskCpf(account.cpf):null],['Data de nascimento',account.nascimento?shortDate(account.nascimento):null],['Contato',account.contato?formatContact(account.contato):null],['Setores autorizados',account.setores.join(', ')]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Não informado'}</dd></div>)}</dl><p>Para corrigir seus dados cadastrais ou contato, solicite a alteração ao superadministrador.</p></section>
 <section className="my-account-contact"><h2><LockKeyhole size={19}/> Alterar senha</h2><p>Confirme sua senha atual e escolha uma nova senha com pelo menos 8 caracteres.</p><form className="record-form" onSubmit={async e=>{e.preventDefault();if(busy)return;setError('');setMessage('');const validation=validatePasswordChange(oldPassword,newPassword,confirmation);if(validation){setError(validation);return;}setBusy(true);try{setMessage(await passwordAction({action:'change',oldPassword,newPassword,confirmPassword:confirmation}));}catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar a senha.');}finally{setOldPassword('');setNewPassword('');setConfirmation('');setBusy(false);}}}>
 <div className="form-field"><label htmlFor="current-password">Senha atual *</label><input id="current-password" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} value={oldPassword} onChange={e=>setOldPassword(e.target.value)}/></div>
 <div className="form-field"><label htmlFor="new-password">Nova senha *</label><input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></div>
 <div className="form-field"><label htmlFor="confirm-password">Confirmar nova senha *</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></div>
 {error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="workspace-feedback" role="status">{message}</p>}<div className="record-actions"><ActionButton type="submit" variant="primary" disabled={busy}><LockKeyhole size={16}/>{busy?'Alterando…':'Alterar senha'}</ActionButton></div></form></section></div>}</section>;
}
