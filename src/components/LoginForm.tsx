import { useState } from 'react';
import { ArrowRight, LockKeyhole, UserCheck, ShieldAlert, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MILITARY_RANKS } from '@/lib/rankHierarchy';
import { maskCpf, validateRegistrationForm, cleanDigits } from '@/lib/userValidation';

export default function LoginForm() {
  const { user, login, register, logout, authError } = useAuth();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Estados do formulário de login simples
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Estados do formulário de cadastro completo
  const [nome, setNome] = useState('');
  const [postoGraduacao, setPostoGraduacao] = useState<string>('SD');
  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [contato, setContato] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 1. Caso o usuário esteja logado com cadastro pendente, rejeitado ou bloqueado
  if (user && user.registrationStatus && user.registrationStatus !== 'approved') {
    const isPending = user.registrationStatus === 'pending_approval';
    const isRejected = user.registrationStatus === 'rejected';
    const isBlocked = user.registrationStatus === 'blocked';

    return (
      <main className="preview-entry">
        <section className="pending-status-card">
          <img src="/portal/assets/dgsci-logo.png" alt="DGSCI" width="62" height="77" />
          <p className="portal-eyebrow">DGSCI / CBMPA · SITUAÇÃO CADASTRAL</p>
          
          <div className="status-notice-box">
            {isPending && (
              <>
                <div className="status-icon-badge is-pending">
                  <UserCheck size={32} />
                </div>
                <h2>Cadastro em análise</h2>
                <span className="status-tag is-pending">Aguardando aprovação</span>
                <p className="status-main-message">
                  Cadastro recebido. Aguarde a aprovação do administrador para acessar o sistema.
                </p>
              </>
            )}

            {isRejected && (
              <>
                <div className="status-icon-badge is-rejected">
                  <ShieldAlert size={32} />
                </div>
                <h2>Cadastro não aprovado</h2>
                <span className="status-tag is-rejected">Solicitação Rejeitada</span>
                <p className="status-main-message">
                  {user.rejectionReason
                    ? `Justificativa: ${user.rejectionReason}`
                    : 'Sua solicitação de cadastro não foi aprovada pelo administrador.'}
                </p>
              </>
            )}

            {isBlocked && (
              <>
                <div className="status-icon-badge is-blocked">
                  <LockKeyhole size={32} />
                </div>
                <h2>Acesso bloqueado</h2>
                <span className="status-tag is-blocked">Acesso Desabilitado</span>
                <p className="status-main-message">
                  Seu acesso ao sistema foi suspenso pelo administrador. Entre em contato com a gestão da DGSCI para mais informações.
                </p>
              </>
            )}

            <div className="status-user-details">
              <div>
                <small>Nome / Identificação</small>
                <strong>{user.nome || user.matricula}</strong>
              </div>
              <div>
                <small>E-mail da conta</small>
                <span>{user.email}</span>
              </div>
            </div>

            <button type="button" className="status-logout-btn" onClick={logout}>
              <LogOut size={16} />
              <span>Sair da conta</span>
            </button>
          </div>

          <div className="entry-disclaimer">
            <LockKeyhole size={16} />
            <p>O acesso a registros internos, portarias e documentos permanece restrito até a liberação administrativa.</p>
          </div>
        </section>
      </main>
    );
  }

  // 2. Fluxo público: Login ou Solicitação de Cadastro
  return (
    <main className="preview-entry">
      <section>
        <img src="/portal/assets/dgsci-logo.png" alt="DGSCI" width="62" height="77" />
        <p className="portal-eyebrow">DGSCI / CBMPA</p>
        <h1>
          Sistema de<br />
          <span>Gestão Interna</span>
        </h1>
        <p>Acesso aos registros administrativos, controles e documentos da DGSCI / CBMPA.</p>

        {creating ? (
          /* FORMULÁRIO DE CADASTRO COM APROVAÇÃO */
          <form
            noValidate
            onSubmit={async event => {
              event.preventDefault();
              setBusy(true);
              setError('');
              setMessage('');

              const validation = validateRegistrationForm({
                nome,
                postoGraduacao,
                matricula,
                cpf,
                dataNascimento,
                contato,
                email: regEmail,
                password,
                confirmPassword,
              });

              if (Object.keys(validation).length > 0) {
                setFieldErrors(validation);
                setBusy(false);
                return;
              }
              setFieldErrors({});

              try {
                await register({
                  nome,
                  postoGraduacao,
                  matricula,
                  cpf: cleanDigits(cpf),
                  dataNascimento,
                  contato,
                  email: regEmail,
                  password,
                });
                setMessage('Cadastro recebido. Aguarde a aprovação do administrador para acessar o sistema.');
                setCreating(false);
                // Limpa campos sensíveis
                setPassword('');
                setConfirmPassword('');
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : 'Não foi possível concluir a solicitação.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-group-title">
              <span>1</span> Dados de Identificação
            </div>

            <div className="field-block">
              <label htmlFor="reg-nome">Nome completo *</label>
              <input
                id="reg-nome"
                type="text"
                required
                maxLength={160}
                value={nome}
                onChange={e => {
                  setNome(e.target.value);
                  if (fieldErrors.nome) setFieldErrors({ ...fieldErrors, nome: '' });
                }}
                placeholder="Ex.: João da Silva Pereira"
              />
              {fieldErrors.nome && <p className="field-error">{fieldErrors.nome}</p>}
            </div>

            <div className="form-row-2">
              <div className="field-block">
                <label htmlFor="reg-posto">Posto / Graduação *</label>
                <select
                  id="reg-posto"
                  required
                  value={postoGraduacao}
                  onChange={e => setPostoGraduacao(e.target.value)}
                >
                  {MILITARY_RANKS.map(rank => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))}
                </select>
                {fieldErrors.postoGraduacao && <p className="field-error">{fieldErrors.postoGraduacao}</p>}
              </div>

              <div className="field-block">
                <label htmlFor="reg-matricula">Matrícula funcional *</label>
                <input
                  id="reg-matricula"
                  type="text"
                  required
                  maxLength={50}
                  value={matricula}
                  onChange={e => {
                    setMatricula(e.target.value);
                    if (fieldErrors.matricula) setFieldErrors({ ...fieldErrors, matricula: '' });
                  }}
                  placeholder="Ex.: 5912345"
                />
                {fieldErrors.matricula && <p className="field-error">{fieldErrors.matricula}</p>}
              </div>
            </div>

            <div className="field-block">
              <label htmlFor="reg-contact">Contato (DDD + telefone) *</label>
              <input id="reg-contact" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={20}
                placeholder="(91) 99999-9999" value={contato} onChange={e => { setContato(e.target.value); setFieldErrors({...fieldErrors,contato:''}); }}/>
              <small>Utilizado pela Administração para contato e na escala de serviço.</small>
              {fieldErrors.contato && <p className="field-error">{fieldErrors.contato}</p>}
            </div>

            <div className="form-group-title">
              <span>2</span> Documentos Pessoais
            </div>

            <div className="form-row-2">
              <div className="field-block">
                <label htmlFor="reg-cpf">CPF *</label>
                <input
                  id="reg-cpf"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={14}
                  value={cpf}
                  onChange={e => {
                    setCpf(maskCpf(e.target.value));
                    if (fieldErrors.cpf) setFieldErrors({ ...fieldErrors, cpf: '' });
                  }}
                  placeholder="000.000.000-00"
                />
                {fieldErrors.cpf && <p className="field-error">{fieldErrors.cpf}</p>}
              </div>

              <div className="field-block">
                <label htmlFor="reg-nascimento">Data de nascimento *</label>
                <input
                  id="reg-nascimento"
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={dataNascimento}
                  onChange={e => {
                    setDataNascimento(e.target.value);
                    if (fieldErrors.dataNascimento) setFieldErrors({ ...fieldErrors, dataNascimento: '' });
                  }}
                />
                {fieldErrors.dataNascimento && <p className="field-error">{fieldErrors.dataNascimento}</p>}
              </div>
            </div>

            <div className="form-group-title">
              <span>3</span> Acesso ao Portal
            </div>

            <div className="field-block">
              <label htmlFor="reg-email">E-mail institucional / pessoal *</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={regEmail}
                onChange={e => {
                  setRegEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                }}
                placeholder="seu.email@cbmpa.pa.gov.br"
              />
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </div>

            <div className="form-row-2">
              <div className="field-block">
                <label htmlFor="reg-password">Senha *</label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  placeholder="Mínimo 8 caracteres"
                />
                {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
              </div>

              <div className="field-block">
                <label htmlFor="reg-confirm-password">Confirmar senha *</label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                  }}
                  placeholder="Repita a senha"
                />
                {fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}
              </div>
            </div>

            {error && (
              <p className="login-error" role="alert">
                <AlertCircle size={15} />
                <span>{error}</span>
              </p>
            )}

            <button type="submit" disabled={busy} className="submit-registration-btn">
              {busy ? 'Enviando cadastro…' : 'Solicitar cadastro no sistema'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          /* FORMULÁRIO DE LOGIN CONVENCIONAL */
          <form
            onSubmit={async event => {
              event.preventDefault();
              setBusy(true);
              setError('');
              setMessage('');
              try {
                await login(loginEmail, loginPassword);
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : 'Não foi possível entrar no sistema.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="field-block">
              <label htmlFor="account-email">E-mail cadastrado</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="Seu e-mail cadastrado"
              />
            </div>

            <div className="field-block">
              <label htmlFor="account-password">Senha</label>
              <input
                id="account-password"
                type="password"
                autoComplete="current-password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Sua senha de acesso"
              />
            </div>

            {(error || authError) && (
              <p className="login-error" role="alert">
                <AlertCircle size={15} />
                <span>{error || authError}</span>
              </p>
            )}

            {message && (
              <p className="login-message" role="status">
                <CheckCircle2 size={16} />
                <span>{message}</span>
              </p>
            )}

            <button type="submit" disabled={busy}>
              {busy ? 'Conectando…' : 'Entrar no sistema'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        <button
          className="login-mode"
          type="button"
          onClick={() => {
            setCreating(!creating);
            setError('');
            setMessage('');
            setFieldErrors({});
          }}
        >
          {creating ? 'Já possui cadastro? Clique aqui para entrar' : 'Não possui acesso? Solicitar cadastro'}
        </button>

        <div className="entry-disclaimer">
          <LockKeyhole size={16} />
          <p>
            O acesso a este sistema é institucional. Novos cadastros passam por aprovação prévia do administrador antes da liberação de setores e permissões.
          </p>
        </div>
      </section>
    </main>
  );
}
