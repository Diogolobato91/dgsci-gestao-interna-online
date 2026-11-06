import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  BookOpenText,
  Building2,
  Check,
  Clock3,
  Copy,
  Download,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileKey,
  FileSearch,
  FileText,
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
import {listPublications,publicationUrl,type Publication} from './publications';
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
  submitSupportSatisfaction,
  type OpenSupportResult,
  type SupportConversation,
  type SupportCredentials,
} from './supportChat';
import './public-portal.css';
import './public-chat-fixes.css';
import './public-home-refinement.css';

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
          <Link to="/instrucoes-tecnicas" onClick={() => setMenuOpen(false)}>Instruções Técnicas</Link>
          <Link to="/cartilhas" onClick={() => setMenuOpen(false)}>Cartilhas</Link>
          <Link to="/credenciados" onClick={() => setMenuOpen(false)}>Credenciados</Link>
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
          <span><strong>DGSCI</strong><small>Departamento-Geral de Segurança Contra Incêndios e Emergências</small></span>
        </Link>
        <p>Informação e atendimento técnico em um único lugar.</p>
      </div>
      <div><strong>Atendimento</strong><Link to="/atendimento">Abrir atendimento</Link><Link to="/consultar-protocolo">Consultar protocolo</Link></div>
      <div><strong>Consulta pública</strong><Link to="/credenciados">Empresas e profissionais</Link><a href="/#instrucoes">Instruções Técnicas</a></div>
      <div><strong>Área institucional</strong><Link to="/login">Acesso interno</Link><span>DGSCI / CBMPA</span></div>
    </footer>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return <div className="public-portal"><PublicHeader />{children}<PublicFooter /></div>;
}

