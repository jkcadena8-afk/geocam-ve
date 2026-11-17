// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';

export interface SignUpResult {
  error: string | null;
  /** true si Supabase pide confirmar el correo antes de entrar. */
  needsConfirmation: boolean;
}

interface AuthValue {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Supabase responde en inglés: se traduce a un mensaje claro para la pantalla. */
function traducir(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos.';
  if (/already (registered|exists)/i.test(message)) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (/email not confirmed/i.test(message)) return 'Confirma tu correo antes de entrar (revisa tu bandeja).';
  if (/password should be at least/i.test(message)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit|too many/i.test(message)) return 'Demasiados intentos. Espera un momento y vuelve a probar.';
  if (/invalid.*email|unable to validate email/i.test(message)) return 'Ese correo no es válido.';
  if (/network|fetch/i.test(message)) return 'Sin conexión con el servidor. Revisa tu internet.';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Se dispara al suscribirse (con la sesión guardada) y en cada login, logout o refresco
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    session,
    isLoading,
    // Devuelve el mensaje de error para la UI, o null si todo salió bien
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? traducir(error.message) : null;
    },
    signUp: async (email, password) => {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) return { error: traducir(error.message), needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    },
    signOut: async () => {
      await supabase.auth.signOut();
      // Las consultas en caché (sincronización) eran del usuario anterior
      queryClient.clear();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
