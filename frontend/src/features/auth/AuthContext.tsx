import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  signup as apiSignup,
  confirmEmail as apiConfirmEmail,
  resendCode as apiResendCode,
  signin as apiSignin,
} from "./api";

type User = {
  email: string;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (email: string, password: string, username: string) => Promise<void>;
  confirmEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  getAccessToken: () => string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "setnote_access_token";
const REFRESH_KEY = "setnote_refresh_token";
const USER_KEY = "setnote_user";

function loadUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    return loadUser();
  });

  const isAuthenticated = user !== null;

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiSignin(email, password);
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    const newUser = { email };
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const signup = useCallback(async (email: string, password: string, username: string) => {
    await apiSignup(email, password, username);
  }, []);

  const confirmEmail = useCallback(async (email: string, code: string) => {
    await apiConfirmEmail(email, code);
  }, []);

  const resendCode = useCallback(async (email: string) => {
    await apiResendCode(email);
  }, []);

  const getAccessToken = useCallback(() => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        signup,
        confirmEmail,
        resendCode,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
