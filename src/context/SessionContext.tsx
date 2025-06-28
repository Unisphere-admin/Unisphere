"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { SessionRequest } from "./MessageContext";
import { useAuth } from "./AuthContext";
import { createClient } from "@/utils/supabase/client";

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
  refreshSessions: () => Promise<void>;
  updateSession: (session: ActiveSession) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [reviewHistory, setReviewHistory] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Check if user has premium access
  const checkPremiumAccess = useCallback(async () => {
    if (!user) {
      return false;
    }
    
    try {
      // Use the API route instead of direct database access
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      
      // User has access if they are a tutor OR have premium access
      return data.user?.role === 'tutor' || data.user?.has_access === true;
    } catch (error) {
      return false;
    }
  }, [user]);
  
  // Fetch reviews for user
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        if (!user) return;
        
        // For tutors, we always fetch reviews (tutors have automatic premium access)
        if (user.role === 'tutor') {
          const response = await fetch(`/api/reviews?tutor_id=${user.id}`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            return;
          }
          
          const data = await response.json();
          if (data.reviews) {
            // Transform reviews if needed to match our interface
            const formattedReviews: Review[] = data.reviews.map((review: any) => ({
              id: review.id,
              tutorId: review.tutor_id,
              studentId: review.student_id,
              rating: review.rating,
              comment: review.comment || '',
              date: new Date(review.created_at),
              sessionId: review.session_id || ''
            }));
            
            setReviewHistory(formattedReviews);
          } else {
            setReviewHistory([]);
          }
        } else {
          // For students, check premium access before fetching reviews
          const hasPremiumAccess = await checkPremiumAccess();
          if (!hasPremiumAccess) {
            setReviewHistory([]);
            return;
          }
          
          // For students with premium access, we could fetch their submitted reviews if needed
          setReviewHistory([]);
        }
      } catch (error) {
        setReviewHistory([]);
      }
    };
    
    fetchReviews();
  }, [user, checkPremiumAccess]);
  
  // Fetch user's sessions
  useEffect(() => {
    refreshSessions();
    
    // Set up storage event listener to handle cross-tab cache invalidation
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'session_cache_invalidated') {
        // Refresh sessions when another tab invalidates the cache
        refreshSessions();
      }
    };
    
    // Add event listener for storage events
    window.addEventListener('storage', handleStorageEvent);
    
    // Also listen for custom session update events from RealtimeContext
    const handleSessionUpdate = () => {
      refreshSessions();
    };
    
    window.addEventListener('session-list-updated', handleSessionUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('session-list-updated', handleSessionUpdate);
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Get a session by ID
  const getSessionById = useCallback(async (sessionId: string): Promise<ActiveSession | null> => {
    setLoading(true);
    try {
      // Only proceed if user is logged in
      if (!user) {
        return null;
      }
      
      // Check if user has premium access before making API calls
      const hasPremiumAccess = await checkPremiumAccess();
      if (!hasPremiumAccess && user.role !== 'tutor') {
        return null;
      }
      
      // Make API call to fetch session
      const response = await fetch(`/api/tutoring-sessions?session_id=${sessionId}`, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Handle unauthorized
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      
      const data = await response.json();
      if (data.session) {
        return data.session;
      }
      
      return null;
    } catch (error) {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, checkPremiumAccess]);

  // Start a session 
  const startSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setLoading(true);
    try {
      if (!user) {
        throw new Error("You must be logged in to start a session");
      }
      
      // Check if user has premium access before making API calls
      const hasPremiumAccess = await checkPremiumAccess();
      if (!hasPremiumAccess && user.role !== 'tutor') {
        throw new Error("Premium access required to start sessions");
      }
      
      // Make API call to start the session
      const response = await fetch('/api/tutoring-sessions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          action: 'update_status',
          status: 'started'
        }),
        credentials: 'include'
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      
      if (!response.ok) {
        throw new Error('Failed to start session');
      }
      
      const data = await response.json();
      
      if (data.session) {
        setActiveSession(data.session);
        return true;
      }
      
      return false;
    } catch (error) {
      throw new Error("Failed to start session");
    } finally {
      setLoading(false);
    }
  }, [user, checkPremiumAccess]);

  // End a session
  const endSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) {
      throw new Error("You must be logged in to end a session");
    }
    
    // Check if user is a tutor
    if (user.role !== 'tutor') {
      throw new Error("Only tutors are permitted to end sessions");
    }
    
    // Check if user has premium access before making API calls
    const hasPremiumAccess = await checkPremiumAccess();
    if (!hasPremiumAccess && user.role !== 'tutor') {
      throw new Error("Premium access required to end sessions");
    }
    
    setLoading(true);
    try {
      // Make API call to update session status
      const response = await fetch('/api/tutoring-sessions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          action: 'update_status',
          status: 'ended'
        }),
        credentials: 'include'
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      
      if (!response.ok) {
        throw new Error('Failed to end session');
      }
      
      const data = await response.json();
      
      if (data.session) {
        const updatedSession = data.session;
        
        // If this was the active session, update it with server data
        if (activeSession && activeSession.id === sessionId) {
          setActiveSession({
            ...activeSession,
            ...updatedSession // Use all updated fields from server
          });
        }
        
        // Update in sessions list with server data
        setSessions(prev => 
          prev.map(s => 
            s.id === sessionId 
              ? { ...s, ...updatedSession } // Use all updated fields from server
              : s
          )
        );
        
        return true;
      }
      
      return false;
    } catch (error) {
      throw new Error("Failed to end session");
    } finally {
      setLoading(false);
    }
  }, [user, activeSession, checkPremiumAccess]);

  // Submit a review for a tutor
  const submitReview = useCallback(async (sessionId: string, tutorId: string, rating: number, comment: string): Promise<void> => {
    setLoading(true);
    try {
      if (!user) {
        throw new Error("You must be logged in to submit a review");
      }
      
      // Check if user has premium access before making API calls
      const hasPremiumAccess = await checkPremiumAccess();
      if (!hasPremiumAccess && user.role !== 'tutor') {
        throw new Error("Premium access required to submit reviews");
      }
      
      // Make API call to submit review
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          tutor_id: tutorId,
          rating,
          comment
        }),
        credentials: 'include'
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      
      if (!response.ok) {
        throw new Error('Failed to submit review');
      }
      
      const data = await response.json();
      
      if (data.review) {
        // Add the new review to our history
        const newReview: Review = {
          id: data.review.id,
          tutorId: data.review.tutor_id,
          studentId: user.id,
          rating: data.review.rating,
          comment: data.review.comment,
          date: new Date(),
          sessionId: sessionId
        };
        
        setReviewHistory(prev => [...prev, newReview]);
      }
    } catch (error) {
      throw new Error("Failed to submit review");
    } finally {
      setLoading(false);
    }
  }, [user, checkPremiumAccess]);

  // Fetch all reviews for a specific tutor
  const getReviewsForTutor = useCallback(async (tutorId: string): Promise<Review[]> => {
    try {
      // Make API call to get reviews for a tutor
      const response = await fetch(`/api/reviews/tutor/${tutorId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tutor reviews');
      }
      
      const data = await response.json();
      
      // Map API response to our Review interface
      const reviews: Review[] = data.reviews.map((review: any) => ({
        id: review.id,
        tutorId: review.tutor_id,
        studentId: review.student_id,
        rating: review.rating,
        comment: review.comment || '',
        date: new Date(review.created_at),
        sessionId: review.session_id || ''
      }));
      
      return reviews;
    } catch (error) {
      return [];
    }
  }, []);

  // Refresh sessions list
  const refreshSessions = useCallback(async (): Promise<void> => {
    if (!user) {
      setSessions([]);
      return;
    }
    
    // Check if user has premium access before making API calls
    const hasPremiumAccess = await checkPremiumAccess();
    if (!hasPremiumAccess && user.role !== 'tutor') {
      setSessions([]);
      return;
    }
    
    setLoadingSessions(true);
    try {
      // Include both user_id and user_type to satisfy API requirements
      const userType = user.role === 'tutor' ? 'tutor' : 'student';
      const response = await fetch(`/api/tutoring-sessions?user_id=${user.id}&user_type=${userType}`, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch sessions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.sessions) {
        setSessions(data.sessions);
        
        // Check for active sessions
        const activeSessionCandidate = data.sessions.find((s: ActiveSession) => 
          s.status === 'started' || s.status === 'accepted'
        );
        
        if (activeSessionCandidate) {
          setActiveSession(activeSessionCandidate);
        }
      }
    } catch (error) {
      // Don't throw error here - handle it gracefully
    } finally {
      setLoadingSessions(false);
    }
  }, [user, checkPremiumAccess]);

  // Update session in local state
  const updateSession = useCallback((updatedSession: ActiveSession) => {
    if (!updatedSession || !updatedSession.id) return;
    
    // Ensure created_at is present
    const sessionWithCreatedAt = {
      ...updatedSession,
      created_at: updatedSession.created_at || new Date().toISOString()
    };
    
    // Update in sessions list
    setSessions(prev => {
      const exists = prev.some(s => s.id === sessionWithCreatedAt.id);
      
      if (exists) {
        // Update existing session
        return prev.map(s => 
          s.id === sessionWithCreatedAt.id 
            ? { ...s, ...sessionWithCreatedAt } 
            : s
        );
      } else {
        // Add new session
        return [...prev, sessionWithCreatedAt];
      }
    });
    
    // If this is the active session, update it
    if (activeSession && activeSession.id === sessionWithCreatedAt.id) {
      setActiveSession({
        ...activeSession,
        ...sessionWithCreatedAt
      });
    }
    
    // Trigger a custom event to notify other components
    if (typeof window !== 'undefined') {
      const event = new Event('session-updated');
      window.dispatchEvent(event);
      
      // Also trigger a refresh of all sessions to ensure proper sorting
      setTimeout(() => refreshSessions(), 100);
    }
  }, [activeSession, refreshSessions]);

  return (
    <SessionContext.Provider
      value={{
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
        updateSession
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSessions = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessions must be used within a SessionProvider");
  }
  
  const { 
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
    updateSession
  } = context;
  
  return {
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
    updateSession
  };
};
