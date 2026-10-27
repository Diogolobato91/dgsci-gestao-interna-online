import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthContextType, User, UserProfile, RegisterData, RegistrationStatusInfo } from '@/types/auth';
import {logActivity} from '@/features/audit/activity';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider ausente.');
  return context;
};

const profiles: UserProfile[] = ['Diretoria', 'Subdiretoria', 'Secretaria', 'Vistoriador', 'Análise', 'Multas'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const generation = useRef(0);
  const resolvedAccount = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!supabase) {
      setAuthError('A conexão com o Supabase ainda não está configurada neste ambiente.');
      setLoading(false);
      return;
    }

    const resolveSession = async (session: Session | null) => {
      const current = ++generation.current;
      if (!alive) return;
      // SIGNED_IN também ocorre ao retornar à aba. Uma conta já conferida
      // atualiza permissões em segundo plano sem desmontar os formulários.
      const background = !!session && resolvedAccount.current === session.user.id;
      if (!background) setLoading(true);
      if (!session) {
        resolvedAccount.current = null;
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // 1. Consulta permissões em app_members
        const { data: member, error: memberErr } = await supabase
          .from('app_members')
          .select('display_name,role,sectors,enabled')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!alive || current !== generation.current) return;
        if (memberErr && memberErr.code !== 'PGRST116') throw memberErr;

        // Se a conta está habilitada e possui setores válidos, o usuário está aprovado
        if (member?.enabled) {
          const allowed = profiles.filter(profile => Array.isArray(member.sectors) && member.sectors.includes(profile));
          if (allowed.length > 0) {
            resolvedAccount.current = session.user.id;
            setAuthError('');
            const next: User = {
              id: session.user.id,
              email: session.user.email,
              matricula: member.display_name,
              nome: member.display_name,
              profile: allowed[0],
              isAuthenticated: true,
              allowedProfiles: allowed,
              role: member.role,
              registrationStatus: 'approved',
              enabled: true,
            };
            setUser(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
            return;
          }
        }

        // 2. Se não está habilitado em app_members, consulta situação em user_registrations
        let statusInfo: RegistrationStatusInfo | null = null;
        try {
          const { data: rpcData } = await supabase.rpc('get_my_registration_status');
          statusInfo = rpcData as RegistrationStatusInfo | null;
        } catch {
          // Caso RPC ainda não exista no ambiente, infere pelo estado do app_members
        }

        if (!alive || current !== generation.current) return;

        const regStatus = statusInfo?.status || (member && !member.enabled ? 'blocked' : 'pending_approval');
        const nextPendingUser: User = {
          id: session.user.id,
          email: session.user.email,
          matricula: statusInfo?.matricula || member?.display_name || session.user.email || '',
          nome: statusInfo?.nome || member?.display_name || '',
          profile: 'Secretaria',
          isAuthenticated: true,
          allowedProfiles: [],
          role: 'reader',
          registrationStatus: regStatus,
          rejectionReason: statusInfo?.rejection_reason,
          enabled: false,
        };

        resolvedAccount.current = session.user.id;
        setUser(previous => JSON.stringify(previous) === JSON.stringify(nextPendingUser) ? previous : nextPendingUser);
        setAuthError('');
      } catch {
        if (alive && current === generation.current) {
          if (!background) { resolvedAccount.current = null; setUser(null); }
          setAuthError('Não foi possível conferir suas permissões. Tente novamente.');
        }
      } finally {
        if (alive && current === generation.current) setLoading(false);
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => { if (alive) void resolveSession(session); }, 0);
    });

    const refreshPermissions = async () => {
      if (!alive || document.visibilityState === 'hidden') return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (alive) await resolveSession(session);
      } catch {
        // Falha transitória não invalida sessão em formulário ativo
      }
    };

    const refreshOnFocus = () => { void refreshPermissions(); };
    const timer = window.setInterval(refreshOnFocus, 60000);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);

    return () => {
      alive = false;
      generation.current++;
      subscription.subscription.unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Conexão com o banco não configurada.');
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      throw new Error('Não foi possível entrar. Verifique seu e-mail e senha.');
    }
    return true;
  };

  const register = async (data: RegisterData) => {
    if (!supabase) throw new Error('Conexão com o banco não configurada.');
    setAuthError('');

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          nome: data.nome.trim(),
          posto_graduacao: data.postoGraduacao.trim(),
          matricula: data.matricula.trim(),
          cpf: data.cpf.replace(/\D/g, ''),
          data_nascimento: data.dataNascimento.trim(),
          contato: data.contato.replace(/\D/g, ''),
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('não puderam ser validados') ||
        error.code === '23505' ||
        msg.includes('already registered') ||
        msg.includes('user already exists')
      ) {
        throw new Error('Os dados informados não puderam ser validados. Verifique as informações ou contate o administrador.');
      }
      throw new Error(error.message || 'Não foi possível enviar a solicitação de cadastro.');
    }

    // Se criou sessão automaticamente, desloga para manter estado de aprovação pendente
    if (authData.session) {
      await supabase.auth.signOut({ scope: 'local' });
    }

    return { status: 'pending_approval' as const };
  };

  const checkStatus = async (): Promise<RegistrationStatusInfo | null> => {
    if (!supabase) return null;
    try {
      const { data } = await supabase.rpc('get_my_registration_status');
      return data as RegistrationStatusInfo | null;
    } catch {
      return null;
    }
  };

  const logout = () => {
    generation.current++;
    resolvedAccount.current = null;
    setUser(null);
    setAuthError('');
    if (supabase) {
      void logActivity('session_close');
      void supabase.auth.signOut().then(({ error }) => {
        if (error) setAuthError('A sessão local foi encerrada. Tente sair novamente.');
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, register, logout, checkStatus }}>
      {children}
    </AuthContext.Provider>
  );
}
