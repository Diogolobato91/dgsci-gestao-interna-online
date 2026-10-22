import { useCallback, useEffect, useState } from 'react';
import { MILITARY_RANKS } from '@/lib/rankHierarchy';
import {
  UsersRound,
  Trash2,
  UserCheck,
  UserX,
  Pencil,
  ShieldCheck,
  LockKeyhole,
  UnlockKeyhole,
  RefreshCw,
  Save,
  Copy,
  Eye,
  History,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  PageHeader,
  ActionButton,
  SearchField,
  DataPanel,
  SummaryStrip,
  EmptyResults,
  LoadState,
  usePagination,
  TablePagination,
} from '@/components/workspace/Workspace';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { isFullAdministrator, normalizeSearch } from '@/features/records/recordAccess';
import { maskCpf } from '@/lib/userValidation';
import {
  USER_SECTORS,
  USER_STATUS_LABELS,
  isManagedSuperadmin,
  type ManagedUser,
  type UserAuditEntry,
} from './types';
import type { UserProfile } from '@/types/auth';

function rpcMessage(problem: { code?: string; message?: string } | null) {
  if (problem?.code === '42501') return 'Sua conta não possui permissão para gerenciar usuários.';
  if (problem?.code === '40001') return 'Este cadastro foi alterado. Atualize a lista e abra a ação novamente.';
  if (problem?.code === '23505') return 'Os dados informados conflitam com outro cadastro existente.';
  if (problem?.code === '22023') return problem.message || 'Confira os dados informados.';
  return 'Não foi possível concluir. Verifique a conexão e tente novamente.';
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return value;
  }
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return value;
  }
};

