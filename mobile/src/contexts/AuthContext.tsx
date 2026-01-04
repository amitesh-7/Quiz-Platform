import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types/user";
import { authAPI } from "../api/auth";

const TOKEN_KEY = "@quiz_platform_token";
const USER_KEY = "@quiz_platform_user";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  studentLogin: (name: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    secretKey: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext }; // Export for hooks

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const storeAuth = async (authToken: string, authUser: User) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, authToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(authUser)),
    ]);
    setToken(authToken);
    setUser(authUser);
  };

  const clearAuth = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authAPI.teacherLogin(email, password);
      await storeAuth(response.data.token, response.data.user);
    } finally {
      setLoading(false);
    }
  };

  const studentLogin = async (name: string) => {
    setLoading(true);
    try {
      const response = await authAPI.studentLogin(name);
      await storeAuth(response.data.token, response.data.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    secretKey: string;
  }) => {
    setLoading(true);
    try {
      const response = await authAPI.register(data);
      await storeAuth(response.data.token, response.data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await clearAuth();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        studentLogin,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
