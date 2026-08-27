import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type Role, CREDENTIALS } from "./erp-data";
import api from "./api";

export interface Session {
  username: string;
  name: string;
  role: Role;
  department?: string;
}

interface AuthValue {
  session: Session | null;
  ready: boolean;
  signIn: (username: string, password: string, role: Role) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
  setDepartment: (dept: string) => void;
}

const STORAGE_KEY = "srm-erp-session";
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      ready,
      signIn: async (username, password, role) => {
        try {
          const cred = CREDENTIALS[username.toLowerCase()];
          if (cred && cred.password === password) {
            if (cred.role !== role.toLowerCase()) {
              return { ok: false, error: `These credentials are not valid for the ${role} portal.` };
            }
            
            const next: Session = { 
              username, 
              name: cred.name, 
              role 
            };
            
            const fakePayload = btoa(JSON.stringify({ sub: username, role: cred.role }));
            const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakePayload}.fakeSignature`;

            setSession(next);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            window.localStorage.setItem("auth_token", fakeToken);
            return { ok: true };
          }

          const res = await api.post("/auth/login", { username, password });
          const token = res.data.access_token;
          
          // Basic decode payload
          const payload = JSON.parse(atob(token.split('.')[1]));
          const backendRole = payload.role.toLowerCase();
          
          if (backendRole !== role.toLowerCase()) {
            return { ok: false, error: `These credentials are not valid for the ${role} portal.` };
          }
          
          const next: Session = { 
            username, 
            name: username, // Update later if backend returns name
            role 
          };
          
          setSession(next);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          window.localStorage.setItem("auth_token", token);
          return { ok: true };
        } catch (error: any) {
          return { ok: false, error: error.response?.data?.detail || "Invalid username or password." };
        }
      },
      signOut: () => {
        setSession(null);
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem("auth_token");
      },
      setDepartment: (department) => {
        setSession((prev) => {
          if (!prev) return prev;
          const next = { ...prev, department };
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      },
    }),
    [session, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
