import { ROUTES_NAMES, RVerifyCodeResult, TUser } from '@financial-ai/types';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { post } from '../services';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (userData: any) => void;
  logout: () => void;
  isHubspotConnected?: boolean
  setHubSpot: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<TUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading

  const setHubSpot = () => {
    setUser(u => {
      if (!u) return u
      return { ...u, hubspotTokens: { lastSyncedAt: 1, access_token: '', refresh_token: '', expiresAt: 0 } }
    })
  }
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await post<any, RVerifyCodeResult>(ROUTES_NAMES.AUTH.name + ROUTES_NAMES.AUTH.apis.check, {})
        if (result.success) {
          login(result.user)
        }
      } catch (err) {
        setUser(null);
      } finally {
        setIsLoading(false); // Done checking
      }
    };
    checkAuth();
  }, []);

  const login = (userData: TUser) => setUser(userData);
  const logout = () => {
    post<any, RVerifyCodeResult>(ROUTES_NAMES.AUTH.name + ROUTES_NAMES.AUTH.apis.logout, {})
    setUser(null)
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      isLoading,
      user,
      login,
      logout,
      isHubspotConnected: !!user?.hubspotTokens,
      setHubSpot
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};