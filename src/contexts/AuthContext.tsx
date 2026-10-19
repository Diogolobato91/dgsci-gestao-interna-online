import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthContextType, User, UserProfile } from '@/types/auth';
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
  useEffect(() => {
    let alive = true;
    if (!supabase) { setAuthError('A conexão com o Supabase ainda não está configurada neste ambiente.'); setLoading(false); return; }
    const resolveSession = async (session: Session | null) => {
      const current = ++generation.current;
      if (!alive) return;
      setLoading(true);
      if (!session) { setUser(null); setLoading(false); return; }
      try {
        const { data, error } = await supabase.from('app_members').select('display_name,role,sectors,enabled').eq('user_id', session.user.id).maybeSingle();
        if (!alive || current !== generation.current) return;
        if (error || !data?.enabled) { setUser(null); setAuthError('Sua conta não possui acesso liberado ao DGSCI.'); return; }
        const allowed = profiles.filter(profile => Array.isArray(data.sectors) && data.sectors.includes(profile));
        if (!allowed.length) { setUser(null); setAuthError('Nenhum setor foi vinculado à sua conta.'); return; }
        setAuthError('');
        setUser({ matricula: data.display_name, profile: allowed[0], isAuthenticated: true, allowedProfiles: allowed, role: data.role });
      } catch { if (alive && current === generation.current) { setUser(null); setAuthError('Não foi possível conferir suas permissões. Tente novamente.'); } }
      finally { if (alive && current === generation.current) setLoading(false); }
    };
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep database calls outside the Auth callback's internal lock.
      setTimeout(() => { if (alive) void resolveSession(session); }, 0);
    });
    return () => { alive = false; generation.current++; subscription.subscription.unsubscribe(); };
  }, []);
  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Conexão com o banco não configurada.');
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error('Não foi possível entrar. Confira e-mail, senha e a confirmação do cadastro.');
    return true;
  };
  const register = async (email: string, password: string) => {
    if (!supabase) throw new Error('Conexão com o banco não configurada.');
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
    if (error) throw new Error('Não foi possível cadastrar. Use o e-mail autorizado e uma senha com pelo menos 8 caracteres.');
    return data.session ? 'confirmed' : 'pending';
  };
  const logout = () => {
    generation.current++; setUser(null); setAuthError('');
    if (supabase) void supabase.auth.signOut().then(({ error }) => { if (error) setAuthError('A sessão local foi encerrada. Não foi possível revogar a sessão remota; tente sair novamente.'); });
  };
  return <AuthContext.Provider value={{ user, loading, authError, login, register, logout }}>{children}</AuthContext.Provider>;
}
