import { createContext, useContext, useEffect, useState } from 'react';
import { loginRequest, registerRequest, fetchProfile } from '../services/authService.js';
import { useToast } from '../hooks/useToast.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = localStorage.getItem('agenda-user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          await fetchProfile(parsed.id);
        }
      } catch (error) {
        console.error(error);
        toast.error('No pudimos restaurar tu sesión.');
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [toast]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await loginRequest(credentials);
      setUser(data);
      localStorage.setItem('agenda-user', JSON.stringify(data));
      toast.success('Bienvenido de nuevo');
      return data;
    } catch (error) {
      toast.error(error.message || 'Error al iniciar sesión');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const data = await registerRequest(payload);
      setUser(data);
      localStorage.setItem('agenda-user', JSON.stringify(data));
      toast.success('Cuenta creada con éxito');
      return data;
    } catch (error) {
      toast.error(error.message || 'Error al registrarse');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('agenda-user');
    toast.info('Sesión cerrada');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
