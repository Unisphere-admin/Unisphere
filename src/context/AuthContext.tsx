"use client";

import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Define user data interface
export interface UserData {
  id: string;
  name: string;
  email: string;
  role: "student" | "tutor" | "user"; // Added "user" for no-profile state
  profilePic?: string;
  tokens: number;
  hasProfile?: boolean; // Flag to indicate if profile exists
}

// Create the context with default values
interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  logout: async () => {},
});

// Export a hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// MOCK_USERS is used for development only when not connected to real auth
export const MOCK_USERS = [
  {
    id: "1",
    name: "John Student",
    email: "john@example.com",
    role: "student",
    profilePic: "/placeholder.svg",
    tokens: 100,
    bio: "I'm a student looking to improve my grades.",
    subjects: ["Math", "Science", "English"]
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    role: "tutor",
    profilePic: "/placeholder.svg",
    tokens: 0,
    rating: 4.9,
    bio: "Mathematics tutor with 5+ years of experience.",
    subjects: ["Math", "Statistics", "Physics"]
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Fetch user session on initial load
  useEffect(() => {
    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        handleUserSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      // Use getUser() instead of getSession()
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (user) {
        await handleUserSession(user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking auth session:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSession = async (authUser: User) => {
    try {
      // Use API route instead of direct database calls
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      
      if (data.user) {
        // Set user data from API response
        setUser(data.user);
      } else {
        // No profile found, set minimal user data
        setUser({
          id: authUser.id,
          name: authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          role: 'user',
          tokens: 0,
          hasProfile: false
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Set minimal user data from auth
      setUser({
        id: authUser.id,
        name: authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        role: 'user',
        tokens: 0,
        hasProfile: false
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login with:", { email });
      setLoading(true);
      
      // Use API route instead of direct Supabase call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        toast({
          title: "Login successful",
          description: "Welcome back!"
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Use API route instead of direct Supabase call
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Logout failed');
      }
      
      setUser(null);
      router.push('/login');
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Provide the auth context
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
