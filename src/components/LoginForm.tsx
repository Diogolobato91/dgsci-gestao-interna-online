import { useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {
  const { login, register, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return <main className="preview-entry"><section><img src="/portal/assets/dgsci-logo.png" alt="DGSCI" width="62" height="77" /><p className="portal-eyebrow">DGSCI / CBMPA</p><h1>Sistema de<br /><span>Gestão Interna</span></h1><p>Acesso aos registros administrativos, controles e documentos da DGSCI / CBMPA.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(''); setMessage('');
      try {
        if (creating) {
          const result = await register(email, password);
          if (result === 'pending') { setMessage('Confira o e-mail para confirmar o cadastro. Após confirmar, volte a esta página e entre.'); setCreating(false); setPassword(''); }
        } else await login(email, password);
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir.'); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="account-email">E-mail autorizado</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Seu e-mail" />
      <label htmlFor="account-password">Senha</label><input id="account-password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} required minLength={creating ? 8 : 1} value={password} onChange={e => setPassword(e.target.value)} placeholder={creating ? 'Crie uma senha com pelo menos 8 caracteres' : 'Sua senha'} />
      {(error || authError) && <p className="login-error" role="alert">{error || authError}</p>}{message && <p className="login-message" role="status">{message}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Aguarde…' : creating ? 'Criar minha conta' : 'Entrar no sistema'}<ArrowRight size={18} /></button>
    </form>
    <button className="login-mode" onClick={() => { setCreating(!creating); setError(''); setMessage(''); }}>{creating ? 'Já tenho conta. Entrar' : 'Primeiro acesso? Criar minha conta'}</button>
    <div className="entry-disclaimer"><LockKeyhole size={16} /><p>O cadastro é restrito aos e-mails autorizados. As permissões dos setores são definidas pelo administrador. Use uma senha própria para o portal.</p></div>
  </section></main>;
}
