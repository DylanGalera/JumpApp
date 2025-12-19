import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Simulate checking for a session cookie or local token
        // const response = await api.get('/auth/me'); 
        // setUser(response.data);
      } catch (err) {
        setUser(null);
      } finally {
        setIsLoading(false); // Done checking
      }
    };
    checkAuth();
  }, []);

  const login = (userData: any) => setUser(userData);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user, 
      isLoading, 
      user, 
      login, 
      logout 
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