export function PublicHomePage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const faqItem = (id: string, question: string, answer: string) => {
    const open = openFaq === id;
    return <div className={`public-faq-item${open ? ' is-open' : ''}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpenFaq(open ? null : id)}><span>{question}</span><CircleHelp size={18}/></button>
      <div className="public-faq-answer" aria-hidden={!open}><div><p>{answer}</p></div></div>
    </div>;
  };
  return (
    <PublicShell>
      <main id="public-main">
        <section className="public-hero">
          <div className="public-hero-copy">
            <p className="public-kicker"><span /> PORTAL DE SERVIÇOS DA DGSCI</p>
            <h1>Departamento-Geral de Segurança Contra Incêndios e Emergências</h1>
            <p className="public-hero-lead">Acesse serviços, orientações técnicas e consultas públicas. Quando precisar, abra um atendimento diretamente com a seção responsável.</p>
            <div className="public-hero-actions">
              <Link className="public-button public-button-primary" to="/atendimento"><MessageSquareText size={19} /> Iniciar atendimento <ArrowRight size={18} /></Link>
              <Link className="public-button public-button-secondary" to="/consultar-protocolo"><FileSearch size={18} /> Consultar protocolo</Link>
            </div>
            <p className="public-trust-line"><ShieldCheck size={16} /> Cada solicitação recebe um protocolo e entra somente na fila da seção escolhida.</p>
          </div>
          <figure className="public-hero-media"><img src="/portal/assets/home/vistoria-dgsci.jpg" alt="Registros de vistorias técnicas e inspeções realizadas pelo Corpo de Bombeiros Militar do Pará"/><figcaption>Vistorias técnicas e inspeções de sistemas de segurança contra incêndio.</figcaption></figure>
        </section>



        <section className="public-section" id="servicos">
          <div className="public-section-heading"><div><p className="public-kicker"><span /> SERVIÇOS</p><h2>Serviços disponíveis</h2><p>Escolha o assunto para acessar as orientações e a seção responsável.</p></div><Link to="/atendimento">Ver todos os serviços <ArrowRight size={16} /></Link></div>
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

        <section className="public-section public-instructions" id="instrucoes"><div className="public-section-heading"><div><p className="public-kicker"><span /> CONTEÚDO TÉCNICO</p><h2>Normas e materiais de orientação</h2><p>Consulte os documentos publicados pela DGSCI.</p></div></div><div className="public-content-links"><Link to="/instrucoes-tecnicas"><BookOpenText/><span><small>NORMAS E PROCEDIMENTOS</small><strong>Instruções Técnicas</strong><p>Acesse as ITs vigentes para projetos, instalações e medidas de segurança.</p></span><ArrowRight/></Link><Link to="/cartilhas"><FileText/><span><small>MATERIAL EDUCATIVO</small><strong>Cartilhas</strong><p>Baixe orientações ilustradas produzidas pela DGSCI.</p></span><ArrowRight/></Link></div></section>

        <section className="public-section public-faq" id="duvidas"><div className="public-section-heading"><div><p className="public-kicker"><span /> DÚVIDAS FREQUENTES</p><h2>Orientações por seção</h2></div></div><div className="public-faq-groups">
          <article><h3>Vistoria</h3>{faqItem('inspection-license','Como faço meu primeiro licenciamento?','Verifique se o estabelecimento se enquadra nas condições do Decreto nº 2.247, de 23 de março de 2022. Quando não houver dispensa de licenciamento nem necessidade de projeto técnico, apresente CNPJ, documento que comprove a área construída e documento de identificação com foto. Caso o solicitante não seja o proprietário, apresente também procuração.')}{faqItem('inspection-renew','Como solicitar a renovação da vistoria?','Tenha em mãos o CNPJ e o último protocolo de requerimento do ano anterior e abra um atendimento nesta plataforma.')}</article>
          <article><h3>Análise de Projetos</h3>{faqItem('project-documents','Quais documentos são necessários para solicitar a análise?','Apresente presencialmente ou pelo atendimento da plataforma o memorial descritivo para dar entrada no serviço.')}{faqItem('project-review','Como solicitar a reanálise do projeto?','Apresente presencialmente ou pelo atendimento da plataforma o memorial descritivo para dar entrada no serviço.')}{faqItem('project-contact','Como falar com o analista responsável ou com o chefe da seção?','Solicite pelo e-mail analisecat.cbmpa@gmail.com. Para atendimento da chefia, também é possível preencher um Formulário de Atendimento (FAT) e protocolá-lo presencialmente no quartel mais próximo.')}</article>
          <article><h3>Multa e Interdição</h3>{faqItem('fines-regularize','Como faço para recorrer ou regularizar pendências?','No primeiro licenciamento, após a vistoria, corrija as exigências e informe o cumprimento pelo SISGAT ou presencialmente no CAT ou SAT. O prazo indicado é de 60 dias, prorrogável por mais 90 dias. Após a autuação, podem ser aplicáveis a declaração de saneamento, com pagamento de 10% da multa, ou o TAACB, com pagamento de 35%, conforme a situação. Na renovação, corrija as pendências e solicite o saneamento ou o TAACB pelos canais oficiais.')}{faqItem('fines-contact','Como falar com o chefe da seção?','Abra um atendimento nesta plataforma ou solicite reunião por meio de FAT protocolado presencialmente no quartel mais próximo.')}</article>
        </div></section>

        <section className="public-final-cta"><div><p className="public-kicker"><span /> CENTRAL DE ATENDIMENTO</p><h2>Precisa falar com a DGSCI?</h2><p>Informe o CNPJ e o assunto para entrar na fila da seção responsável.</p></div><Link className="public-button public-button-primary" to="/atendimento">Iniciar atendimento <ArrowRight size={18} /></Link></section>
      </main>
    </PublicShell>
  );
}

type IntakeData = { cnpj: string; requester: string; phone: string; email: string; service: string; city: string; process: string; message: string; consent: boolean };
const emptyIntake: IntakeData = { cnpj: '', requester: '', phone: '', email: '', service: '', city: '', process: '', message: '', consent: false };

export function PublicIntakePage() {
  return <PublicGuidedIntakePage/>;
}

function PublicGuidedIntakePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialQueue = PUBLIC_QUEUES.some(queue => queue.id === params.get('fila')) ? params.get('fila') as PublicQueueId : null;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>(emptyIntake);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState<OpenSupportResult | null>(null);
  const selectedService = serviceById(data.service);
  const selectedQueue = selectedService ? queueById(selectedService.queue) : null;
  const services = useMemo(() => PUBLIC_SERVICES.filter(service => !initialQueue || service.queue === initialQueue), [initialQueue]);
  const questions = [
    'Para começar, informe o CNPJ da empresa.',
    'Qual é o nome da pessoa responsável por este atendimento?',
    'Qual telefone com DDD podemos registrar?',
    'Qual é o e-mail de contato?',
    'Em qual município fica o estabelecimento?',
    'Agora escolha o serviço que você precisa.',
    'Já existe algum processo ou protocolo relacionado?',
    'Por último, conte brevemente o que precisa resolver.',
    'Tudo certo. Confira os dados e abra seu atendimento.',
  ];
  const answers = [data.cnpj, data.requester, data.phone, data.email, data.city, selectedService?.label || '', data.process || 'Não tenho processo ou protocolo', data.message];
  const continueText = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (step === 0 && !isValidCnpj(data.cnpj)) return setError('Digite um CNPJ válido para continuar.');
    if (step === 1 && data.requester.trim().length < 3) return setError('Digite o nome do responsável.');
    if (step === 2 && onlyDigits(data.phone).length < 10) return setError('Digite um telefone com DDD.');
    if (step === 3 && !/^\S+@\S+\.\S+$/.test(data.email)) return setError('Digite um e-mail válido.');
    if (step === 4 && data.city.trim().length < 2) return setError('Digite o município.');
    if (step === 7 && data.message.trim().length < 20) return setError('Explique a solicitação com pelo menos 20 caracteres.');
    setStep(current => current + 1);
  };
  const submitTicket = async () => {
    if (!selectedService || opening) return;
    setOpening(true); setError('');
    try {
      const result = await openSupportTicket({ service: selectedService.id, cnpj: data.cnpj, requester: data.requester.trim(), phone: data.phone, email: data.email.trim(), city: data.city.trim(), reference: data.process.trim(), summary: data.message.trim() });
      saveSupportCredentials({ protocol: result.protocol, cnpj: data.cnpj, accessKey: result.accessKey });
      setOpened(result);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível abrir o atendimento. Tente novamente.'); }
    finally { setOpening(false); }
  };
  const chooseService = (service: string) => { setData(current => ({ ...current, service })); setError(''); setStep(6); };
  const copyValue = (value: string) => navigator.clipboard?.writeText(value).catch(() => undefined);

  return <PublicShell><main id="public-main" className="public-guided-page">
    <div className="public-guided-heading"><Link to="/"><ArrowLeft size={16}/> Voltar ao portal</Link><p className="public-kicker"><span/> ATENDIMENTO GUIADO</p><h1>Olá! Vamos abrir seu atendimento.</h1><p>Responda uma pergunta por vez. O assistente encaminhará sua solicitação para a seção correta.</p></div>
    <section className="public-guided-chat" aria-label="Abertura guiada do atendimento">
      <header><span><Bot size={22}/></span><div><strong>Assistente virtual DGSCI</strong><small><i/> On-line para orientar o cadastro</small></div><em>{Math.min(step + 1, 9)} de 9</em></header>
      <div className="public-guided-transcript" aria-live="polite">
        {answers.slice(0, Math.min(step, 8)).map((answer, index) => <div className="public-guided-exchange" key={questions[index]}><div className="public-bot-row"><span><Bot size={17}/></span><p>{questions[index]}</p></div><p className="public-user-answer">{answer}</p></div>)}
        {!opened && <div className="public-bot-row is-current"><span><Bot size={17}/></span><p>{questions[step]}</p></div>}
        {opened && <div className="public-bot-row is-current"><span><Bot size={17}/></span><p>Pronto! Seu protocolo foi criado. Guarde os dados abaixo e entre no chat.</p></div>}

        {!opened && step <= 4 && <form className="public-guided-reply" onSubmit={continueText}>
          {step === 0 && <><label htmlFor="guided-cnpj">CNPJ</label><input id="guided-cnpj" autoFocus inputMode="numeric" value={data.cnpj} onChange={event => setData({ ...data, cnpj: formatCnpj(event.target.value) })} placeholder="00.000.000/0000-00"/></>}
          {step === 1 && <><label htmlFor="guided-name">Nome do responsável</label><input id="guided-name" autoFocus autoComplete="name" value={data.requester} onChange={event => setData({ ...data, requester: event.target.value })}/></>}
          {step === 2 && <><label htmlFor="guided-phone">Telefone com DDD</label><input id="guided-phone" autoFocus inputMode="tel" autoComplete="tel" value={data.phone} onChange={event => setData({ ...data, phone: formatPhone(event.target.value) })} placeholder="(91) 99999-9999"/></>}
          {step === 3 && <><label htmlFor="guided-email">E-mail de contato</label><input id="guided-email" autoFocus type="email" autoComplete="email" value={data.email} onChange={event => setData({ ...data, email: event.target.value })} placeholder="contato@empresa.com.br"/><small>Não enviaremos código de confirmação por e-mail.</small></>}
          {step === 4 && <><label htmlFor="guided-city">Município</label><input id="guided-city" autoFocus value={data.city} onChange={event => setData({ ...data, city: event.target.value })}/></>}
          {error && <p className="public-guided-error" role="alert">{error}</p>}<button className="public-button public-button-primary" type="submit">Responder <ArrowRight size={17}/></button>
        </form>}
        {!opened && step === 5 && <div className="public-guided-options">{services.map(service => <button key={service.id} type="button" onClick={() => chooseService(service.id)}><span>{service.label}</span><ChevronRight size={17}/></button>)}</div>}
        {!opened && step === 6 && <div className="public-guided-options public-guided-options-compact"><button type="button" onClick={() => setStep(7)}><span>Não tenho processo ou protocolo</span><ChevronRight size={17}/></button><form onSubmit={event => { event.preventDefault(); setStep(7); }}><label htmlFor="guided-process">Sim, vou informar o número</label><div><input id="guided-process" autoFocus value={data.process} onChange={event => setData({ ...data, process: event.target.value })} placeholder="Digite o número"/><button type="submit" aria-label="Confirmar protocolo"><ArrowRight size={18}/></button></div></form></div>}
        {!opened && step === 7 && <form className="public-guided-reply" onSubmit={continueText}><label htmlFor="guided-message">Descreva sua solicitação</label><textarea id="guided-message" autoFocus rows={5} maxLength={1500} value={data.message} onChange={event => setData({ ...data, message: event.target.value })} placeholder="Explique o que aconteceu e o que você precisa resolver."/><small>{data.message.length}/1500 caracteres</small>{error && <p className="public-guided-error" role="alert">{error}</p>}<button className="public-button public-button-primary" type="submit">Responder <ArrowRight size={17}/></button></form>}
        {!opened && step === 8 && <div className="public-guided-review"><dl><div><dt>CNPJ</dt><dd>{data.cnpj}</dd></div><div><dt>Responsável</dt><dd>{data.requester}</dd></div><div><dt>Serviço</dt><dd>{selectedService?.label}</dd></div><div><dt>Fila</dt><dd>{selectedQueue?.label}</dd></div></dl><label><input type="checkbox" checked={data.consent} onChange={event => setData({ ...data, consent: event.target.checked })}/><span>Estou ciente de que estes dados serão usados para identificar e acompanhar esta solicitação.</span></label>{error && <p className="public-guided-error" role="alert">{error}</p>}<button type="button" className="public-button public-button-primary" disabled={!data.consent || opening} onClick={submitTicket}>{opening ? 'Abrindo atendimento…' : 'Abrir atendimento'} {!opening && <ArrowRight size={17}/>}</button></div>}
        {opened && <div className="public-guided-created"><div><span>PROTOCOLO</span><strong>{opened.protocol}</strong><button type="button" onClick={() => copyValue(opened.protocol)} aria-label="Copiar protocolo"><Copy size={16}/></button></div><div><span>CHAVE DE ACESSO</span><strong>{opened.accessKey}</strong><button type="button" onClick={() => copyValue(opened.accessKey)} aria-label="Copiar chave"><Copy size={16}/></button></div><p><KeyRound size={18}/> Guarde a chave para acessar a conversa em outro dispositivo.</p><button className="public-button public-button-primary" type="button" onClick={() => navigate(`/atendimento/${encodeURIComponent(opened.protocol)}`)}>Entrar no chat <ArrowRight size={17}/></button></div>}
      </div>
      {step > 0 && !opened && <footer><button type="button" onClick={() => { setError(''); setStep(current => current - 1); }}><ArrowLeft size={16}/> Voltar uma pergunta</button></footer>}
    </section>
  </main></PublicShell>;
}

export function LegacyPublicIntakePage() {
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
  const [score, setScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSent, setRatingSent] = useState(false);
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
  const rate = async (event: FormEvent) => {
    event.preventDefault();
    if (!credentials || !score || sending) return;
    setSending(true);
    setError('');
    try {
      await submitSupportSatisfaction(credentials, score, ratingComment.trim());
      setRatingSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar sua avaliação.');
    } finally {
      setSending(false);
    }
  };

  if (!credentials) return <PublicShell><main id="public-main" className="public-simple-page"><section><span className="public-simple-icon"><KeyRound size={27}/></span><h1>Acesse seu atendimento</h1><p>Por segurança, informe novamente o CNPJ, o protocolo e a chave de acesso.</p><Link className="public-button public-button-primary" to="/consultar-protocolo">Informar dados de acesso</Link></section></main></PublicShell>;
  return <PublicShell><main id="public-main" className="public-chat-page"><div className="public-chat-heading"><Link className="public-back-link" to="/"><ArrowLeft size={16}/> Voltar ao portal</Link><p className="public-kicker"><span/> ATENDIMENTO ON-LINE</p><h1>Conversa do protocolo {protocol}</h1></div>{loading && !conversation ? <div className="public-chat-state" role="status">Carregando atendimento…</div> : conversation ? <section className="public-chat-shell"><header><div><small>{conversation.queue_label}</small><strong>{conversation.service_label}</strong></div><span className={`public-chat-status is-${conversation.status}`}><Clock3 size={15}/>{statusLabel[conversation.status]}</span></header><div className="public-queue-position" aria-live="polite">{conversation.status === 'queued' ? <><strong>{conversation.people_ahead}</strong><span>{conversation.people_ahead === 1 ? 'pessoa à sua frente nesta fila' : 'pessoas à sua frente nesta fila'}</span></> : <><MessageSquareText size={22}/><span>{statusLabel[conversation.status]}</span></>}</div><div className="public-chat-messages" aria-live="polite" aria-label="Mensagens do atendimento">{conversation.messages.map(item => <article key={item.id} className={`is-${item.author}`}><small>{item.author === 'customer' ? 'Você' : item.actor_label || (item.author === 'agent' ? 'Atendimento DGSCI' : 'Sistema')}</small><p>{item.body}</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('pt-BR', { timeZone: 'America/Belem', dateStyle: 'short', timeStyle: 'short' })}</time></article>)}<div ref={messagesEnd}/></div>{error && <p className="public-submit-error" role="alert">{error}</p>}{conversation.status === 'completed' && (ratingSent ? <div className="public-rating-success"><Check size={18}/><strong>Obrigado pela sua avaliação.</strong></div> : <form className="public-rating" onSubmit={rate}><strong>Como foi seu atendimento?</strong><div className="public-rating-stars" role="group" aria-label="Nota do atendimento">{[1,2,3,4,5].map(value=><button key={value} type="button" className={score>=value?'is-active':''} onClick={()=>setScore(value)} aria-label={`${value} estrela${value>1?'s':''}`}>★</button>)}</div><textarea maxLength={1000} rows={2} value={ratingComment} onChange={event=>setRatingComment(event.target.value)} placeholder="Comentário opcional"/><button className="public-button public-button-primary" type="submit" disabled={!score||sending}>{sending?'Enviando…':'Enviar avaliação'}</button></form>)}<form className="public-chat-composer" onSubmit={send}><label htmlFor="customer-message">Escreva sua mensagem</label><div><textarea id="customer-message" rows={3} maxLength={4000} value={message} onChange={event => setMessage(event.target.value)} disabled={closed} placeholder={closed ? 'Este atendimento foi encerrado.' : 'Digite sua mensagem para a DGSCI…'}/><button className="public-button public-button-primary" type="submit" disabled={closed || sending || !message.trim()}><Send size={18}/>{sending ? 'Enviando…' : 'Enviar'}</button></div></form></section> : <div className="public-chat-state is-error"><p>{error || 'Atendimento não encontrado.'}</p><Link to="/consultar-protocolo">Revisar dados de acesso</Link></div>}</main></PublicShell>;
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

export function PublicPublicationsPage({kind}:{kind:Publication['kind']}){const[rows,setRows]=useState<Publication[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');useEffect(()=>{setLoading(true);listPublications(kind).then(setRows).catch(()=>setError('Não foi possível carregar os documentos.')).finally(()=>setLoading(false))},[kind]);const booklet=kind==='booklet';return <PublicShell><main id="public-main" className="public-publications-page"><header><Link className="public-back-link"to="/"><ArrowLeft size={16}/>Voltar ao portal</Link><p className="public-kicker"><span/>{booklet?'MATERIAL EDUCATIVO':'NORMAS E PROCEDIMENTOS'}</p><h1>{booklet?'Cartilhas':'Instruções Técnicas'}</h1><p>{booklet?'Materiais de orientação produzidos pela DGSCI para consulta e download.':'Consulte e baixe as Instruções Técnicas vigentes publicadas pela DGSCI.'}</p></header>{loading?<div className="public-publications-state">Carregando documentos…</div>:error?<div className="public-publications-state">{error}</div>:<section className="public-publications-grid">{rows.map(row=><a key={row.id}href={publicationUrl(row.file_path)}download target="_blank"rel="noreferrer"><img src={publicationUrl(row.cover_path)}alt={`Capa de ${row.title}`}/><div><small>{booklet?'CARTILHA':'INSTRUÇÃO TÉCNICA'}</small><h2>{row.title}</h2><p>{row.description}</p><span><Download size={16}/>Baixar PDF</span></div></a>)}{!rows.length&&<div className="public-publications-state">Nenhum documento publicado nesta categoria.</div>}</section>}</main></PublicShell>}
