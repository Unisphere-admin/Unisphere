"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { createClient } from "@/utils/supabase/client";
import { getFromCache, saveToCache } from "@/lib/caching";

// Define types
interface Review {
  id: string | number;
  tutorId: string;
  studentId: string;
  rating: number;
  comment: string;
  date: Date;
  sessionId: string;
}

export interface ActiveSession {
  id: string;
  tutor_id: string;
  student_id: string;
  subject?: string;
  name?: string;
  startTime?: Date;
  endTime?: Date | null;
  status: "requested" | "accepted" | "started" | "ended" | "cancelled";
  started_at?: string | null;
  ended_at?: string | null;
  scheduled_for?: string | null;
  conversation_id: string;
  message_id?: string | null;
  tutor_ready: boolean;
  student_ready: boolean;
  cost?: number | null;
  created_at: string;
  updated_at?: string;
  tutor_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  student_profile?: {
    first_name: string;
    last_name: string;
  };
}

// Define the context type
interface SessionContextType {
  activeSession: ActiveSession | null;
  reviewHistory: Review[];
  startSession: (sessionId: string) => Promise<boolean>;
  endSession: (sessionId: string) => Promise<boolean>;
  submitReview: (sessionId: string, tutorId: string, rating: number, comment: string) => Promise<void>;
  getReviewsForTutor: (tutorId: string) => Promise<Review[]>;
  getSessionById: (sessionId: string) => Promise<ActiveSession | null>;
  loading: boolean;
  sessions: ActiveSession[];
  loadingSessions: boolean;
  refreshSessions: (forceRefresh?: boolean) => Promise<void>;
  updateSession: (session: ActiveSession) => void;
  isInitialized: boolean;
}

// Create the context with a default value of null
const SessionContext = createContext<SessionContextType | null>(null);

const SESSION_CACHE_KEY = "user_sessions_cache";
const REFRESH_COOLDOWN_MS = 10000; // 10 seconds cooldown between refreshes

