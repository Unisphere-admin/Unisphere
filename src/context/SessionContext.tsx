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
  refreshSessions: (forceRefresh?: boolean) => Promise<void>;
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
    // Only fetch sessions once when component mounts and user exists
    if (user) {
      // Use a ref to track if we've already done the initial fetch
      const hasInitialFetchKey = `session_initial_fetch_${user.id}`;
      const hasInitialFetch = sessionStorage.getItem(hasInitialFetchKey);
      
      if (!hasInitialFetch) {
        // Only do the initial fetch once per session
        refreshSessions(true); // Force refresh on first load
        try {
          sessionStorage.setItem(hasInitialFetchKey, 'true');
        } catch (e) {
          // Ignore storage errors
        }
      }
    }
    
    // Set up storage event listener to handle cross-tab cache invalidation
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'session_cache_invalidated') {
        // Refresh sessions when another tab invalidates the cache
        refreshSessions(true);
      }
    };
    
    // Add event listener for storage events
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent);
      }
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
  const refreshSessions = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    // Skip refresh unless explicitly forced (manual refresh)
    if (!forceRefresh && !user) {
      return;
    }
    
    // Create a unique key for this request
    const requestKey = `sessions_request_${user?.id}_${Date.now()}`;
    
    // Check if there's an in-progress request
    const inProgressKey = 'sessions_request_in_progress';
    const inProgressRequest = sessionStorage.getItem(inProgressKey);
    if (inProgressRequest && !forceRefresh) {
      // If there's a request in progress and this isn't forced, skip it
      return;
    }
    
    // If not forced, we'll limit refreshes to critical situations only
    if (!forceRefresh) {
      // Throttle background refreshes to prevent excessive API calls
      const lastRefreshTime = localStorage.getItem('last_sessions_refresh');
      if (lastRefreshTime) {
        const timeSinceRefresh = Date.now() - parseInt(lastRefreshTime, 10);
        // Don't refresh if we've refreshed in the last 30 seconds
        if (timeSinceRefresh < 30000) {
          return;
        }
      }
    }
    
    // Check if user has premium access before making API calls
    const hasPremiumAccess = await checkPremiumAccess();
    if (!hasPremiumAccess && user?.role !== 'tutor') {
      setSessions([]);
      return;
    }
    
    try {
      // Mark this request as in progress
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(inProgressKey, requestKey);
      }
      
      setLoadingSessions(true);
      
      // Include both user_id and user_type to satisfy API requirements
      const userType = user?.role === 'tutor' ? 'tutor' : 'student';
      if (!user?.id) return;
      
      const response = await fetch(`/api/tutoring-sessions?user_id=${user.id}&user_type=${userType}`, {
        credentials: 'include',
        headers: {
          // Add cache busting for forced refreshes
          ...(forceRefresh ? {'Cache-Control': 'no-cache, no-store, must-revalidate'} : {})
        }
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
        // Only update if the data has actually changed
        setSessions(prev => {
          // Check if the data is actually different
          if (prev.length === data.sessions.length && 
              prev.every(s => data.sessions.some(
                (ds: ActiveSession) => ds.id === s.id && 
                ds.status === s.status && 
                ds.tutor_ready === s.tutor_ready && 
                ds.student_ready === s.student_ready
              ))) {
            // Data hasn't changed, don't trigger a re-render
            return prev;
          }
          return data.sessions;
        });
        
        // Check for active sessions
        const activeSessionCandidate = data.sessions.find((s: ActiveSession) => 
          s.status === 'started' || s.status === 'accepted'
        );
        
        if (activeSessionCandidate) {
          setActiveSession(prev => {
            // Only update if different
            if (prev && prev.id === activeSessionCandidate.id && 
                prev.status === activeSessionCandidate.status &&
                prev.tutor_ready === activeSessionCandidate.tutor_ready &&
                prev.student_ready === activeSessionCandidate.student_ready) {
              return prev;
            }
            return activeSessionCandidate;
          });
        }
      }
      
      // Update last refresh time
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_sessions_refresh', Date.now().toString());
      }
    } catch (error) {
      // Don't throw error here - handle it gracefully
    } finally {
      setLoadingSessions(false);
      // Clear the in-progress flag if this is the current request
      if (typeof sessionStorage !== 'undefined') {
        const currentRequest = sessionStorage.getItem(inProgressKey);
        if (currentRequest === requestKey) {
          sessionStorage.removeItem(inProgressKey);
        }
      }
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
    
    // Use functional update to avoid dependency on previous state
    setSessions(prev => {
      // Check if this session already exists in state
      const exists = prev.some(s => s.id === sessionWithCreatedAt.id);
      
      // Skip update if nothing has changed
      if (exists) {
        const existingSession = prev.find(s => s.id === sessionWithCreatedAt.id);
        if (existingSession && 
            existingSession.status === sessionWithCreatedAt.status &&
            existingSession.tutor_ready === sessionWithCreatedAt.tutor_ready &&
            existingSession.student_ready === sessionWithCreatedAt.student_ready) {
          // No changes, return the same array reference to prevent re-renders
          return prev;
        }
        
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
      // Skip update if nothing has changed
      if (activeSession.status === sessionWithCreatedAt.status &&
          activeSession.tutor_ready === sessionWithCreatedAt.tutor_ready &&
          activeSession.student_ready === sessionWithCreatedAt.student_ready) {
        // No changes, don't update state
        return;
      }
      
      setActiveSession({
        ...activeSession,
        ...sessionWithCreatedAt
      });
    }
    
    // Removed event dispatch to prevent triggering other components to refresh
  }, [activeSession]);

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
