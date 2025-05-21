"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { SessionRequest } from "./MessageContext";
import { useAuth } from "./AuthContext";

interface Review {
  id: string | number;
  tutorId: string;
  studentId: string;
  rating: number;
  comment: string;
  date: Date;
  sessionId: string;
}

interface ActiveSession {
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
  startSession: (sessionRequest: SessionRequest) => Promise<string>;
  endSession: (sessionId: string) => Promise<void>;
  submitReview: (sessionId: string, tutorId: string, rating: number, comment: string) => Promise<void>;
  getReviewsForTutor: (tutorId: string) => Promise<Review[]>;
  getSessionById: (sessionId: string) => Promise<ActiveSession | null>;
  loading: boolean;
  sessions: ActiveSession[];
  loadingSessions: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [reviewHistory, setReviewHistory] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Load reviews from API
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // This would be a real API call in a production app
        // For now we'll use some mock data
        const mockReviews = [
          {
            id: "1",
            tutorId: "2",
            studentId: "1",
            rating: 5,
            comment: "Amazing tutor! Explained complex math concepts in a simple way.",
            date: new Date(2023, 4, 15),
            sessionId: "past-1"
          },
          {
            id: "2",
            tutorId: "3",
            studentId: "1",
            rating: 4,
            comment: "Very knowledgeable about literature. Would recommend!",
            date: new Date(2023, 5, 2),
            sessionId: "past-2"
          },
          {
            id: "3", 
            tutorId: "4",
            studentId: "1",
            rating: 5,
            comment: "Excellent French tutor. Helped me prepare for my exam.",
            date: new Date(2023, 5, 10),
            sessionId: "past-3"
          },
          {
            id: "4",
            tutorId: "2",
            studentId: "5",
            rating: 5,
            comment: "Sarah is excellent at explaining calculus concepts!",
            date: new Date(2023, 4, 20),
            sessionId: "past-4"
          },
          {
            id: "5",
            tutorId: "3",
            studentId: "6",
            rating: 4,
            comment: "Michael helped me improve my essay writing significantly.",
            date: new Date(2023, 5, 5),
            sessionId: "past-5"
          }
        ];
        setReviewHistory(mockReviews);
      } catch (error) {
        console.error("Error loading reviews:", error);
      }
    };
    
    fetchReviews();
  }, []);
  
  // Fetch user's sessions
  useEffect(() => {
    const fetchSessions = async () => {
      // Only attempt to fetch sessions if user is logged in
      if (!user) {
        setSessions([]);
        setLoadingSessions(false);
        return;
      }
      
      try {
        setLoadingSessions(true);
        // We should make a real API call to fetch sessions for the current user
        // We'd need to know if they're a student or tutor
        const userType = user.role === 'tutor' ? 'tutor' : 'student';
        
        const response = await fetch(`/api/tutoring-sessions?userType=${userType}`, {
          credentials: 'include' // Important for auth cookies
        });
        
        if (response.status === 401) {
          // Handle unauthorized - user might need to login again
          console.log('Session expired or unauthorized. Redirecting to login...');
          setSessions([]);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        
        const data = await response.json();
        if (data.sessions) {
          setSessions(data.sessions);
          
          // Find any active session
          const active = data.sessions.find((s: any) => s.status === "started");
          if (active) {
            setActiveSession(active);
          }
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        // Use mock data as fallback
        const mockSessions: ActiveSession[] = [
          {
            id: "session-1",
            tutor_id: "2",
            student_id: "1",
            subject: "Mathematics",
            name: "Mathematics Session",
            status: "started" as const,
            conversation_id: "conv-1",
            message_id: "msg-1",
            tutor_ready: true,
            student_ready: true,
            scheduled_for: new Date().toISOString(),
            tutor_profile: {
              first_name: "Sarah",
              last_name: "Johnson"
            }
          },
          {
            id: "session-2",
            tutor_id: "3",
            student_id: "1",
            subject: "Physics",
            name: "Physics Homework Help",
            status: "accepted" as const,
            conversation_id: "conv-2",
            message_id: "msg-2",
            tutor_ready: false,
            student_ready: false,
            scheduled_for: new Date(Date.now() + 86400000).toISOString(),
            tutor_profile: {
              first_name: "Michael",
              last_name: "Chen"
            }
          }
        ];
        setSessions(mockSessions);
      } finally {
        setLoadingSessions(false);
      }
    };
    
    fetchSessions();
  }, [user]);
  
  // Get a session by ID
  const getSessionById = useCallback(async (sessionId: string): Promise<ActiveSession | null> => {
    setLoading(true);
    try {
      // Only proceed if user is logged in
      if (!user) {
        return null;
      }
      
      // Make API call to fetch session
      const response = await fetch(`/api/tutoring-sessions?session_id=${sessionId}`, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Handle unauthorized
        console.log('Session expired or unauthorized.');
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
      console.error(`Error fetching session ${sessionId}:`, error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Start a session 
  const startSession = useCallback(async (sessionRequest: SessionRequest): Promise<string> => {
    setLoading(true);
    try {
      // In a real app, this would make an API call to create a tutoring session
      // For now, we'll simulate it
      console.log("Starting session with request:", sessionRequest);
      
      // For real we'd make a POST request to create the session
      // const response = await fetch('/api/tutoring-sessions', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     conversation_id: sessionRequest.conversationId,
      //     message_id: sessionRequest.messageId,
      //     student_id: sessionRequest.studentId,
      //     scheduled_for: sessionRequest.date.toISOString(),
      //     name: sessionRequest.subject
      //   })
      // });
      
      // For mock purposes, we'll create a simulated session
      const newSession: ActiveSession = {
        id: sessionRequest.id,
        tutor_id: "2", // Mock tutor ID
        student_id: "1", // Mock student ID
        subject: sessionRequest.subject,
        status: "started",
        conversation_id: "mock-conversation",
        message_id: "mock-message",
        tutor_ready: false,
        student_ready: false,
      };
      
      setActiveSession(newSession);
      return newSession.id;
    } catch (error) {
      console.error("Error starting session:", error);
      throw new Error("Failed to start session");
    } finally {
      setLoading(false);
    }
  }, []);

  // End a session
  const endSession = useCallback(async (sessionId: string): Promise<void> => {
    if (!user) {
      throw new Error("You must be logged in to end a session");
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
        // If this was the active session, update it
        if (activeSession && activeSession.id === sessionId) {
          setActiveSession({
            ...activeSession,
            status: "ended",
            ended_at: new Date().toISOString()
          });
        }
        
        // Update in sessions list
        setSessions(prev => 
          prev.map(s => 
            s.id === sessionId 
              ? { ...s, status: "ended", ended_at: new Date().toISOString() } 
              : s
          )
        );
      }
    } catch (error) {
      console.error(`Error ending session ${sessionId}:`, error);
      throw new Error("Failed to end session");
    } finally {
      setLoading(false);
    }
  }, [activeSession, user]);

  // Submit a review
  const submitReview = useCallback(async (sessionId: string, tutorId: string, rating: number, comment: string): Promise<void> => {
    if (!user) {
      throw new Error("You must be logged in to submit a review");
    }
    
    setLoading(true);
    try {
      // Make API call to create review
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tutor_id: tutorId,
          rating,
          review: comment,
          session_id: sessionId
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
        const newReview: Review = {
          id: data.review.id,
          tutorId: tutorId,
          studentId: data.review.student_id,
          rating: rating,
          comment: comment,
          date: new Date(),
          sessionId: sessionId
        };
        
        setReviewHistory(prev => [...prev, newReview]);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      throw new Error("Failed to submit review");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get reviews for a tutor
  const getReviewsForTutor = useCallback(async (tutorId: string): Promise<Review[]> => {
    try {
      // Make API call to get tutor reviews
      const response = await fetch(`/api/reviews/tutor/${tutorId}`, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        console.log('Unauthorized when fetching reviews.');
        return [];
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch tutor reviews');
      }
      
      const data = await response.json();
      
      if (data.reviews && Array.isArray(data.reviews)) {
        // Transform API response to match our interface
        return data.reviews.map((review: any) => ({
          id: review.id,
          tutorId: tutorId,
          studentId: review.student_id,
          rating: review.rating,
          comment: review.review || '',
          date: new Date(review.created_at),
          sessionId: review.session_id || 'unknown'
        }));
      }
      
      return reviewHistory.filter(review => review.tutorId === tutorId);
    } catch (error) {
      console.error(`Error fetching reviews for tutor ${tutorId}:`, error);
      // Fall back to local data
      return reviewHistory.filter(review => review.tutorId === tutorId);
    }
  }, [reviewHistory]);

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
        loadingSessions
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSessions = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSessions must be used within a SessionProvider");
  }
  return context;
};
