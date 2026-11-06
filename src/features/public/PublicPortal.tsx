import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  Building2,
  Check,
  Clock3,
  Copy,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileKey,
  FileSearch,
  FolderSearch2,
  KeyRound,
  Landmark,
  LockKeyhole,
  Menu,
  MessageSquareText,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { useAccreditations } from '@/features/accreditation/useAccreditations';
import { institutionalToday, shortDate } from '@/features/records/staffAvailability';
import {
  PUBLIC_QUEUES,
  PUBLIC_SERVICES,
  PublicQueueId,
  formatCnpj,
  formatPhone,
  isValidCnpj,
  onlyDigits,
  queueById,
  serviceById,
} from './publicPortal';
import {
  getSupportConversation,
  loadSupportCredentials,
  openSupportTicket,
  saveSupportCredentials,
  sendSupportMessage,
  type OpenSupportResult,
  type SupportConversation,
  type SupportCredentials,
} from './supportChat';
import './public-portal.css';
import './public-chat-fixes.css';

const queueIcons = {
  inspection: ClipboardCheck,
  fines: ReceiptText,
  projects: FolderSearch2,
  accreditation: BadgeCheck,
  access: KeyRound,
} as const;

function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="public-header">
      <a className="public-skip" href="#public-main">Ir para o conteúdo principal</a>
      <div className="public-header-inner">
        <Link className="public-brand" to="/" aria-label="Página inicial da DGSCI">
          <img src="/portal/assets/dgsci-logo.png" alt="" width="42" height="52" />
          <span><strong>DGSCI</strong><small>Corpo de Bombeiros Militar do Pará</small></span>
        </Link>
        <button className="public-menu-button" type="button" aria-expanded={menuOpen} aria-controls="public-navigation" onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
          <span className="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
        </button>
        <nav id="public-navigation" className={menuOpen ? 'is-open' : ''} aria-label="Navegação pública">
          <a href="/#servicos" onClick={() => setMenuOpen(false)}>Serviços</a>
          <Link to="/credenciados" onClick={() => setMenuOpen(false)}>Credenciados</Link>
          <a href="/#instrucoes" onClick={() => setMenuOpen(false)}>Instruções Técnicas</a>
          <a href="/#duvidas" onClick={() => setMenuOpen(false)}>Dúvidas</a>
        </nav>
        <div className="public-header-actions">
          <Link className="public-staff-link" to="/login"><LockKeyhole size={15} /> Acesso interno</Link>
          <Link className="public-button public-button-primary public-button-compact" to="/atendimento">Iniciar atendimento</Link>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div>
        <Link className="public-brand public-brand-footer" to="/">
          <img src="/portal/assets/dgsci-logo.png" alt="" width="38" height="48" />
          <span><strong>DGSCI</strong><small>Diretoria de Serviços Técnicos</small></span>
        </Link>
        <p>Informação e atendimento técnico em um único lugar.</p>
      </div>
      <div><strong>Atendimento</strong><Link to="/atendimento">Abrir atendimento</Link><Link to="/consultar-protocolo">Consultar protocolo</Link></div>
      <div><strong>Consulta pública</strong><Link to="/credenciados">Empresas e profissionais</Link><a href="/#instrucoes">Instruções Técnicas</a></div>
      <div><strong>Área institucional</strong><Link to="/login">Acesso interno</Link><span>DGSCI / CBMPA</span></div>
    </footer>
  );
}

function PublicShell({ children }: { children: ReactNode }) {
  return <div className="public-portal"><PublicHeader />{children}<PublicFooter /></div>;
}

