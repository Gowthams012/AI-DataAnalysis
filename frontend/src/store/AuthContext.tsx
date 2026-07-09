import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getSessions, getSessionDetails } from '../services/api';
import { useAppStore } from './useAppStore';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const recoverSession = async () => {
      try {
        const store = useAppStore.getState();
        // If we have a cached session, verify it's valid for this user
        if (store.sessionId) {
          try {
            await getSessionDetails(store.sessionId);
            return; // Session is valid and loaded
          } catch (err) {
            console.warn("Cached session invalid or belongs to another user. Clearing.");
            store.setSessionId(null);
            store.setUploadedFiles([]);
            store.clearMessages();
          }
        }
        
        const sessions = await getSessions();
        if (sessions && sessions.length > 0) {
          // Sort by last_active descending and pick the latest
          const latest = sessions.sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime())[0];
          const details = await getSessionDetails(latest.session_id);
          
          store.switchSession(details.session_id, details.files);
        }
      } catch (err) {
        console.error("Failed to recover session:", err);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        recoverSession();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        recoverSession();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const store = useAppStore.getState();
    store.setSessionId(null);
    store.setUploadedFiles([]);
    store.clearMessages();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
