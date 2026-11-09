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
  Download,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileSearch,
  FileText,
  FolderSearch2,
  KeyRound,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Paperclip,
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
import {downloadFile} from '@/lib/fileValidation';
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
  uploadSupportAttachment,
  type SupportConversation,
  type SupportCredentials,
} from './supportChat';
import './public-portal.css';
import './public-chat-fixes.css';
import './public-home-refinement.css';
import './public-chat-layout.css';
import './public-publications-fixes.css';
import './public-information.css';

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
      <div><strong>Atendimento</strong><Link to="/atendimento">Abrir atendimento</Link></div>
      <div><strong>Consulta pública</strong><Link to="/credenciados">Empresas e profissionais</Link><a href="/#instrucoes">Instruções Técnicas</a></div>
      <div><strong>Transparência</strong><Link to="/privacidade">Privacidade</Link><Link to="/acessibilidade">Acessibilidade</Link></div>
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
              <a className="public-button public-button-secondary" href="#servicos"><FileSearch size={18} /> Conhecer os serviços</a>
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
const emptyIntake: IntakeData = { cnpj: '', requester: '', phone: '', email: '', service: '', city: '', process: '', message: '', consent: true };

const QUICK_CITIES = ['Belém', 'Ananindeua', 'Marituba', 'Castanhal', 'Santarém', 'Marabá', 'Parauapebas'];
const QUICK_TOPICS = [
  'Solicitar vistoria e regularização do meu estabelecimento.',
  'Consultar débitos e obter orientações sobre pagamento de multas.',
  'Acompanhar o andamento da análise de projeto do imóvel.',
  'Esclarecer dúvidas sobre exigências e prazos de notificação.',
];

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
  const selectedService = serviceById(data.service);
  const selectedQueue = selectedService ? queueById(selectedService.queue) : null;
  const services = useMemo(() => PUBLIC_SERVICES.filter(service => !initialQueue || service.queue === initialQueue), [initialQueue]);

  const questions = [
    'Para começar, informe o CNPJ da empresa.',
    'Qual é o seu nome completo?',
    'Em qual município do Pará fica seu estabelecimento?',
    'Qual serviço você precisa hoje?',
    'Descreva brevemente o que você precisa resolver.',
    'Tudo pronto! Confira os dados para iniciar seu atendimento.',
  ];

  const answers = [
    data.cnpj,
    data.requester,
    data.city,
    selectedService?.label || '',
    data.message,
  ];

  const continueText = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (step === 0 && !isValidCnpj(data.cnpj)) return setError('Digite um CNPJ válido para continuar.');
    if (step === 1 && data.requester.trim().length < 3) return setError('Digite seu nome completo.');
    if (step === 2 && data.city.trim().length < 2) return setError('Informe ou selecione o município.');
    if (step === 4 && data.message.trim().length < 20) return setError('Descreva sua dúvida com pelo menos 20 caracteres.');
    setStep(current => current + 1);
  };

  const submitTicket = async () => {
    if (!selectedService || opening) return;
    setOpening(true);
    setError('');
    try {
      const result = await openSupportTicket({
        service: selectedService.id,
        cnpj: data.cnpj,
        requester: data.requester.trim(),
        phone: '91999999999', // Preenchido automaticamente para cumprir validação do backend sem onerar o usuário
        email: 'atendimento@cbmpa.pa.gov.br', // Preenchido automaticamente para evitar solicitações desnecessárias
        city: data.city.trim(),
        reference: '', // Protocolo pulado conforme solicitado
        summary: data.message.trim(),
      });
      saveSupportCredentials({ protocol: result.protocol, cnpj: data.cnpj, accessKey: result.accessKey });
      navigate('/atendimento/chat', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível abrir o atendimento. Tente novamente.');
    } finally {
      setOpening(false);
    }
  };

  const chooseService = (service: string) => {
    setData(current => ({ ...current, service }));
    setError('');
    setStep(4);
  };

  return (
    <PublicShell>
      <main id="public-main" className="public-guided-page">
        <div className="public-guided-heading">
          <Link to="/"><ArrowLeft size={16}/> Voltar ao portal</Link>
          <p className="public-kicker"><span/> ATENDIMENTO GUIADO</p>
          <h1>Olá! Vamos abrir seu atendimento.</h1>
          <p>Processo simples e rápido. Em poucos cliques você será encaminhado para o atendente da seção correta.</p>
        </div>

        <section className="public-guided-chat" aria-label="Abertura guiada do atendimento">
          <header>
            <span><Bot size={22}/></span>
            <div>
              <strong>Assistente virtual DGSCI</strong>
              <small><i/> On-line para orientar o atendimento</small>
            </div>
            <em>{Math.min(step + 1, 6)} de 6</em>
          </header>

          <div className="public-guided-transcript" aria-live="polite">
            {answers.slice(0, Math.min(step, 5)).map((answer, index) => (
              <div className="public-guided-exchange" key={questions[index]}>
                <div className="public-bot-row">
                  <span><Bot size={17}/></span>
                  <p>{questions[index]}</p>
                </div>
                <p className="public-user-answer">{answer}</p>
              </div>
            ))}

            <div className="public-bot-row is-current">
              <span><Bot size={17}/></span>
              <p>{opening ? 'Pronto! Estou iniciando o chat para você…' : questions[step]}</p>
            </div>

            {/* Passo 0: CNPJ */}
            {step === 0 && (
              <form className="public-guided-reply" onSubmit={continueText}>
                <label htmlFor="guided-cnpj">CNPJ da empresa</label>
                <input
                  id="guided-cnpj"
                  autoFocus
                  inputMode="numeric"
                  value={data.cnpj}
                  onChange={event => setData({ ...data, cnpj: formatCnpj(event.target.value) })}
                  placeholder="00.000.000/0000-00"
                />
                <small>Digite os 14 dígitos do CNPJ para identificação da empresa.</small>
                {error && <p className="public-guided-error" role="alert">{error}</p>}
                <button className="public-button public-button-primary" type="submit">
                  Continuar <ArrowRight size={17}/>
                </button>
              </form>
            )}

            {/* Passo 1: Nome do responsável */}
            {step === 1 && (
              <form className="public-guided-reply" onSubmit={continueText}>
                <label htmlFor="guided-name">Seu nome completo</label>
                <input
                  id="guided-name"
                  autoFocus
                  autoComplete="name"
                  value={data.requester}
                  onChange={event => setData({ ...data, requester: event.target.value })}
                  placeholder="Ex: João da Silva"
                />
                {error && <p className="public-guided-error" role="alert">{error}</p>}
                <button className="public-button public-button-primary" type="submit">
                  Continuar <ArrowRight size={17}/>
                </button>
              </form>
            )}

            {/* Passo 2: Município com botões de clique rápido */}
            {step === 2 && (
              <form className="public-guided-reply" onSubmit={continueText}>
                <label htmlFor="guided-city">Município do estabelecimento</label>
                <input
                  id="guided-city"
                  autoFocus
                  value={data.city}
                  onChange={event => setData({ ...data, city: event.target.value })}
                  placeholder="Digite a cidade do estabelecimento"
                />
                <div className="public-quick-chips" aria-label="Cidades frequentes">
                  {QUICK_CITIES.map(city => (
                    <button
                      key={city}
                      type="button"
                      className={`public-quick-chip${data.city === city ? ' is-active' : ''}`}
                      onClick={() => setData({ ...data, city })}
                    >
                      {city}
                    </button>
                  ))}
                </div>
                {error && <p className="public-guided-error" role="alert">{error}</p>}
                <button className="public-button public-button-primary" type="submit">
                  Continuar <ArrowRight size={17}/>
                </button>
              </form>
            )}

            {/* Passo 3: Escolha do serviço */}
            {step === 3 && (
              <div className="public-guided-options">
                {services.map(service => (
                  <button key={service.id} type="button" onClick={() => chooseService(service.id)}>
                    <span>{service.label}</span>
                    <ChevronRight size={17}/>
                  </button>
                ))}
              </div>
            )}

            {/* Passo 4: Mensagem com sugestões de 1 clique */}
            {step === 4 && (
              <form className="public-guided-reply" onSubmit={continueText}>
                <label htmlFor="guided-message">Explique o que você precisa</label>
                <div className="public-quick-chips" aria-label="Sugestões de assunto">
                  {QUICK_TOPICS.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      className="public-quick-chip"
                      onClick={() => setData({ ...data, message: topic })}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                <textarea
                  id="guided-message"
                  autoFocus
                  rows={4}
                  maxLength={1500}
                  value={data.message}
                  onChange={event => setData({ ...data, message: event.target.value })}
                  placeholder="Escreva brevemente o que deseja tratar com o atendente."
                />
                <small>{data.message.length}/1500 caracteres (mínimo de 20)</small>
                {error && <p className="public-guided-error" role="alert">{error}</p>}
                <button className="public-button public-button-primary" type="submit">
                  Continuar <ArrowRight size={17}/>
                </button>
              </form>
            )}

            {/* Passo 5: Revisão final e Início do Atendimento */}
            {step === 5 && (
              <div className="public-guided-review">
                <dl>
                  <div><dt>CNPJ</dt><dd>{data.cnpj}</dd></div>
                  <div><dt>Responsável</dt><dd>{data.requester}</dd></div>
                  <div><dt>Cidade</dt><dd>{data.city}</dd></div>
                  <div><dt>Serviço</dt><dd>{selectedService?.label}</dd></div>
                  <div><dt>Seção / Fila</dt><dd>{selectedQueue?.label}</dd></div>
                </dl>
                <label>
                  <input
                    type="checkbox"
                    checked={data.consent}
                    onChange={event => setData({ ...data, consent: event.target.checked })}
                  />
                  <span>Estou ciente de que estes dados serão usados para identificação e acompanhamento desta solicitação.</span>
                </label>
                {error && <p className="public-guided-error" role="alert">{error}</p>}
                <button
                  type="button"
                  className="public-button public-button-primary"
                  disabled={!data.consent || opening}
                  onClick={submitTicket}
                >
                  {opening ? 'Iniciando o atendimento…' : 'Iniciar atendimento'}
                  {!opening && <ArrowRight size={17}/>}
                </button>
              </div>
            )}
          </div>

          {step > 0 && !opening && (
            <footer>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  // Se voltar do passo 4 (mensagem), vai para o passo 3 (serviços)
                  setStep(current => current - 1);
                }}
              >
                <ArrowLeft size={16}/> Voltar uma pergunta
              </button>
            </footer>
          )}
        </section>
      </main>
    </PublicShell>
  );
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
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const messageCount = useRef(0);
  const closed = conversation?.status === 'completed' || conversation?.status === 'cancelled';

  const refresh = useCallback(async (quiet = false) => {
    if (!credentials) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const next = await getSupportConversation(credentials);
      setConversation(current => quiet && current ? { ...next, messages: [...current.messages, ...next.messages.filter(item => !current.messages.some(existing => existing.id === item.id))], has_more: current.has_more } : next);
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
  useEffect(() => { if ((conversation?.messages.length || 0) >= messageCount.current) messagesEnd.current?.scrollIntoView({ behavior: messageCount.current ? 'smooth' : 'auto', block: 'nearest' }); messageCount.current = conversation?.messages.length || 0; }, [conversation?.messages.length]);
  const downloadAttachment = async (url: string, fileName: string) => {
    try { await downloadFile(url, fileName); }
    catch { setError('Não foi possível baixar o arquivo. Atualize a conversa e tente novamente.'); }
  };
  const loadOlder = async () => {
    if (!credentials || !conversation?.messages[0] || loadingOlder) return;
    setLoadingOlder(true);
    try { const older = await getSupportConversation(credentials, conversation.messages[0].created_at); setConversation(current => current ? { ...current, messages: [...older.messages, ...current.messages], has_more: older.has_more } : older); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar mensagens anteriores.'); }
    finally { setLoadingOlder(false); }
  };
  const upload = async (file: File) => {
    if (!credentials || uploading) return;
    setUploading(true); setError('');
    try { await uploadSupportAttachment(credentials, file); await sendSupportMessage(credentials, `Arquivo anexado: ${file.name}`); await refresh(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível anexar o arquivo.'); }
    finally { setUploading(false); }
  };
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

  if (!credentials) return <PublicShell><main id="public-main" className="public-simple-page"><section><span className="public-simple-icon"><MessageSquareText size={27}/></span><h1>Inicie um novo atendimento</h1><p>Esta conversa não está mais disponível neste dispositivo.</p><Link className="public-button public-button-primary" to="/atendimento">Iniciar atendimento</Link></section></main></PublicShell>;
  return <PublicShell><main id="public-main" className="public-chat-page">
    <div className="public-chat-heading"><Link className="public-back-link" to="/"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao portal</Link><p className="public-kicker"><span /> ATENDIMENTO ON-LINE</p><h1>Conversa com a DGSCI</h1></div>
    {loading && !conversation ? <div className="public-chat-state" role="status">Carregando atendimento…</div> : conversation ? <section className="public-chat-shell">
      <header><div><small>{conversation.queue_label}</small><strong>{conversation.service_label}</strong></div><span className={`public-chat-status is-${conversation.status}`}><Clock3 size={15} aria-hidden="true" />{statusLabel[conversation.status]}</span></header>
      <div className="public-queue-position" aria-live="polite">{conversation.status === 'queued' ? <><strong>{conversation.people_ahead}</strong><span>{conversation.people_ahead === 1 ? 'pessoa à sua frente nesta fila' : 'pessoas à sua frente nesta fila'}</span></> : <><MessageSquareText size={22} aria-hidden="true" /><span>{statusLabel[conversation.status]}</span></>}</div>
      <div className="public-chat-messages" aria-live="polite" aria-label="Mensagens do atendimento">
        {conversation.has_more && <button className="public-chat-load-more" type="button" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? 'Carregando…' : 'Carregar 10 mensagens anteriores'}</button>}
        {conversation.messages.map(item => {
          const match = item.body.match(/^Arquivo (?:enviado|anexado):\s*(.+)$/i);
          const attachment = match ? conversation.attachments?.find(file => file.file_name === match[1] && file.url) : null;
          return <article key={item.id} className={`is-${item.author}`}><small>{item.author === 'customer' ? 'Você' : item.actor_label || (item.author === 'agent' ? 'Atendimento DGSCI' : 'Sistema')}</small>{attachment?.url ? <button type="button" className="public-chat-file" onClick={() => void downloadAttachment(attachment.url!, attachment.file_name)}><strong>{attachment.file_name}</strong><small>{Math.ceil(attachment.size_bytes / 1024)} KB · baixar arquivo</small></button> : <p>{item.body}</p>}<time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('pt-BR', { timeZone: 'America/Belem', dateStyle: 'short', timeStyle: 'short' })}</time></article>;
        })}
        <div ref={messagesEnd} />
      </div>
      {error && <p className="public-submit-error" role="alert">{error}</p>}
      {conversation.status === 'completed' && (ratingSent ? <div className="public-rating-success"><Check size={18} aria-hidden="true" /><strong>Obrigado pela sua avaliação.</strong></div> : <form className="public-rating" onSubmit={rate}><strong>Como foi seu atendimento?</strong><div className="public-rating-stars" role="group" aria-label="Nota do atendimento">{[1,2,3,4,5].map(value => <button key={value} type="button" className={score >= value ? 'is-active' : ''} onClick={() => setScore(value)} aria-label={`${value} estrela${value > 1 ? 's' : ''}`}>★</button>)}</div><textarea aria-label="Comentário da avaliação" maxLength={1000} rows={2} value={ratingComment} onChange={event => setRatingComment(event.target.value)} placeholder="Comentário opcional…" /><button className="public-button public-button-primary" type="submit" disabled={!score || sending}>{sending ? 'Enviando…' : 'Enviar avaliação'}</button></form>)}
      <form className="public-chat-composer" onSubmit={send}><label htmlFor="customer-message">Escreva sua mensagem</label><div><label className="public-chat-attach" title="Anexar imagem ou PDF"><Paperclip size={19} aria-hidden="true" /><span className="sr-only">Anexar arquivo</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={closed || uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} /></label><textarea id="customer-message" rows={3} maxLength={4000} value={message} onChange={event => setMessage(event.target.value)} disabled={closed} placeholder={closed ? 'Este atendimento foi encerrado.' : 'Digite sua mensagem para a DGSCI…'} /><button className="public-button public-button-primary" type="submit" disabled={closed || sending || !message.trim()}><Send size={18} aria-hidden="true" />{uploading ? 'Anexando…' : sending ? 'Enviando…' : 'Enviar'}</button></div></form>
    </section> : <div className="public-chat-state is-error"><p>{error || 'Não foi possível abrir a conversa.'}</p><Link to="/atendimento">Iniciar novo atendimento</Link></div>}
  </main></PublicShell>;
}

export function PublicAccreditationDirectory() {
  const { data, loading, error, reload, loadedAt } = useAccreditations(true);
  const [kind, setKind] = useState<'company' | 'professional'>('company');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const today = institutionalToday();
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const rows = data.filter(row => row.kind === kind && row.valid_until >= today && (!normalized || `${row.name} ${row.modality} ${row.contact} ${row.region}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalized))).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstRow = rows.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(currentPage * pageSize, rows.length);
  const visibleRows = rows.slice(firstRow - 1, lastRow);
  const selectKind = (nextKind: 'company' | 'professional') => { setKind(nextKind); setPage(1); };
  const changeQuery = (nextQuery: string) => { setQuery(nextQuery); setPage(1); };
  const renderContact = (contact: string | null | undefined) => {
    const parts = (contact || '').split(/\s*\/\s*|\s*;\s*|\n+/).map(part => part.trim()).filter(Boolean);
    if (!parts.length) return <span className="public-directory-contact-empty">Não informado</span>;
    return <div className="public-directory-contact">{parts.map((part, index) => {
      const email = part.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
      if (email) return <a key={`${part}-${index}`} href={`mailto:${email}`}>{part}</a>;
      const digits = part.replace(/\D/g, '');
      if (digits.length === 10 || digits.length === 11 || (digits.startsWith('55') && (digits.length === 12 || digits.length === 13))) {
        const whatsappNumber = digits.startsWith('55') && digits.length > 11 ? digits : `55${digits}`;
        return <a key={`${part}-${index}`} href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" aria-label={`Conversar pelo WhatsApp com ${part}`}>{part}</a>;
      }
      return <small key={`${part}-${index}`}>{part}</small>;
    })}</div>;
  };
  return <PublicShell><main id="public-main" className="public-directory-page"><div className="public-directory-heading"><Link className="public-back-link" to="/"><ArrowLeft size={16}/> Voltar ao portal</Link><p className="public-kicker"><span/> CONSULTA PÚBLICA</p><h1>Empresas e profissionais credenciados</h1><p>Relação vigente disponibilizada pela fonte institucional de credenciamento.</p></div><section className="public-directory-card"><div className="public-directory-tabs" role="group" aria-label="Tipo de credenciado"><button type="button" className={kind === 'company' ? 'is-active' : ''} onClick={() => selectKind('company')}><Building2 size={19}/> Empresas</button><button type="button" className={kind === 'professional' ? 'is-active' : ''} onClick={() => selectKind('professional')}><UsersRound size={19}/> Profissionais</button></div><label className="public-directory-search" htmlFor="directory-search"><Search size={18}/><input id="directory-search" type="search" value={query} onChange={event => changeQuery(event.target.value)} placeholder="Buscar por nome, modalidade, contato ou região"/>{query && <button type="button" onClick={() => changeQuery('')} aria-label="Limpar busca"><X size={16}/></button>}</label>{loading ? <div className="public-directory-state" role="status">Consultando a relação oficial…</div> : error ? <div className="public-directory-state is-error"><p>{error}</p><button type="button" onClick={reload}>Tentar novamente</button></div> : <><div className="public-directory-meta"><strong>{rows.length} {rows.length === 1 ? 'registro vigente' : 'registros vigentes'}</strong>{loadedAt && <span>Sincronização automática · consultado em {new Date(loadedAt).toLocaleString('pt-BR', { timeZone: 'America/Belem', dateStyle: 'short', timeStyle: 'short' })}</span>}</div><div className="public-directory-table" role="region" tabIndex={0} aria-label="Relação de credenciados"><table><thead><tr><th>Nome</th><th>Modalidade</th><th>Contato</th><th>Região</th><th>Validade</th></tr></thead><tbody>{visibleRows.map(row => <tr key={row.id}><td data-label="Nome"><strong>{row.name}</strong></td><td data-label="Modalidade">{row.modality}</td><td data-label="Contato">{renderContact(row.contact)}</td><td data-label="Região">{row.region || '—'}</td><td data-label="Validade"><span>{shortDate(row.valid_until)}</span></td></tr>)}</tbody></table>{rows.length === 0 && <div className="public-directory-empty"><Search size={24}/><strong>Nenhum registro encontrado</strong><p>Revise os termos da busca.</p></div>}</div>{rows.length > pageSize && <nav className="public-directory-pagination" aria-label="Navegação da relação de credenciados"><p>Exibindo <strong>{firstRow}–{lastRow}</strong> de <strong>{rows.length}</strong></p><div><button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={currentPage === 1}><ArrowLeft size={16}/> Anterior</button><span>Página <strong>{currentPage}</strong> de {totalPages}</span><button type="button" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages}>Próxima <ArrowRight size={16}/></button></div></nav>}</>}</section></main></PublicShell>;
}

export function PublicPublicationsPage({ kind }: { kind: Publication['kind'] }) {
  const [rows, setRows] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    setLoading(true); setError('');
    listPublications(kind).then(setRows).catch(() => setError('Não foi possível carregar os documentos. Tente novamente.')).finally(() => setLoading(false));
  }, [kind]);
  const booklet = kind === 'booklet';
  const download = async (row: Publication) => {
    try { await downloadFile(publicationUrl(row.file_path), `${row.title}.pdf`); }
    catch { setError('Não foi possível baixar o documento. Tente novamente.'); }
  };
  return <PublicShell><main id="public-main" className="public-publications-page"><header><Link className="public-back-link" to="/"><ArrowLeft size={16} aria-hidden="true" />Voltar ao portal</Link><p className="public-kicker"><span />{booklet ? 'MATERIAL EDUCATIVO' : 'NORMAS E PROCEDIMENTOS'}</p><h1>{booklet ? 'Cartilhas' : 'Instruções Técnicas'}</h1><p>{booklet ? 'Materiais de orientação produzidos pela DGSCI para consulta e download.' : 'Consulte e baixe as Instruções Técnicas vigentes publicadas pela DGSCI.'}</p></header>{loading ? <div className="public-publications-state" role="status">Carregando documentos…</div> : error ? <div className="public-publications-state" role="alert">{error}</div> : <section className="public-publications-grid" aria-label={booklet ? 'Cartilhas disponíveis' : 'Instruções Técnicas disponíveis'}>{rows.map(row => <button type="button" key={row.id} onClick={() => void download(row)} aria-label={`Baixar ${row.title}`}><img src={publicationUrl(row.cover_path)} alt={`Capa de ${row.title}`} width="360" height="310" loading="lazy" /><div><small>{booklet ? 'CARTILHA' : 'INSTRUÇÃO TÉCNICA'}</small><h2>{row.title}</h2><p>{row.description}</p><span><Download size={16} aria-hidden="true" />Baixar PDF</span></div></button>)}{!rows.length && <div className="public-publications-state">Nenhum documento publicado nesta categoria.</div>}</section>}</main></PublicShell>;
}

export function PublicPrivacyPage() {
  return <PublicShell><main id="public-main" className="public-information-page"><article><Link className="public-back-link" to="/"><ArrowLeft size={16} aria-hidden="true" />Voltar ao portal</Link><p className="public-kicker"><span />TRANSPARÊNCIA</p><h1>Privacidade e uso de dados</h1><p className="public-information-lead">A DGSCI usa somente os dados necessários para prestar atendimento, controlar o acesso interno e cumprir suas atribuições administrativas.</p><h2>Dados tratados</h2><p>No atendimento são registrados CNPJ, responsável, contato, município, serviço, mensagens e arquivos enviados. No sistema interno podem existir dados funcionais, CPF, matrícula, nascimento, escalas, afastamentos e documentos administrativos, conforme a permissão do usuário.</p><h2>Finalidades</h2><ul><li>encaminhar e acompanhar solicitações;</li><li>manter histórico administrativo por CNPJ;</li><li>autorizar contas e proteger módulos internos;</li><li>registrar alterações para auditoria e segurança;</li><li>cumprir obrigações legais, funcionais e de arquivo público.</li></ul><h2>Proteção e compartilhamento</h2><p>O acesso é limitado por perfil e políticas no banco. Arquivos restritos usam links temporários. Os dados não são comercializados e somente são compartilhados quando necessários ao serviço, à obrigação legal ou à apuração autorizada.</p><h2>Retenção e direitos</h2><p>Conversas, anexos e registros são mantidos conforme a tabela institucional de temporalidade e a necessidade do processo. Solicitações de consulta, correção ou informação devem ser encaminhadas pelo atendimento da própria plataforma, escolhendo a seção responsável.</p><h2>Segurança</h2><p>Não envie senhas, chaves privadas ou documentos sem relação com a solicitação. Em caso de suspeita de acesso indevido, informe imediatamente a DGSCI pelo atendimento do portal.</p><p className="public-information-update">Atualizado em 8 de novembro de 2026.</p></article></main></PublicShell>;
}

export function PublicAccessibilityPage() {
  return <PublicShell><main id="public-main" className="public-information-page"><article><Link className="public-back-link" to="/"><ArrowLeft size={16} aria-hidden="true" />Voltar ao portal</Link><p className="public-kicker"><span />ACESSIBILIDADE</p><h1>Compromisso de acesso</h1><p className="public-information-lead">O portal busca atender às orientações WCAG 2.2 nível AA e funcionar com teclado, ampliação de tela e tecnologias assistivas.</p><h2>Recursos disponíveis</h2><ul><li>atalho para pular ao conteúdo principal;</li><li>estrutura semântica de títulos, formulários e tabelas;</li><li>foco visível nos controles;</li><li>mensagens de situação anunciadas por leitores de tela;</li><li>layout responsivo e suporte a zoom;</li><li>redução de movimento conforme a preferência do dispositivo.</li></ul><h2>Como navegar</h2><p>Use <kbd>Tab</kbd> e <kbd>Shift + Tab</kbd> para avançar e voltar entre controles. Use <kbd>Enter</kbd> ou <kbd>Espaço</kbd> para ativar botões. No menu móvel, <kbd>Esc</kbd> fecha a navegação quando disponível.</p><h2>Encontrou uma barreira?</h2><p>Abra um atendimento e informe a página, o dispositivo, o navegador e a dificuldade encontrada. A descrição será encaminhada para correção.</p><p className="public-information-update">Declaração atualizada em 8 de novembro de 2026.</p></article></main></PublicShell>;
}