export function PublicHomePage() {
  return (
    <PublicShell>
      <main id="public-main">
        <section className="public-hero">
          <div className="public-hero-copy">
            <p className="public-kicker"><span /> ATENDIMENTO DIGITAL · DGSCI / CBMPA</p>
            <h1>Orientação técnica com o caminho <em>certo desde o início.</em></h1>
            <p className="public-hero-lead">Encontre serviços, consulte informações públicas e abra um atendimento direcionado automaticamente para a equipe responsável.</p>
            <div className="public-hero-actions">
              <Link className="public-button public-button-primary" to="/atendimento"><MessageSquareText size={19} /> Iniciar atendimento <ArrowRight size={18} /></Link>
              <Link className="public-button public-button-secondary" to="/consultar-protocolo"><FileSearch size={18} /> Consultar protocolo</Link>
            </div>
            <p className="public-trust-line"><ShieldCheck size={16} /> Seu atendimento recebe um protocolo e permanece na fila específica do serviço escolhido.</p>
          </div>
          <aside className="public-hero-panel" aria-label="Como funciona o atendimento">
            <div className="public-panel-top"><span>ATENDIMENTO GUIADO</span><strong>3 passos</strong></div>
            <ol>
              <li><span>01</span><div><strong>Identifique a empresa</strong><p>Informe o CNPJ e um contato responsável.</p></div></li>
              <li><span>02</span><div><strong>Escolha o serviço</strong><p>O sistema encontra a seção correta.</p></div></li>
              <li><span>03</span><div><strong>Acompanhe a fila</strong><p>Veja somente as pessoas à frente na sua seção.</p></div></li>
            </ol>
            <Link to="/atendimento">Começar agora <ChevronRight size={16} /></Link>
          </aside>
        </section>

        <section className="public-quick-access" aria-label="Acessos rápidos">
          <Link to="/atendimento"><MessageSquareText /><span><strong>Abrir atendimento</strong><small>Triagem rápida por serviço</small></span><ChevronRight /></Link>
          <Link to="/consultar-protocolo"><FileSearch /><span><strong>Consultar protocolo</strong><small>Acompanhe sua solicitação</small></span><ChevronRight /></Link>
          <Link to="/credenciados"><UserRoundCheck /><span><strong>Consultar credenciados</strong><small>Empresas e profissionais</small></span><ChevronRight /></Link>
        </section>

        <section className="public-section" id="servicos">
          <div className="public-section-heading"><div><p className="public-kicker"><span /> SERVIÇOS</p><h2>Qual assunto você precisa resolver?</h2><p>Selecione o serviço e siga diretamente para a fila responsável.</p></div><Link to="/atendimento">Ver todos os serviços <ArrowRight size={16} /></Link></div>
          <div className="public-service-grid">
            {PUBLIC_QUEUES.map(queue => {
              const Icon = queueIcons[queue.id];
              return <Link key={queue.id} to={`/atendimento?fila=${queue.id}`} className={queue.universal ? 'is-universal' : ''}>
                <span className="public-service-icon"><Icon size={23} /></span>
                <div><small>{queue.universal ? 'ATENDIDO POR TODA A EQUIPE' : 'FILA EXCLUSIVA'}</small><h3>{queue.shortLabel}</h3><p>{queue.description}</p></div>
                <span className="public-card-arrow"><ArrowRight size={18} /></span>
              </Link>;
            })}
          </div>
        </section>

        <section className="public-feature-band" id="credenciados">
          <div className="public-feature-visual" aria-hidden="true"><Building2 size={84} /><span><BadgeCheck size={24} /></span></div>
          <div><p className="public-kicker"><span /> CONSULTA PÚBLICA</p><h2>Empresas e profissionais credenciados</h2><p>Consulte a relação oficial por nome, modalidade e região. A página apresenta a validade informada na fonte institucional.</p><Link className="public-button public-button-light" to="/credenciados"><Search size={18} /> Consultar credenciados</Link></div>
        </section>

        <section className="public-section public-instructions" id="instrucoes">
          <div className="public-section-heading"><div><p className="public-kicker"><span /> BIBLIOTECA TÉCNICA</p><h2>Instruções e documentos em linguagem simples</h2><p>A biblioteca será organizada por assunto para facilitar a localização da norma aplicável.</p></div></div>
          <div className="public-instruction-grid">
            <article><BookOpenText /><span><small>CONSULTA TÉCNICA</small><h3>Instruções Técnicas</h3><p>Normas organizadas por número, tema e atualização.</p></span></article>
            <article><ClipboardCheck /><span><small>ORIENTAÇÃO</small><h3>Vistoria e licenciamento</h3><p>Requisitos, documentos e etapas do serviço.</p></span></article>
            <article><FolderSearch2 /><span><small>PROJETOS</small><h3>Análise de Projeto</h3><p>Orientações para apresentação e correção.</p></span></article>
          </div>
        </section>

        <section className="public-section public-faq" id="duvidas">
          <div className="public-section-heading"><div><p className="public-kicker"><span /> DÚVIDAS FREQUENTES</p><h2>Antes de abrir um atendimento</h2></div></div>
          <div className="public-faq-grid">
            <details><summary>Como o sistema escolhe a fila?<CircleHelp size={18} /></summary><p>Cada serviço possui uma seção responsável. Atendimentos de outras seções não alteram sua posição.</p></details>
            <details><summary>Quem pode atender reset de senha?<CircleHelp size={18} /></summary><p>Todos os VCs disponíveis podem receber solicitações de acesso e senha.</p></details>
            <details><summary>Quantos clientes cada atendente recebe?<CircleHelp size={18} /></summary><p>Cada VC terá até cinco atendimentos ativos. Os demais permanecem na fila até surgir uma vaga.</p></details>
            <details><summary>O CNPJ funciona como senha?<CircleHelp size={18} /></summary><p>Não. Ele identifica a empresa. Para voltar ao chat, também serão exigidos o protocolo e a chave de acesso gerada na abertura.</p></details>
          </div>
        </section>

        <section className="public-final-cta"><div><p className="public-kicker"><span /> CENTRAL DE ATENDIMENTO</p><h2>Vamos direcionar sua solicitação?</h2><p>Identifique a empresa, escolha o assunto e revise os dados antes de entrar na fila.</p></div><Link className="public-button public-button-primary" to="/atendimento">Iniciar atendimento <ArrowRight size={18} /></Link></section>
      </main>
    </PublicShell>
  );
}