// Create a provider component
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [reviewHistory, setReviewHistory] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track the last time sessions were refreshed
  const lastRefreshTimeRef = useRef<number>(0);
  // Track if a refresh is currently in progress
  const isRefreshingRef = useRef<boolean>(false);
  
  // Update the session when it changes
  const updateSession = useCallback((updatedSession: ActiveSession) => {
    setSessions((prevSessions) => {
      // Check if the session already exists in the array
      const existingIndex = prevSessions.findIndex((s) => s.id === updatedSession.id);
      
      if (existingIndex >= 0) {
        // Replace the existing session with the updated one
        const newSessions = [...prevSessions];
        newSessions[existingIndex] = updatedSession;
        
        // Save to cache
        saveToCache(SESSION_CACHE_KEY, newSessions);
        
        return newSessions;
      } else {
        // Add the new session to the array
        const newSessions = [...prevSessions, updatedSession];
        
        // Save to cache
        saveToCache(SESSION_CACHE_KEY, newSessions);
        
        return newSessions;
      }
    });
  }, []);

  // Fetch all sessions for the current user
  const refreshSessions = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    const userId = user.id;
    const now = Date.now();
    
    // Skip if we're already refreshing
    if (isRefreshingRef.current) {
      return;
    }
    
    // Skip if we refreshed too recently, unless forceRefresh is true
    if (!forceRefresh && lastRefreshTimeRef.current > 0 && 
        now - lastRefreshTimeRef.current < REFRESH_COOLDOWN_MS) {
      return;
    }
    
    // Skip API call if this is a temporary user
    if (userId.startsWith('temp-')) {
      setLoadingSessions(false);
      setSessions([]);
      return;
    }
    
    try {
      isRefreshingRef.current = true;
      setLoadingSessions(true);
      
      // Try to get data from cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedSessions = getFromCache<ActiveSession[]>(SESSION_CACHE_KEY);
        if (cachedSessions) {
          setSessions(cachedSessions);
          setLoadingSessions(false);
          // We still continue with the fetch to update in background
        }
      }
      
      const userType = user.role === "tutor" ? "tutor" : "student";
      
      // Fetch from API
      const response = await fetch(`/api/tutoring-sessions?user_id=${userId}&user_type=${userType}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.sessions) {
        // Update state with fresh data
        setSessions(data.sessions);
        
        // Cache the result
        saveToCache(SESSION_CACHE_KEY, data.sessions);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoadingSessions(false);
      isRefreshingRef.current = false;
      lastRefreshTimeRef.current = Date.now();
    }
  }, [user]);

  // Start a session
  const startSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/tutoring-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          action: "update_status",
          status: "started"
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start session");
      }

      const sessionResponse = await response.json();
      setActiveSession(sessionResponse.session);
      
      // Update the session in the sessions array
      updateSession(sessionResponse.session);
      
      return true;
    } catch (error) {
      console.error("Error starting session:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateSession]);

  // End a session
  const endSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/tutoring-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          action: "update_status",
          status: "ended"
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to end session");
      }

      const sessionResponse = await response.json();
      setActiveSession(null);
      
      // Update the session in the sessions array
      updateSession(sessionResponse.session);
      
      return true;
    } catch (error) {
      console.error("Error ending session:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateSession]);

  // Submit a review for a session
  const submitReview = useCallback(async (sessionId: string, tutorId: string, rating: number, comment: string) => {
    if (!user) return;
    
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          tutor_id: tutorId,
          student_id: user.id,
          rating,
          review: comment
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit review");
      }

      const reviewData = await response.json();
      setReviewHistory((prevReviews) => [
        ...prevReviews,
        {
          id: reviewData.review.id,
          tutorId,
          studentId: user.id,
          rating,
          comment,
          date: new Date(),
          sessionId
        },
      ]);
    } catch (error) {
      console.error("Error submitting review:", error);
      throw error;
    }
  }, [user]);

  // Get reviews for a tutor
  const getReviewsForTutor = useCallback(async (tutorId: string) => {
    try {
      const response = await fetch(`/api/reviews/tutor/${tutorId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.reviews) {
        const formattedReviews = data.reviews.map((review: any) => ({
          id: review.id,
          tutorId: review.tutor_id,
          studentId: review.student_id,
          rating: review.rating,
          comment: review.review,
          date: new Date(review.created_at),
          sessionId: review.session_id || ""
        }));
        
        return formattedReviews;
      }
      
      return [];
    } catch (error) {
      console.error("Error fetching tutor reviews:", error);
      return [];
    }
  }, []);

  // Get a session by ID
  const getSessionById = useCallback(async (sessionId: string) => {
    if (!sessionId) return null;
    
    try {
      // Check if we already have this session in our state
      const existingSession = sessions.find(s => s.id === sessionId);
      if (existingSession) {
        return existingSession;
      }
      
      // If not, fetch it from the API
      const response = await fetch(`/api/tutoring-sessions?session_id=${sessionId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.session) {
        // Add the session to our state
        updateSession(data.session);
        return data.session;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching session by ID:", error);
      return null;
    }
  }, [sessions, updateSession]);

  // Initialize sessions on mount
  useEffect(() => {
    if (user && !isInitialized) {
      refreshSessions(true);
      setIsInitialized(true);
    }
  }, [user, refreshSessions, isInitialized]);

  // Listen for realtime session updates from the Realtime context
  useEffect(() => {
    const handleRealtimeSessionUpdate = (event: StorageEvent) => {
      if (!event.key || !event.key.startsWith('session_update:')) {
        return;
      }
      
      try {
        if (event.newValue) {
          const updatedSession = JSON.parse(event.newValue);
          updateSession(updatedSession);
        }
      } catch (error) {
        console.error("Error processing realtime session update:", error);
      }
    };
    
    // Add event listener for storage events (used by RealtimeContext)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleRealtimeSessionUpdate);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleRealtimeSessionUpdate);
      }
    };
  }, [updateSession]);

  const contextValue: SessionContextType = {
    activeSession,
    reviewHistory,
    startSession,
    endSession,
    submitReview,
    getReviewsForTutor,
    getSessionById,
    loading,
    sessions,
    loadingSessions,
    refreshSessions,
    updateSession,
    isInitialized
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use the session context
export const useSessions = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessions must be used within a SessionProvider");
  }
  
  return context;
}; 