export default function UserManagementPage() {
  const { user } = useAuth();
  const allowed = isFullAdministrator(user);

  const [accounts, setAccounts] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sector, setSector] = useState('all');
  const [revision, setRevision] = useState(0);

  // Modais de ação
  const [viewingUser, setViewingUser] = useState<ManagedUser | null>(null);
  const [approvingUser, setApprovingUser] = useState<{
    user: ManagedUser;
    sectors: UserProfile[];
    superadmin: boolean;
  } | null>(null);
  const [rejectingUser, setRejectingUser] = useState<{
    user: ManagedUser;
    reason: string;
  } | null>(null);
  const [editingUser, setEditingUser] = useState<{
    user: ManagedUser;
    name: string;
    rank: string; mf: string; cpf: string; birth: string; phone: string;
    sectors: UserProfile[];
    superadmin: boolean;
    enabled: boolean;
  } | null>(null);
  function openEdit(account:ManagedUser){
    setFormError('');setEditingUser({user:account,name:account.display_name,rank:account.posto_graduacao||'',mf:account.matricula||'',cpf:maskCpf(account.cpf),birth:account.data_nascimento||'',phone:account.contato||'',sectors:account.sectors||[],superadmin:isManagedSuperadmin(account),enabled:account.enabled});
  }
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [blockingUser, setBlockingUser] = useState<ManagedUser | null>(null);
  const [auditTarget, setAuditTarget] = useState<ManagedUser | null>(null);
  const [auditLogs, setAuditLogs] = useState<UserAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  const reload = useCallback(() => setRevision(v => v + 1), []);
  const ownEmail = user?.email?.toLowerCase();

  // Carrega listagem de usuários via RPC
  useEffect(() => {
    let current = true;
    setError('');
    if (!allowed) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        if (!supabase) throw new Error('Conexão não configurada.');
        const { data, error: problem } = await supabase.rpc('admin_list_users');
        if (problem) throw new Error(rpcMessage(problem));
        if (!Array.isArray(data)) throw new Error('Resposta de usuários inválida.');
        if (current) setAccounts(data as ManagedUser[]);
      } catch (reason) {
        if (current) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os usuários.');
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [allowed, revision]);

  // Carrega histórico de auditoria quando solicitado
  const openAudit = async (account: ManagedUser) => {
    setAuditTarget(account);
    setAuditLoading(true);
    setAuditLogs([]);
    try {
      if (!supabase) throw new Error('Conexão não configurada.');
      const { data, error: problem } = await supabase.rpc('admin_list_audit', {
        p_target_email: account.email,
      });
      if (!problem && Array.isArray(data)) {
        setAuditLogs(data as UserAuditEntry[]);
      }
    } catch {
      // Falha não crítica na auditoria
    } finally {
      setAuditLoading(false);
    }
  };

  // Filtragem de dados
  const rows = accounts.filter(account => {
    const textMatch = normalizeSearch(
      `${account.display_name} ${account.email} ${account.matricula || ''} ${account.cpf || ''} ${account.posto_graduacao || ''}`
    ).includes(normalizeSearch(query));

    const statusMatch =
      status === 'all' ||
      account.status === status ||
      (status === 'active' && (account.status === 'active' || account.status === 'approved'));

    const sectorMatch =
      sector === 'all' || (Array.isArray(account.sectors) && account.sectors.includes(sector as UserProfile));

    return textMatch && statusMatch && sectorMatch;
  });

  const pagination = usePagination(rows, query + '|' + status + '|' + sector);

  // Ações do Superadministrador
  const handleDelete = async () => {
    if (!deletingUser || !supabase || busy || deleteConfirmation !== deletingUser.email) return;
    setBusy(true); setFormError('');
    try {
      const { data, error: problem } = await supabase.functions.invoke('delete-account', {
        body: { email: deletingUser.email, version: deletingUser.version, confirmation: deleteConfirmation },
      });
      if (problem) {
        let detail = '';
        try { detail = (await problem.context?.json())?.message || ''; } catch { /* Resposta indisponível */ }
        throw new Error(detail || 'Não foi possível excluir. Atualize a lista e tente novamente.');
      }
      setMessage(data?.message || 'Conta excluída.'); setDeletingUser(null); reload();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Não foi possível excluir.'); }
    finally { setBusy(false); }
  };

  const handleApprove = async () => {
    if (!approvingUser || !supabase || busy) return;
    if (!approvingUser.sectors.length && !approvingUser.superadmin) {
      setFormError('Selecione ao menos um setor para aprovar o usuário.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const targetUserId = approvingUser.user.user_id;
      if (!targetUserId) throw new Error('Identificador de usuário não encontrado.');

      const { error: problem } = await supabase.rpc('admin_approve_user', {
        p_user_id: targetUserId,
        p_sectors: approvingUser.superadmin ? USER_SECTORS : approvingUser.sectors,
        p_superadmin: approvingUser.superadmin,
        p_expected_version: approvingUser.user.version ?? null,
      });
      if (problem) throw new Error(rpcMessage(problem));

      setMessage(`Cadastro de ${approvingUser.user.display_name} aprovado com sucesso.`);
      setApprovingUser(null);
      reload();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Não foi possível aprovar o cadastro.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingUser || !supabase || busy) return;
    if (!rejectingUser.reason.trim()) {
      setFormError('Informe a justificativa da rejeição.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const targetUserId = rejectingUser.user.user_id;
      if (!targetUserId) throw new Error('Identificador de usuário não encontrado.');

      const { error: problem } = await supabase.rpc('admin_reject_user', {
        p_user_id: targetUserId,
        p_reason: rejectingUser.reason.trim(),
        p_expected_version: rejectingUser.user.version ?? null,
      });
      if (problem) throw new Error(rpcMessage(problem));

      setMessage(`Cadastro de ${rejectingUser.user.display_name} foi rejeitado.`);
      setRejectingUser(null);
      reload();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Não foi possível rejeitar o cadastro.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!blockingUser || !supabase || busy) return;
    setBusy(true);
    setFormError('');
    try {
      const targetUserId = blockingUser.user_id;
      if (!targetUserId) throw new Error('Identificador de usuário não encontrado.');

      const newEnabled = !blockingUser.enabled;
      const { error: problem } = await supabase.rpc('admin_toggle_user', {
        p_user_id: targetUserId,
        p_enabled: newEnabled,
        p_expected_version: blockingUser.version ?? null,
      });
      if (problem) throw new Error(rpcMessage(problem));

      setMessage(newEnabled ? 'Acesso liberado.' : 'Acesso bloqueado.');
      setBlockingUser(null);
      reload();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Não foi possível alterar a situação.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser || !supabase || busy) return;
    const selected = editingUser.superadmin ? USER_SECTORS : editingUser.sectors;
    if (!editingUser.name.trim() || (!['pending_approval','rejected'].includes(editingUser.user.status) && !selected.length)) {
      setFormError('Informe o nome e ao menos um setor.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const { error: problem } = editingUser.user.user_id ? await supabase.rpc('admin_save_user_full', {
        p_user_id:editingUser.user.user_id,p_version:editingUser.user.version,p_details:{nome:editingUser.name.trim(),posto:editingUser.rank||null,matricula:editingUser.mf.trim()||null,cpf:editingUser.cpf.replace(/\D/g,'')||null,nascimento:editingUser.birth||null,contato:editingUser.phone.replace(/\D/g,'')||null},p_sectors:selected,p_enabled:editingUser.enabled,p_superadmin:editingUser.superadmin,
      }) : await supabase.rpc('admin_save_user', {
        p_email: editingUser.user.email.trim().toLowerCase(),
        p_display_name: editingUser.name.trim(),
        p_sectors: selected,
        p_enabled: editingUser.enabled,
        p_superadmin: editingUser.superadmin,
        p_expected_version: editingUser.user.version ?? null,
      });
      if (problem) throw new Error(rpcMessage(problem));

      setMessage('Cadastro atualizado com sucesso.');
      setEditingUser(null);
      reload();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <section className="workspace-page">
        <PageHeader
          eyebrow="Administração do sistema"
          title="Gestão de Usuários"
          description="Controle de contas, aprovação de solicitações e permissões de acesso."
          icon={UsersRound}
        />
        <div className="workspace-feedback is-error" role="alert">
          Acesso exclusivo do superadministrador.
        </div>
      </section>
    );
  }

  // Contadores para o summary strip
  const countPending = accounts.filter(a => a.status === 'pending_approval').length;
  const countActive = accounts.filter(a => a.status === 'active' || a.status === 'approved').length;
  const countBlocked = accounts.filter(a => a.status === 'blocked').length;
  const countRejected = accounts.filter(a => a.status === 'rejected').length;

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Administração do sistema"
        title="Gestão de Usuários"
        description="Analise solicitações de cadastro, aprove acessos e defina os setores autorizados."
        icon={UsersRound}
        actions={
          <ActionButton disabled={loading || busy} onClick={reload}>
            <RefreshCw size={16} />
            Atualizar
          </ActionButton>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Aguardando aprovação',
            value: countPending,
          },
          {
            label: 'Usuários ativos',
            value: countActive,
          },
          {
            label: 'Acessos bloqueados',
            value: countBlocked,
          },
          {
            label: 'Cadastros rejeitados',
            value: countRejected,
          },
        ]}
      />

      {message && (
        <p className="workspace-feedback" role="status">
          {message}
        </p>
      )}

      <DataPanel
        title="Contas e solicitações"
        count={rows.length}
        toolbar={
          <>
            <SearchField
              id="users-query"
              value={query}
              onChange={setQuery}
              placeholder="Buscar por nome, e-mail, matrícula ou CPF…"
            />
            <div className="workspace-filter">
              <label htmlFor="users-status">Situação</label>
              <select
                id="users-status"
                value={status}
                onChange={event => setStatus(event.target.value)}
              >
                <option value="all">Todas as situações</option>
                <option value="pending_approval">Aguardando aprovação</option>
                <option value="active">Ativos</option>
                <option value="blocked">Bloqueados</option>
                <option value="rejected">Rejeitados</option>
              </select>
            </div>
            <div className="workspace-filter">
              <label htmlFor="users-sector">Setor</label>
              <select
                id="users-sector"
                value={sector}
                onChange={event => setSector(event.target.value)}
              >
                <option value="all">Todos os setores</option>
                {USER_SECTORS.map(val => (
                  <option key={val}>{val}</option>
                ))}
              </select>
            </div>
          </>
        }
        footer={!loading && !error && <TablePagination {...pagination} />}
      >
        {loading || error ? (
          <LoadState error={error} onRetry={reload} label="Carregando usuários…" />
        ) : (
          <div className="records-table">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Setores e acesso</th>
                  <th>Situação</th>
                  <th>Último acesso / Data</th>
                  <th className="table-actions-heading">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pagination.rows.map(account => {
                  const isPending = account.status === 'pending_approval';
                  const isRejected = account.status === 'rejected';
                  const isSuper = isManagedSuperadmin(account);
                  const isSelf = account.email.toLowerCase() === ownEmail;

                  return (
                    <tr key={account.email}>
                      <td>
                        <strong className="table-primary">
                          {account.posto_graduacao && (
                            <span className="user-rank-prefix">{account.posto_graduacao} </span>
                          )}
                          {account.display_name}
                          {isSelf && <span className="workspace-badge">Você</span>}
                        </strong>
                        <span className="table-secondary">
                          {account.email} {account.matricula ? `· Matrícula: ${account.matricula}` : ''}
                          {!isPending && (!account.cpf || !account.matricula) && (
                            <span className="user-incomplete-tag" title="Dados cadastrais pendentes de complementação">
                              {' '}· Dados a complementar
                            </span>
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="user-sector-tags">
                          {isSuper ? (
                            <span className="workspace-badge">
                              <ShieldCheck size={12} />
                              Superadministrador
                            </span>
                          ) : Array.isArray(account.sectors) && account.sectors.length > 0 ? (
                            account.sectors.map(s => (
                              <span className="workspace-badge" key={s}>
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="table-secondary">Nenhum setor</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={`workspace-badge user-status-${account.status}`}>
                          {USER_STATUS_LABELS[account.status] || account.status}
                        </span>
                        {isRejected && account.rejection_reason && (
                          <small className="user-reject-hint" title={account.rejection_reason}>
                            Motivo registrado
                          </small>
                        )}
                      </td>

                      <td>
                        <span className="table-secondary">
                          {isPending && account.created_at
                            ? `Solicitado em ${formatDateTime(account.created_at)}`
                            : account.last_sign_in_at
                            ? formatDateTime(account.last_sign_in_at)
                            : 'Ainda não acessou'}
                        </span>
                      </td>

                      <td className="table-actions">
                        <div>
                          <ActionButton variant="ghost" disabled={busy} onClick={()=>openEdit(account)}><Pencil size={15}/>Editar</ActionButton>
                          <ActionButton variant="ghost" className="workspace-button-danger" disabled={busy || account.email.toLowerCase() === ownEmail} onClick={() => { setDeletingUser(account); setDeleteConfirmation(''); setFormError(''); }} aria-label={'Excluir conta de ' + account.display_name}><Trash2 size={15}/>Excluir</ActionButton>
                          {/* Ações específicas para cadastro pendente */}
                          {isPending ? (
                            <>
                              <ActionButton
                                variant="primary"
                                disabled={busy}
                                onClick={() => {
                                  setFormError('');
                                  setApprovingUser({
                                    user: account,
                                    sectors: ['Secretaria'],
                                    superadmin: false,
                                  });
                                }}
                                title="Aprovar solicitação e definir setores"
                              >
                                <UserCheck size={15} />
                                Aprovar
                              </ActionButton>

                              <ActionButton
                                variant="ghost"
                                disabled={busy}
                                onClick={() => {
                                  setFormError('');
                                  setRejectingUser({
                                    user: account,
                                    reason: '',
                                  });
                                }}
                                title="Rejeitar cadastro com justificativa"
                              >
                                <UserX size={15} />
                                Rejeitar
                              </ActionButton>
                            </>
                          ) : isRejected ? (
                            <ActionButton
                              variant="secondary"
                              disabled={busy}
                              onClick={() => {
                                setFormError('');
                                setApprovingUser({
                                  user: account,
                                  sectors: ['Secretaria'],
                                  superadmin: false,
                                });
                              }}
                              title="Reavaliar e aprovar cadastro"
                            >
                              <UserCheck size={15} />
                              Reavaliar
                            </ActionButton>
                          ) : (
                            /* Ações para conta ativa/bloqueada */
                            <>


                              <ActionButton
                                variant="ghost"
                                disabled={busy || isSelf}
                                title={
                                  isSelf
                                    ? 'O próprio superadministrador não pode bloquear seu acesso'
                                    : undefined
                                }
                                onClick={() => {
                                  setFormError('');
                                  setBlockingUser(account);
                                }}
                              >
                                {account.enabled ? <LockKeyhole size={15} /> : <UnlockKeyhole size={15} />}
                                {account.enabled ? 'Bloquear' : 'Liberar'}
                              </ActionButton>
                            </>
                          )}

                          <ActionButton
                            variant="ghost"
                            onClick={() => setViewingUser(account)}
                            title="Visualizar dados cadastrados"
                          >
                            <Eye size={15} />
                            Dados
                          </ActionButton>

                          <ActionButton
                            variant="ghost"
                            onClick={() => openAudit(account)}
                            title="Histórico de alterações"
                          >
                            <History size={15} />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && (
              <EmptyResults
                onClear={() => {
                  setQuery('');
                  setStatus('all');
                  setSector('all');
                }}
              />
            )}
          </div>
        )}
      </DataPanel>

      <div className="user-first-access">
        <div>
          <strong>Fluxo de solicitação de cadastro</strong>
          <p>
            O interessado preenche o cadastro no portal. O acesso é liberado após a aprovação do superadministrador com a definição de setores.
          </p>
        </div>
        <ActionButton
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.origin + '/login');
              setMessage('Endereço de acesso copiado.');
            } catch {
              setMessage('Endereço de acesso: ' + window.location.origin + '/login');
            }
          }}
        >
          <Copy size={15} />
          Copiar endereço
        </ActionButton>
      </div>

      {/* 1. DIALOG DE VISUALIZAÇÃO DE DADOS COMPLETOS */}
      <Dialog open={!!viewingUser} onOpenChange={open => !open && setViewingUser(null)}>
        <DialogContent className="record-dialog compact-dialog">
          <DialogHeader>
            <DialogTitle>Dados cadastrais informados</DialogTitle>
            <DialogDescription>
              {viewingUser?.display_name} · {viewingUser?.email}
            </DialogDescription>
          </DialogHeader>
          {viewingUser && (
            <div className="detail-body">
              <div className="detail-grid">
                <div>
                  <span className="table-overline">NOME COMPLETO</span>
                  <strong>{viewingUser.display_name}</strong>
                </div>
                <div>
                  <span className="table-overline">POSTO / GRADUAÇÃO</span>
                  <strong>{viewingUser.posto_graduacao || 'Não informado (a complementar)'}</strong>
                </div>
                <div>
                  <span className="table-overline">MATRÍCULA FUNCIONAL</span>
                  <strong className="table-mono">{viewingUser.matricula || 'Pendente de complementação'}</strong>
                </div>
                <div>
                  <span className="table-overline">CPF</span>
                  <strong className="table-mono">{viewingUser.cpf ? maskCpf(viewingUser.cpf) : 'Pendente de complementação'}</strong>
                </div>
                <div>
                  <span className="table-overline">CONTATO</span>
                  <span>{viewingUser.contato || 'Pendente de complementação'}</span>
                </div>
                <div>
                  <span className="table-overline">DATA DE NASCIMENTO</span>
                  <span>{viewingUser.data_nascimento ? formatDate(viewingUser.data_nascimento) : 'Pendente de complementação'}</span>
                </div>
                <div>
                  <span className="table-overline">SITUAÇÃO ATUAL</span>
                  <span className={`workspace-badge user-status-${viewingUser.status}`}>
                    {USER_STATUS_LABELS[viewingUser.status] || viewingUser.status}
                  </span>
                </div>
                {viewingUser.created_at && (
                  <div>
                    <span className="table-overline">SOLICITADO EM</span>
                    <span>{formatDateTime(viewingUser.created_at)}</span>
                  </div>
                )}
                {viewingUser.rejection_reason && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <span className="table-overline">JUSTIFICATIVA DE REJEIÇÃO</span>
                    <p className="rejection-reason-box">{viewingUser.rejection_reason}</p>
                  </div>
                )}
              </div>
              <div className="record-actions">
                <ActionButton onClick={() => setViewingUser(null)}>Fechar</ActionButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. DIALOG DE APROVAÇÃO COM DEFINIÇÃO DE SETORES */}
      <Dialog
        open={!!approvingUser}
        onOpenChange={open => {
          if (!open && !busy) {
            setApprovingUser(null);
            setFormError('');
          }
        }}
      >
        <DialogContent className="record-dialog editor-dialog">
          <DialogHeader>
            <span className="dialog-context">
              <UserCheck size={17} />
              APROVAÇÃO DE CADASTRO
            </span>
            <DialogTitle>Aprovar solicitação de cadastro</DialogTitle>
            <DialogDescription>
              {approvingUser?.user.display_name} ({approvingUser?.user.email}) · Defina obrigatoriamente os setores de atuação.
            </DialogDescription>
          </DialogHeader>

          {approvingUser && (
            <form
              className="record-form"
              onSubmit={e => {
                e.preventDefault();
                void handleApprove();
              }}
            >
              <section className="editor-section">
                <h3>Setores autorizados *</h3>
                <p className="workspace-footnote">
                  Selecione ao menos um setor para liberar o acesso aos dados institucionais.
                </p>
                <div className="user-sector-options">
                  {USER_SECTORS.map(value => (
                    <label className="record-check" key={value}>
                      <input
                        type="checkbox"
                        checked={
                          approvingUser.superadmin || approvingUser.sectors.includes(value)
                        }
                        disabled={approvingUser.superadmin}
                        onChange={e => {
                          const nextSectors = e.target.checked
                            ? [...approvingUser.sectors, value]
                            : approvingUser.sectors.filter(s => s !== value);
                          setApprovingUser({
                            ...approvingUser,
                            sectors: nextSectors,
                          });
                        }}
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="editor-section">
                <h3>Permissões administrativas</h3>
                <label className="record-check">
                  <input
                    type="checkbox"
                    checked={approvingUser.superadmin}
                    onChange={e =>
                      setApprovingUser({
                        ...approvingUser,
                        superadmin: e.target.checked,
                        sectors: e.target.checked ? [...USER_SECTORS] : approvingUser.sectors,
                      })
                    }
                  />
                  <span>
                    Superadministrador
                    <small>Acesso irrestrito a todos os setores e gestão de usuários.</small>
                  </span>
                </label>
              </section>

              {approvingUser.superadmin && (
                <p className="workspace-feedback">
                  Atenção: conceder perfil de superadministrador autoriza este usuário a gerenciar contas e aprovações.
                </p>
              )}

              {formError && (
                <p className="form-error" role="alert">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </p>
              )}

              <div className="record-actions">
                <ActionButton disabled={busy} onClick={() => setApprovingUser(null)}>
                  Cancelar
                </ActionButton>
                <ActionButton type="submit" variant="primary" disabled={busy}>
                  <UserCheck size={16} />
                  {busy ? 'Aprovando…' : 'Confirmar aprovação'}
                </ActionButton>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingUser} onOpenChange={open => { if (!open && !busy) setDeletingUser(null); }}>
        <DialogContent className="record-dialog compact-dialog"><DialogHeader><DialogTitle>Excluir conta</DialogTitle><DialogDescription>{deletingUser?.display_name} · {deletingUser?.email}</DialogDescription></DialogHeader>
          <div className="detail-body"><p className="delete-warning">A conta perderá o acesso e será excluída da autenticação. O histórico de alterações será preservado. Esta ação não pode ser desfeita pelo portal.</p><div className="form-field"><label htmlFor="delete-account-confirmation">Digite o e-mail da conta para confirmar</label><input id="delete-account-confirmation" value={deleteConfirmation} autoComplete="off" onChange={e => setDeleteConfirmation(e.target.value)}/></div>
          {formError && <p className="form-error" role="alert">{formError}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={() => setDeletingUser(null)}>Cancelar</ActionButton><ActionButton variant="primary" disabled={busy || deleteConfirmation !== deletingUser?.email} onClick={() => void handleDelete()}><Trash2 size={15}/>{busy ? 'Excluindo…' : 'Excluir conta'}</ActionButton></div></div>
        </DialogContent>
      </Dialog>

      {/* 3. DIALOG DE REJEIÇÃO COM JUSTIFICATIVA */}
      <Dialog
        open={!!rejectingUser}
        onOpenChange={open => {
          if (!open && !busy) {
            setRejectingUser(null);
            setFormError('');
          }
        }}
      >
        <DialogContent className="record-dialog compact-dialog">
          <DialogHeader>
            <DialogTitle>Rejeitar solicitação de cadastro</DialogTitle>
            <DialogDescription>
              {rejectingUser?.user.display_name} · {rejectingUser?.user.email}
            </DialogDescription>
          </DialogHeader>

          {rejectingUser && (
            <div className="detail-body">
              <p>
                Informe o motivo da rejeição. A justificativa será exibida ao usuário ao consultar sua situação e registrada na auditoria.
              </p>

              <div className="form-field" style={{ marginTop: 14 }}>
                <label htmlFor="reject-reason">Justificativa da rejeição *</label>
                <textarea
                  id="reject-reason"
                  required
                  rows={3}
                  value={rejectingUser.reason}
                  onChange={e =>
                    setRejectingUser({
                      ...rejectingUser,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Ex.: Matrícula funcional divergente do efetivo oficial."
                />
              </div>

              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="record-actions">
                <ActionButton disabled={busy} onClick={() => setRejectingUser(null)}>
                  Cancelar
                </ActionButton>
                <ActionButton
                  variant="primary"
                  disabled={busy}
                  onClick={() => void handleReject()}
                >
                  <UserX size={15} />
                  {busy ? 'Salvando…' : 'Confirmar rejeição'}
                </ActionButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. DIALOG DE EDIÇÃO DE CONTA ATIVA */}
      <Dialog
        open={!!editingUser}
        onOpenChange={open => {
          if (!open && !busy) {
            setEditingUser(null);
            setFormError('');
          }
        }}
      >
        <DialogContent className="record-dialog editor-dialog">
          <DialogHeader>
            <span className="dialog-context">
              <UsersRound size={17} />
              GESTÃO DE USUÁRIOS
            </span>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>
              Atualize a identificação, os dados pessoais e as permissões neste formulário.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form
              className="record-form"
              onSubmit={e => {
                e.preventDefault();
                void handleSaveEdit();
              }}
            >
              <section className="editor-section">
                <h3>Identificação</h3>
                <div className="form-field">
                  <label htmlFor="user-name">Nome completo *</label>
                  <input
                    id="user-name"
                    required
                    minLength={2}
                    maxLength={160}
                    value={editingUser.name}
                    onChange={e =>
                      setEditingUser({ ...editingUser, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="user-email">E-mail</label>
                  <input
                    id="user-email"
                    type="email"
                    readOnly
                    value={editingUser.user.email}
                  />
                  <small className="workspace-footnote">
                    O e-mail identifica este cadastro e não pode ser alterado aqui.
                  </small>
                </div>
              </section>

              {editingUser.user.user_id&&<section className="editor-section"><h3>Dados pessoais</h3>
                <div className="form-field"><label htmlFor="user-rank">Posto / graduação</label><select id="user-rank" value={editingUser.rank} onChange={e=>setEditingUser({...editingUser,rank:e.target.value})}><option value="">Não informado</option>{MILITARY_RANKS.map(r=><option key={r}>{r}</option>)}</select></div>
                <div className="form-field"><label htmlFor="user-mf">Matrícula</label><input id="user-mf" maxLength={50} value={editingUser.mf} onChange={e=>setEditingUser({...editingUser,mf:e.target.value})}/></div>
                <div className="form-field"><label htmlFor="user-cpf">CPF</label><input id="user-cpf" inputMode="numeric" maxLength={14} value={editingUser.cpf} onChange={e=>setEditingUser({...editingUser,cpf:maskCpf(e.target.value)})}/></div>
                <div className="form-field"><label htmlFor="user-birth">Data de nascimento</label><input id="user-birth" type="date" min="1900-01-01" value={editingUser.birth} onChange={e=>setEditingUser({...editingUser,birth:e.target.value})}/></div>
                <div className="form-field"><label htmlFor="user-phone">Contato com DDD</label><input id="user-phone" type="tel" maxLength={20} value={editingUser.phone} onChange={e=>setEditingUser({...editingUser,phone:e.target.value})}/></div>
              </section>}
              {['pending_approval','rejected'].includes(editingUser.user.status)?<p className="workspace-description">A correção preserva a situação do cadastro. Use Aprovar ou Reavaliar para liberar acesso.</p>:<>
              <section className="editor-section">
                <h3>Setores autorizados *</h3>
                <div className="user-sector-options">
                  {USER_SECTORS.map(value => (
                    <label className="record-check" key={value}>
                      <input
                        type="checkbox"
                        checked={
                          editingUser.superadmin || editingUser.sectors.includes(value)
                        }
                        disabled={editingUser.superadmin}
                        onChange={e =>
                          setEditingUser({
                            ...editingUser,
                            sectors: e.target.checked
                              ? [...editingUser.sectors, value]
                              : editingUser.sectors.filter(s => s !== value),
                          })
                        }
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="editor-section">
                <h3>Permissões administrativas</h3>
                <label className="record-check">
                  <input
                    type="checkbox"
                    checked={editingUser.superadmin}
                    disabled={editingUser.user.email.toLowerCase() === ownEmail}
                    onChange={e =>
                      setEditingUser({
                        ...editingUser,
                        superadmin: e.target.checked,
                        sectors: e.target.checked ? [...USER_SECTORS] : editingUser.sectors,
                      })
                    }
                  />
                  <span>
                    Superadministrador
                    <small>Acesso a todos os setores e à gestão de usuários.</small>
                  </span>
                </label>
                <label className="record-check">
                  <input
                    type="checkbox"
                    checked={editingUser.enabled}
                    disabled={editingUser.user.email.toLowerCase() === ownEmail}
                    onChange={e =>
                      setEditingUser({ ...editingUser, enabled: e.target.checked })
                    }
                  />
                  <span>
                    Acesso liberado
                    <small>Contas bloqueadas não podem consultar nem alterar dados.</small>
                  </span>
                </label>
              </section>

              </>}

              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="record-actions">
                <ActionButton disabled={busy} onClick={() => setEditingUser(null)}>
                  Cancelar
                </ActionButton>
                <ActionButton type="submit" variant="primary" disabled={busy}>
                  <Save size={16} />
                  {busy ? 'Salvando…' : 'Salvar alterações'}
                </ActionButton>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. DIALOG DE BLOQUEIO / DESBLOQUEIO */}
      <Dialog
        open={!!blockingUser}
        onOpenChange={open => {
          if (!open && !busy) {
            setBlockingUser(null);
            setFormError('');
          }
        }}
      >
        <DialogContent className="record-dialog compact-dialog">
          <DialogHeader>
            <DialogTitle>
              {blockingUser?.enabled ? 'Bloquear acesso' : 'Liberar acesso'}
            </DialogTitle>
            <DialogDescription>
              {blockingUser?.display_name} · {blockingUser?.email}
            </DialogDescription>
          </DialogHeader>

          {blockingUser && (
            <div className="detail-body">
              <p>
                {blockingUser.enabled
                  ? 'Este usuário perderá o acesso a todos os setores e dados internos imediatamente. Seu cadastro e histórico serão preservados.'
                  : 'O acesso do usuário será reativado para os setores anteriormente autorizados.'}
              </p>

              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="record-actions">
                <ActionButton disabled={busy} onClick={() => setBlockingUser(null)}>
                  Cancelar
                </ActionButton>
                <ActionButton
                  variant="primary"
                  disabled={busy}
                  onClick={() => void handleToggleBlock()}
                >
                  {busy
                    ? 'Salvando…'
                    : blockingUser.enabled
                    ? 'Confirmar bloqueio'
                    : 'Confirmar liberação'}
                </ActionButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. DIALOG DE HISTÓRICO DE AUDITORIA */}
      <Dialog open={!!auditTarget} onOpenChange={open => !open && setAuditTarget(null)}>
        <DialogContent className="record-dialog compact-dialog" style={{ maxWidth: 680 }}>
          <DialogHeader>
            <DialogTitle>Histórico de alterações</DialogTitle>
            <DialogDescription>
              {auditTarget?.display_name} · {auditTarget?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="detail-body">
            {auditLoading ? (
              <p className="workspace-status">Carregando histórico de auditoria…</p>
            ) : auditLogs.length === 0 ? (
              <p className="table-secondary">Nenhuma alteração registrada para esta conta.</p>
            ) : (
              <div className="audit-timeline">
                {auditLogs.map(log => (
                  <div className="audit-item" key={log.id}>
                    <div className="audit-header">
                      <strong className="audit-action">{log.action.toUpperCase()}</strong>
                      <span className="audit-date">{formatDateTime(log.created_at)}</span>
                    </div>
                    <p className="audit-actor">
                      <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      Por: <strong>{log.actor_email}</strong>
                    </p>
                    {log.notes && <p className="audit-notes">{log.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="record-actions">
              <ActionButton onClick={() => setAuditTarget(null)}>Fechar</ActionButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