type IntakeData = { cnpj: string; requester: string; phone: string; email: string; service: string; city: string; process: string; message: string; consent: boolean };
const emptyIntake: IntakeData = { cnpj: '', requester: '', phone: '', email: '', service: '', city: '', process: '', message: '', consent: false };

export function PublicIntakePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialQueue = PUBLIC_QUEUES.some(queue => queue.id === params.get('fila')) ? params.get('fila') as PublicQueueId : null;
  const [step, setStep] = useState(1);
  const [data, setData] = useState<IntakeData>(emptyIntake);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');
  const [opened, setOpened] = useState<OpenSupportResult | null>(null);
  const selectedService = serviceById(data.service);
  const selectedQueue = selectedService ? queueById(selectedService.queue) : initialQueue ? queueById(initialQueue) : null;
  const groupedServices = useMemo(() => PUBLIC_QUEUES.filter(queue => !initialQueue || queue.id === initialQueue).map(queue => ({ queue, services: PUBLIC_SERVICES.filter(service => service.queue === queue.id) })), [initialQueue]);

  const validateIdentity = () => {
    const next: Record<string, string> = {};
    if (!isValidCnpj(data.cnpj)) next.cnpj = 'Informe um CNPJ válido.';
    if (data.requester.trim().length < 3) next.requester = 'Informe o nome do responsável.';
    if (onlyDigits(data.phone).length < 10) next.phone = 'Informe um telefone com DDD.';
    if (!/^\S+@\S+\.\S+$/.test(data.email)) next.email = 'Informe um e-mail válido.';
    if (!data.consent) next.consent = 'Confirme a ciência para continuar.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const validateService = () => {
    if (!selectedService) { setErrors({ service: 'Escolha o serviço que melhor representa sua necessidade.' }); return false; }
    setErrors({}); return true;
  };
  const validateDetails = () => {
    const next: Record<string, string> = {};
    if (data.city.trim().length < 2) next.city = 'Informe o município.';
    if (data.message.trim().length < 20) next.message = 'Descreva a solicitação com pelo menos 20 caracteres.';
    setErrors(next); return Object.keys(next).length === 0;
  };
  const advance = (event: FormEvent) => {
    event.preventDefault();
    if (step === 1 && validateIdentity()) setStep(2);
    else if (step === 2 && validateService()) setStep(3);
    else if (step === 3 && validateDetails()) setStep(4);
  };
  const submitTicket = async () => {
    if (!selectedService || opening) return;
    setOpening(true);
    setOpenError('');
    try {
      const result = await openSupportTicket({
        service: selectedService.id,
        cnpj: data.cnpj,
        requester: data.requester.trim(),
        phone: data.phone,
        email: data.email.trim(),
        city: data.city.trim(),
        reference: data.process.trim(),
        summary: data.message.trim(),
      });
      saveSupportCredentials({ protocol: result.protocol, cnpj: data.cnpj, accessKey: result.accessKey });
      setOpened(result);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : 'Não foi possível abrir o atendimento. Tente novamente.');
    } finally {
      setOpening(false);
    }
  };
  const copyValue = (value: string) => navigator.clipboard?.writeText(value).catch(() => undefined);

  return (
    <PublicShell>
      <main id="public-main" className="public-flow-page">
        <div className="public-flow-heading"><Link to="/"><ArrowLeft size={16} /> Voltar ao portal</Link><p className="public-kicker"><span /> PRÉ-ATENDIMENTO</p><h1>Conte o que você precisa resolver.</h1><p>As respostas abaixo determinam a fila correta. Nenhum atendimento será misturado com outra seção.</p></div>
        <div className="public-flow-layout">
          <aside className="public-progress" aria-label="Etapas do atendimento">
            {[['1','Identificação','CNPJ e contato'],['2','Serviço','Escolha do assunto'],['3','Detalhes','Contexto da solicitação'],['4','Revisão','Conferência da fila']].map(([number,title,description], index) => <div key={number} className={step === index + 1 ? 'is-current' : step > index + 1 ? 'is-complete' : ''}><span>{step > index + 1 ? <Check size={16} /> : number}</span><div><strong>{title}</strong><small>{description}</small></div></div>)}
            <section><ShieldCheck size={18} /><p><strong>Fila independente</strong>Você verá somente quantas pessoas aguardam antes de você na fila escolhida.</p></section>
          </aside>
          <section className="public-flow-card">
            <div className="public-flow-card-head"><span>ETAPA {step} DE 4</span><strong>{step === 1 ? 'Identificação da empresa' : step === 2 ? 'Seleção do serviço' : step === 3 ? 'Detalhes da solicitação' : 'Revise antes de continuar'}</strong></div>
            {step < 4 ? <form noValidate onSubmit={advance}>
              {step === 1 && <div className="public-form-grid">
                <div className="public-field public-field-wide"><label htmlFor="public-cnpj">CNPJ da empresa *</label><input id="public-cnpj" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" value={data.cnpj} onChange={event => setData({ ...data, cnpj: formatCnpj(event.target.value) })} aria-invalid={!!errors.cnpj} aria-describedby={errors.cnpj ? 'public-cnpj-error' : undefined}/>{errors.cnpj && <small id="public-cnpj-error" className="public-field-error">{errors.cnpj}</small>}<small>O CNPJ identifica a empresa, mas não funciona como senha.</small></div>
                <div className="public-field public-field-wide"><label htmlFor="public-requester">Nome do responsável *</label><input id="public-requester" autoComplete="name" value={data.requester} onChange={event => setData({ ...data, requester: event.target.value })} aria-invalid={!!errors.requester}/>{errors.requester && <small className="public-field-error">{errors.requester}</small>}</div>
                <div className="public-field"><label htmlFor="public-phone">Telefone com DDD *</label><input id="public-phone" inputMode="tel" autoComplete="tel" placeholder="(91) 99999-9999" value={data.phone} onChange={event => setData({ ...data, phone: formatPhone(event.target.value) })} aria-invalid={!!errors.phone}/>{errors.phone && <small className="public-field-error">{errors.phone}</small>}</div>
                <div className="public-field"><label htmlFor="public-email">E-mail *</label><input id="public-email" type="email" autoComplete="email" placeholder="contato@empresa.com.br" value={data.email} onChange={event => setData({ ...data, email: event.target.value })} aria-invalid={!!errors.email}/>{errors.email && <small className="public-field-error">{errors.email}</small>}</div>
                <label className="public-consent public-field-wide"><input type="checkbox" checked={data.consent} onChange={event => setData({ ...data, consent: event.target.checked })}/><span>Estou ciente de que estes dados serão usados para identificar e acompanhar esta solicitação.</span></label>{errors.consent && <small className="public-field-error public-field-wide">{errors.consent}</small>}
              </div>}
              {step === 2 && <div className="public-service-picker">
                <p>Escolha a opção que melhor representa sua necessidade. Se tiver dúvida, use “Outro assunto ou orientação geral”.</p>
                {groupedServices.map(({ queue, services }) => { const Icon = queueIcons[queue.id]; return <fieldset key={queue.id}><legend><Icon size={19} /><span><strong>{queue.shortLabel}</strong><small>{queue.universal ? 'Todos os VCs podem atender' : 'Fila específica da seção'}</small></span></legend><div>{services.map(service => <label key={service.id} className={data.service === service.id ? 'is-selected' : ''}><input type="radio" name="service" value={service.id} checked={data.service === service.id} onChange={() => setData({ ...data, service: service.id })}/><span>{service.label}</span><Check size={16} /></label>)}</div></fieldset>; })}
                {errors.service && <small className="public-field-error">{errors.service}</small>}
                {initialQueue && <Link className="public-change-queue" to="/atendimento">Ver serviços de todas as seções</Link>}
              </div>}
              {step === 3 && <div className="public-form-grid">
                <div className="public-queue-confirmation public-field-wide">{selectedQueue && <><span className="public-service-icon">{(() => { const Icon = queueIcons[selectedQueue.id]; return <Icon size={21}/>; })()}</span><div><small>FILA SELECIONADA</small><strong>{selectedQueue.label}</strong><p>{selectedQueue.universal ? 'O sistema distribuirá para o VC disponível com menor carga.' : 'Somente os atendimentos desta seção determinarão sua posição.'}</p></div></>}</div>
                <div className="public-field"><label htmlFor="public-city">Município *</label><input id="public-city" value={data.city} onChange={event => setData({ ...data, city: event.target.value })} aria-invalid={!!errors.city}/>{errors.city && <small className="public-field-error">{errors.city}</small>}</div>
                <div className="public-field"><label htmlFor="public-process">Processo ou protocolo</label><input id="public-process" value={data.process} onChange={event => setData({ ...data, process: event.target.value })}/><small>Se já existir.</small></div>
                <div className="public-field public-field-wide"><label htmlFor="public-message">Descreva sua solicitação *</label><textarea id="public-message" rows={5} maxLength={1500} placeholder="Explique brevemente o que aconteceu e o que você precisa resolver." value={data.message} onChange={event => setData({ ...data, message: event.target.value })} aria-invalid={!!errors.message}/><span className="public-counter">{data.message.length}/1500</span>{errors.message && <small className="public-field-error">{errors.message}</small>}</div>
              </div>}
              <div className="public-flow-actions">{step > 1 && <button type="button" className="public-button public-button-secondary" onClick={() => { setErrors({}); setStep(step - 1); }}><ArrowLeft size={17}/> Voltar</button>}<button type="submit" className="public-button public-button-primary">Continuar <ArrowRight size={17}/></button></div>
            </form> : opened ? <div className="public-review public-ticket-created" aria-live="polite">
              <div className="public-review-status"><Check size={22}/><div><small>ATENDIMENTO ABERTO</small><strong>Seu protocolo foi criado</strong></div></div>
              <p className="public-ticket-intro">Guarde o protocolo e a chave de acesso. Eles serão necessários para voltar a esta conversa neste ou em outro dispositivo.</p>
              <div className="public-ticket-credentials">
                <div><span>PROTOCOLO</span><strong>{opened.protocol}</strong><button type="button" onClick={() => copyValue(opened.protocol)} aria-label="Copiar protocolo"><Copy size={16}/></button></div>
                <div><span>CHAVE DE ACESSO</span><strong>{opened.accessKey}</strong><button type="button" onClick={() => copyValue(opened.accessKey)} aria-label="Copiar chave de acesso"><Copy size={16}/></button></div>
              </div>
              <div className="public-preview-notice"><KeyRound size={19}/><p><strong>Esta chave aparece somente agora</strong>Anote ou copie a chave. A DGSCI não solicitará confirmação por e-mail e o atendimento ocorrerá somente neste portal.</p></div>
              <div className="public-flow-actions"><button type="button" className="public-button public-button-primary" onClick={() => navigate(`/atendimento/${encodeURIComponent(opened.protocol)}`)}>Abrir chat <ArrowRight size={17}/></button></div>
            </div> : <div className="public-review">
              <div className="public-review-status"><Check size={22}/><div><small>PRÉ-ATENDIMENTO PREENCHIDO</small><strong>Confira a fila e seus dados</strong></div></div>
              <dl><div><dt>Empresa</dt><dd>{data.cnpj}</dd></div><div><dt>Responsável</dt><dd>{data.requester}</dd></div><div><dt>Contato</dt><dd>{data.phone}<small>{data.email}</small></dd></div><div><dt>Serviço</dt><dd>{selectedService?.label}</dd></div><div><dt>Fila</dt><dd>{selectedQueue?.label}</dd></div><div><dt>Município</dt><dd>{data.city}</dd></div>{data.process && <div><dt>Processo ou protocolo</dt><dd>{data.process}</dd></div>}</dl>
              <div className="public-review-message"><strong>Resumo informado</strong><p>{data.message}</p></div>
              <div className="public-preview-notice"><Landmark size={19}/><p><strong>Entrada na fila da seção</strong>Ao confirmar, o sistema criará o protocolo, informará sua chave de acesso e tentará distribuir o chamado a um VC com vaga.</p></div>
              {openError && <p className="public-submit-error" role="alert">{openError}</p>}
              <div className="public-flow-actions"><button type="button" className="public-button public-button-secondary" onClick={() => setStep(3)} disabled={opening}><ArrowLeft size={17}/> Editar detalhes</button><button type="button" className="public-button public-button-primary" onClick={submitTicket} disabled={opening}>{opening ? 'Abrindo atendimento…' : 'Entrar na fila'} {!opening && <ArrowRight size={17}/>}</button></div>
            </div>}
          </section>
        </div>
      </main>
    </PublicShell>
  );
}

