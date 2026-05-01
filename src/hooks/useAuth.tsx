import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { type User } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchProfile(session.user.id, session.user);
    }
  };

  useEffect(() => {
    // Safety timeout: Never stay on loading screen more than 5 seconds
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id, session.user);
      } else {
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    }).catch(err => {
      console.error("Initial session fetch failed:", err);
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth State Change:", event);
      if (session) {
        fetchProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  async function fetchProfile(userId: string, sessionUserOverride?: any) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Profile fetch error:", error);
      }

      if (data) {
        setUser(data);
      } else {
        // Fallback for new users - Create profile in DB
        const sUser = sessionUserOverride || (await supabase.auth.getUser()).data.user;
        if (sUser) {
          const newProfile: User = {
            id: sUser.id,
            email: sUser.email || '',
            name: sUser.user_metadata?.full_name || sUser.user_metadata?.name || 'User',
            avatar_url: sUser.user_metadata?.avatar_url,
            credits: 10,
            xp: 0,
            level: 1,
            badges: [],
            lenory_id: 'LEN-' + sUser.id.substring(0, 6).toUpperCase(),
            onboarding_completed: false,
            onboarding_data: {},
            preferences: {
              communication_style: 'simple',
              theme: 'dark',
              language: 'English',
              auto_learn: true,
              voice_assistant: { enabled: false, gender: 'female', voice_id: '' }
            },
            created_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .upsert(newProfile);

          if (insertError) {
            console.error("Profile creation error:", insertError);
          }
          
          setUser(newProfile);
        }
      }
    } catch (err) {
      console.error("Auth initialization failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  const isAdmin = user?.email === 'felixahuruonye@gmail.com';

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
