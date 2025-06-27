"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import { SessionRequest } from "./MessageContext";
import { useAuth } from "./AuthContext";
import { createClient } from "@/utils/supabase/client";
import { CACHE_CONFIG, updateCache, updateItemInArrayCache, saveToCache, getFromCache } from '@/lib/caching';

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
  message_id: string;
  tutor_ready: boolean;
  student_ready: boolean;
  cost?: number | null;
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
  refreshSessions: (options?: { force?: boolean }) => Promise<void>;
  updateSession: (session: ActiveSession) => void;
  addOptimisticSession: (session: ActiveSession) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [reviewHistory, setReviewHistory] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const REFRESH_COOLDOWN = 5000; // 5 seconds minimum between refreshes
  
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
      
      // Handle specific session updates from other tabs
      if (event.key === 'session_updated' && event.newValue) {
        try {
          const { id, timestamp } = JSON.parse(event.newValue);
          
          // Only process reasonably recent updates (within last 10 seconds)
          if (Date.now() - timestamp < 10000) {
            // Fetch the single updated session to refresh it
            getSessionById(id).then(updatedSession => {
              if (updatedSession) {
                updateSession(updatedSession);
              }
            });
          }
        } catch (e) {
          // Invalid JSON, ignore
        }
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
  const refreshSessions = useCallback(async (options: { force?: boolean } = {}): Promise<void> => {
    if (!user) {
      setSessions([]);
      return;
    }
    
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    
    // Skip refresh if we refreshed recently, unless force is true
    if (!options.force && timeSinceLastRefresh < REFRESH_COOLDOWN) {
      // If we're in cooldown period, schedule a refresh for later
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        refreshSessions({ force: true });
      }, REFRESH_COOLDOWN - timeSinceLastRefresh);
      
      return;
    }
    
    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    // Update the last refresh timestamp
    lastRefreshTimeRef.current = now;
    
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
      const cacheKey = `user_sessions:${user.id}:${userType}`;
      
      // First check if we have cached data to show immediately
      const cachedData = getFromCache<{ sessions: ActiveSession[] }>(cacheKey);
      if (cachedData && cachedData.sessions) {
        // Use cached data while we fetch fresh data
        setSessions(cachedData.sessions);
        
        // Check for active sessions
        const activeSessionCandidate = cachedData.sessions.find((s: ActiveSession) => 
          s.status === 'started' || s.status === 'accepted'
        );
        
        if (activeSessionCandidate) {
          setActiveSession(activeSessionCandidate);
        }
      }
      
      // Always fetch fresh data from API to ensure we have latest state
      const response = await fetch(`/api/tutoring-sessions?user_id=${user.id}&user_type=${userType}`, {
        credentials: 'include',
        // Add cache-busting headers
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
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
        // Update state with fresh data
        setSessions(data.sessions);
        
        // Save fresh data to cache
        saveToCache(cacheKey, data);
        
        // Also cache in the global sessions cache
        saveToCache(CACHE_CONFIG.SESSIONS_CACHE_KEY, data.sessions);
        
        // Check for active sessions
        const activeSessionCandidate = data.sessions.find((s: ActiveSession) => 
          s.status === 'started' || s.status === 'accepted'
        );
        
        if (activeSessionCandidate) {
          setActiveSession(activeSessionCandidate);
        } else if (activeSession && !data.sessions.some((s: ActiveSession) => s.id === activeSession.id)) {
          // If the active session is no longer in the list, clear it
          setActiveSession(null);
        }
      }
    } catch (error) {
      // Don't throw error here - handle it gracefully
    } finally {
      setLoadingSessions(false);
    }
  }, [user, checkPremiumAccess, activeSession]);

  // Update a specific session
  const updateSession = useCallback((session: ActiveSession) => {
    // Update session in React state
    setSessions(prev => 
      prev.map(s => s.id === session.id ? { ...s, ...session } : s)
    );
    
    // Update active session if it matches
    if (activeSession && activeSession.id === session.id) {
      setActiveSession({ ...activeSession, ...session });
    }
    
    // Update session in cache so other components and future loads use updated data
    
    // 1. Update the specific session cache
    updateCache<{ session: ActiveSession | null, error: string | null }>(
      `session:${session.id}`,
      (currentData) => {
        if (!currentData) return null;
        return {
          ...currentData,
          session: { ...currentData.session, ...session }
        };
      }
    );
    
    // 2. Update the conversation sessions cache
    if (session.conversation_id) {
      const conversationCacheKey = `sessions:${session.conversation_id}`;
      updateCache<{ sessions: ActiveSession[], error: string | null }>(
        conversationCacheKey,
        (currentData) => {
          if (!currentData || !currentData.sessions) return null;
          return {
            ...currentData,
            sessions: currentData.sessions.map(s => 
              s.id === session.id ? { ...s, ...session } : s
            )
          };
        }
      );
    }
    
    // 3. Update user sessions cache
    if (user) {
      // Update in both tutor and student caches as we might not know which one is relevant
      ['tutor', 'student'].forEach(userType => {
        const userSessionsCacheKey = `user_sessions:${user.id}:${userType}`;
        updateCache<{ sessions: ActiveSession[], error: string | null }>(
          userSessionsCacheKey,
          (currentData) => {
            if (!currentData || !currentData.sessions) return null;
            return {
              ...currentData,
              sessions: currentData.sessions.map(s => 
                s.id === session.id ? { ...s, ...session } : s
              )
            };
          }
        );
      });
    }
    
    // 4. Update in the global sessions cache
    updateCache<ActiveSession[]>(
      CACHE_CONFIG.SESSIONS_CACHE_KEY,
      (currentSessions) => {
        if (!currentSessions) return null;
        return currentSessions.map((s: ActiveSession) => 
          s.id === session.id ? { ...s, ...session } : s
        );
      }
    );
    
    // Trigger session updated event so other tabs will know to refresh
    try {
      localStorage.setItem('session_updated', JSON.stringify({
        id: session.id,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [activeSession, user]);

  // Add this new function to handle optimistic updates
  const addOptimisticSession = useCallback((session: ActiveSession): void => {
    // First update the state
    setSessions(prev => {
      // Check if session already exists
      const exists = prev.some(s => s.id === session.id);
      if (exists) {
        // Update existing session
        return prev.map(s => s.id === session.id ? { ...s, ...session } : s);
      } else {
        // Add new session
        return [...prev, session];
      }
    });
    
    // Update active session if needed
    if (session.status === 'started' || session.status === 'accepted') {
      setActiveSession(session);
    }
    
    // Update session in all caches
    if (user) {
      // Update user sessions cache for both tutor and student
      const userType = user.role === 'tutor' ? 'tutor' : 'student';
      const cacheKey = `user_sessions:${user.id}:${userType}`;
      
      updateCache<{ sessions: ActiveSession[], error: string | null }>(cacheKey, (currentData) => {
        if (!currentData) {
          // Create new cache entry if none exists
          return {
            sessions: [session],
            error: null
          };
        }
        
        // Check if session already exists in cache
        const exists = currentData.sessions.some(s => s.id === session.id);
        if (exists) {
          // Update existing session
          return {
            ...currentData,
            sessions: currentData.sessions.map(s => s.id === session.id ? { ...s, ...session } : s)
          };
        } else {
          // Add new session
          return {
            ...currentData,
            sessions: [...currentData.sessions, session]
          };
        }
      });
      
      // Also update the global sessions cache
      updateCache<ActiveSession[]>(CACHE_CONFIG.SESSIONS_CACHE_KEY, (currentSessions) => {
        if (!currentSessions) {
          return [session];
        }
        
        // Check if session already exists
        const exists = currentSessions.some(s => s.id === session.id);
        if (exists) {
          // Update existing session
          return currentSessions.map(s => s.id === session.id ? { ...s, ...session } : s);
        } else {
          // Add new session
          return [...currentSessions, session];
        }
      });
      
      // If session has conversation_id, update that cache too
      if (session.conversation_id) {
        const conversationCacheKey = `sessions:${session.conversation_id}`;
        updateCache<{ sessions: ActiveSession[], error: string | null }>(
          conversationCacheKey,
          (currentData) => {
            if (!currentData) {
              return {
                sessions: [session],
                error: null
              };
            }
            
            // Check if session already exists
            const exists = currentData.sessions.some(s => s.id === session.id);
            if (exists) {
              // Update existing session
              return {
                ...currentData,
                sessions: currentData.sessions.map(s => s.id === session.id ? { ...s, ...session } : s)
              };
            } else {
              // Add new session
              return {
                ...currentData,
                sessions: [...currentData.sessions, session]
              };
            }
          }
        );
      }
    }
  }, [user]);

  // Add event listener for session-updated event
  useEffect(() => {
    const handleSessionUpdated = (event: CustomEvent) => {
      const updatedSession = event.detail?.session;
      if (updatedSession && updatedSession.id) {
        // Update the session in our state
        updateSession(updatedSession);
      }
    };

    // Listen for both session-updated and session-list-updated events
    window.addEventListener('session-updated', handleSessionUpdated as EventListener);
    
    // The session-list-updated event should trigger a refresh
    const handleSessionListUpdated = () => {
      refreshSessions();
    };
    
    window.addEventListener('session-list-updated', handleSessionListUpdated);
    
    return () => {
      window.removeEventListener('session-updated', handleSessionUpdated as EventListener);
      window.removeEventListener('session-list-updated', handleSessionListUpdated);
    };
  }, [updateSession, refreshSessions]);

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
        updateSession,
        addOptimisticSession
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
    updateSession,
    addOptimisticSession
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
    updateSession,
    addOptimisticSession
  };
};