export function PublicProtocolLookupPage() {
  const navigate = useNavigate();
  const [cnpj, setCnpj] = useState('');
  const [protocol, setProtocol] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const credentials = { protocol: protocol.trim().toUpperCase(), cnpj, accessKey: accessKey.trim().toUpperCase() };
    try {
      await getSupportConversation(credentials);
      saveSupportCredentials(credentials);
      navigate(`/atendimento/${encodeURIComponent(credentials.protocol)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível localizar o atendimento.');
    } finally {
      setBusy(false);
    }
  };
  return <PublicShell><main id="public-main" className="public-simple-page"><section><Link className="public-back-link" to="/"><ArrowLeft size={16}/> Voltar ao portal</Link><span className="public-simple-icon"><FileSearch size={27}/></span><p className="public-kicker"><span/> ACOMPANHAMENTO</p><h1>Consultar protocolo</h1><p>Informe o CNPJ, o protocolo e a chave exibida na abertura do atendimento.</p><form onSubmit={submit}><div className="public-field"><label htmlFor="lookup-cnpj">CNPJ</label><input id="lookup-cnpj" required inputMode="numeric" value={cnpj} onChange={event => setCnpj(formatCnpj(event.target.value))} placeholder="00.000.000/0000-00"/></div><div className="public-field"><label htmlFor="lookup-protocol">Protocolo</label><input id="lookup-protocol" required value={protocol} onChange={event => setProtocol(event.target.value.toUpperCase())} placeholder="Informe o protocolo"/></div><div className="public-field public-field-wide"><label htmlFor="lookup-key">Chave de acesso</label><input id="lookup-key" required value={accessKey} onChange={event => setAccessKey(event.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" autoComplete="off"/></div>{error && <p className="public-submit-error public-field-wide" role="alert">{error}</p>}<button className="public-button public-button-primary" type="submit" disabled={busy}><Search size={17}/> {busy ? 'Consultando…' : 'Abrir conversa'}</button></form><div className="public-preview-notice"><KeyRound size={19}/><p><strong>Atendimento somente pela plataforma</strong>Não enviamos código por e-mail. A chave de acesso é gerada e mostrada ao abrir o protocolo.</p></div></section></main></PublicShell>;
}

const statusLabel: Record<SupportConversation['status'], string> = {
  queued: 'Aguardando na fila', assigned: 'Atendente designado', in_progress: 'Em atendimento',
  waiting_customer: 'Aguardando sua resposta', completed: 'Atendimento concluído', cancelled: 'Atendimento cancelado',
};

export function PublicCustomerChatPage() {
  const { protocol = '' } = useParams();
  const [credentials] = useState<SupportCredentials | null>(() => loadSupportCredentials(protocol));
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);
  const closed = conversation?.status === 'completed' || conversation?.status === 'cancelled';

  const refresh = useCallback(async (quiet = false) => {
    if (!credentials) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const next = await getSupportConversation(credentials);
      setConversation(next);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar a conversa.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [credentials]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!credentials || closed) return;
    const timer = window.setInterval(() => { void refresh(true); }, 5000);
    return () => window.clearInterval(timer);
  }, [credentials, closed, refresh]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [conversation?.messages.length]);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = message.trim();
    if (!credentials || !body || sending) return;
    setSending(true);
    setError('');
    try {
      await sendSupportMessage(credentials, body);
      setMessage('');
      await refresh(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  if (!credentials) return <PublicShell><main id="public-main" className="public-simple-page"><section><span className="public-simple-icon"><KeyRound size={27}/></span><h1>Acesse seu atendimento</h1><p>Por segurança, informe novamente o CNPJ, o protocolo e a chave de acesso.</p><Link className="public-button public-button-primary" to="/consultar-protocolo">Informar dados de acesso</Link></section></main></PublicShell>;
  return <PublicShell><main id="public-main" className="public-chat-page"><div className="public-chat-heading"><Link className="public-back-link" to="/"><ArrowLeft size={16}/> Voltar ao portal</Link><p className="public-kicker"><span/> ATENDIMENTO ON-LINE</p><h1>Conversa do protocolo {protocol}</h1></div>{loading && !conversation ? <div className="public-chat-state" role="status">Carregando atendimento…</div> : conversation ? <section className="public-chat-shell"><header><div><small>{conversation.queue_label}</small><strong>{conversation.service_label}</strong></div><span className={`public-chat-status is-${conversation.status}`}><Clock3 size={15}/>{statusLabel[conversation.status]}</span></header><div className="public-queue-position" aria-live="polite">{conversation.status === 'queued' ? <><strong>{conversation.people_ahead}</strong><span>{conversation.people_ahead === 1 ? 'pessoa à sua frente nesta fila' : 'pessoas à sua frente nesta fila'}</span></> : <><MessageSquareText size={22}/><span>{statusLabel[conversation.status]}</span></>}</div><div className="public-chat-messages" aria-live="polite" aria-label="Mensagens do atendimento">{conversation.messages.map(item => <article key={item.id} className={`is-${item.author}`}><small>{item.author === 'customer' ? 'Você' : item.actor_label || (item.author === 'agent' ? 'Atendimento DGSCI' : 'Sistema')}</small><p>{item.body}</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('pt-BR', { timeZone: 'America/Belem', dateStyle: 'short', timeStyle: 'short' })}</time></article>)}<div ref={messagesEnd}/></div>{error && <p className="public-submit-error" role="alert">{error}</p>}<form className="public-chat-composer" onSubmit={send}><label htmlFor="customer-message">Escreva sua mensagem</label><div><textarea id="customer-message" rows={3} maxLength={4000} value={message} onChange={event => setMessage(event.target.value)} disabled={closed} placeholder={closed ? 'Este atendimento foi encerrado.' : 'Digite sua mensagem para a DGSCI…'}/><button className="public-button public-button-primary" type="submit" disabled={closed || sending || !message.trim()}><Send size={18}/>{sending ? 'Enviando…' : 'Enviar'}</button></div></form></section> : <div className="public-chat-state is-error"><p>{error || 'Atendimento não encontrado.'}</p><Link to="/consultar-protocolo">Revisar dados de acesso</Link></div>}</main></PublicShell>;
}

export function PublicAccreditationDirectory() {
  const { data, loading, error, reload, loadedAt } = useAccreditations(true);
  const [kind, setKind] = useState<'company' | 'professional'>('company');
  const [query, setQuery] = useState('');
  const today = institutionalToday();
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const rows = data.filter(row => row.kind === kind && row.valid_until >= today && (!normalized || `${row.name} ${row.modality} ${row.region}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalized))).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return <PublicShell><main id="public-main" className="public-directory-page"><div className="public-directory-heading"><Link className="public-back-link" to="/"><ArrowLeft size={16}/> Voltar ao portal</Link><p className="public-kicker"><span/> CONSULTA PÚBLICA</p><h1>Empresas e profissionais credenciados</h1><p>Relação vigente disponibilizada pela fonte institucional de credenciamento.</p></div><section className="public-directory-card"><div className="public-directory-tabs" role="group" aria-label="Tipo de credenciado"><button type="button" className={kind === 'company' ? 'is-active' : ''} onClick={() => setKind('company')}><Building2 size={19}/> Empresas</button><button type="button" className={kind === 'professional' ? 'is-active' : ''} onClick={() => setKind('professional')}><UsersRound size={19}/> Profissionais</button></div><label className="public-directory-search" htmlFor="directory-search"><Search size={18}/><input id="directory-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome, modalidade ou região"/>{query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca"><X size={16}/></button>}</label>{loading ? <div className="public-directory-state" role="status">Consultando a relação oficial…</div> : error ? <div className="public-directory-state is-error"><p>{error}</p><button type="button" onClick={reload}>Tentar novamente</button></div> : <><div className="public-directory-meta"><strong>{rows.length} {rows.length === 1 ? 'registro vigente' : 'registros vigentes'}</strong>{loadedAt && <span>Atualizado em {new Date(loadedAt).toLocaleString('pt-BR', { timeZone: 'America/Belem', dateStyle: 'short', timeStyle: 'short' })}</span>}</div><div className="public-directory-table" role="region" tabIndex={0} aria-label="Relação de credenciados"><table><thead><tr><th>Nome</th><th>Modalidade</th><th>Região</th><th>Validade</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.modality}</td><td>{row.region || '—'}</td><td><span>{shortDate(row.valid_until)}</span></td></tr>)}</tbody></table>{rows.length === 0 && <div className="public-directory-empty"><Search size={24}/><strong>Nenhum registro encontrado</strong><p>Revise os termos da busca.</p></div>}</div></>}</section></main></PublicShell>;
}
