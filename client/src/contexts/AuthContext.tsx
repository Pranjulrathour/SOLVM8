import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  email: string;
  freeAttempts: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: false,
  });

  const login = async (email: string, password: string) => {
    try {
      await apiRequest('POST', '/api/auth/login', { email, password });
      // Invalidate the user query to trigger a refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      setLocation('/dashboard');
      toast({
        title: "Login successful",
        description: "Welcome back!"
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid email or password",
        variant: "destructive"
      });
      throw error;
    }
  };

  const signup = async (username: string, email: string, password: string) => {
    try {
      await apiRequest('POST', '/api/auth/signup', { username, email, password });
      // After registration, automatically log in
      await login(email, password);
      
      toast({
        title: "Registration successful",
        description: "Your account has been created"
      });
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive"
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      
      // Clear user from query cache
      queryClient.setQueryData(['/api/user'], null);
      
      setLocation('/');
      toast({
        title: "Logged out",
        description: "You have been logged out successfully"
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "Failed to log out properly",
        variant: "destructive"
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to handle 401 responses gracefully
type UnauthorizedBehavior = 'returnNull' | 'throw';
const getQueryFn = ({ on401 }: { on401: UnauthorizedBehavior }) => {
  return async ({ queryKey }: { queryKey: string[] }) => {
    const res = await fetch(queryKey[0], {
      credentials: 'include',
    });

    if (on401 === 'returnNull' && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    
    return res.json();
  };
};
