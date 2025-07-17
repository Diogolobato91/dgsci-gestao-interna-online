import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AuthContextType, User, UserProfile } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (matricula: string, senha: string, profile: UserProfile): Promise<boolean> => {
    // Simulação de autenticação - aceita qualquer senha não vazia
    if (matricula && senha) {
      setUser({
        matricula,
        profile,
        isAuthenticated: true,
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};