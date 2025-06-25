
import { useState, useEffect } from 'react';
import { useTutoringSessions, useTutorProfile, useStudentProfile } from './useSupabase';
import { TutoringSession, TutorProfile, StudentProfile } from '@/types/supabaseTypes';
import { useToast } from './use-toast';

export interface EnhancedSession extends TutoringSession {
  tutor?: TutorProfile | null;
  student?: StudentProfile | null;
}

export function useEnhancedSessions(userId: string | undefined, isTutor: boolean = false) {
  const { sessions, loading: sessionsLoading, error: sessionsError } = useTutoringSessions(userId, isTutor);
  const [enhancedSessions, setEnhancedSessions] = useState<EnhancedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (sessionsLoading || sessionsError || !sessions.length) {
      setEnhancedSessions([]);
      setLoading(sessionsLoading);
      setError(sessionsError);
      return;
    }

    // We'll retrieve profile data for all sessions in parallel
    const enhanceSessions = async () => {
      try {
        const enhancedSessionsPromises = sessions.map(async (session) => {
          let tutorProfile = null;
          let studentProfile = null;
          
          // Fetch tutor profile
          try {
            const { data: tutorData } = await fetch(`/api/tutor/${session.tutor_id}`).then(res => res.json());
            if (tutorData) tutorProfile = tutorData;
          } catch (err) {
          }
          
          // Fetch student profile
          try {
            const { data: studentData } = await fetch(`/api/student/${session.student_id}`).then(res => res.json());
            if (studentData) studentProfile = studentData;
          } catch (err) {
          }
          
          return {
            ...session,
            tutor: tutorProfile,
            student: studentProfile
          };
        });
        
        const enhancedData = await Promise.all(enhancedSessionsPromises);
        setEnhancedSessions(enhancedData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading session details",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    enhanceSessions();
  }, [sessions, sessionsLoading, sessionsError, toast]);

  return { sessions: enhancedSessions, loading, error };
}

export function useEnhancedSession(sessionId: string | undefined) {
  const [enhancedSession, setEnhancedSession] = useState<EnhancedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchSessionDetails = async () => {
      try {
        // Fetch session data
        const sessionResponse = await fetch(`/api/session/${sessionId}`);
        if (!sessionResponse.ok) {
          throw new Error('Failed to fetch session');
        }
        
        const { data: session } = await sessionResponse.json();
        if (!session) {
          setEnhancedSession(null);
          setLoading(false);
          return;
        }

        // Fetch tutor profile
        let tutorProfile = null;
        try {
          const tutorResponse = await fetch(`/api/tutor/${session.tutor_id}`);
          if (tutorResponse.ok) {
            const { data } = await tutorResponse.json();
            tutorProfile = data;
          }
        } catch (err) {
        }
        
        // Fetch student profile
        let studentProfile = null;
        try {
          const studentResponse = await fetch(`/api/student/${session.student_id}`);
          if (studentResponse.ok) {
            const { data } = await studentResponse.json();
            studentProfile = data;
          }
        } catch (err) {
        }
        
        setEnhancedSession({
          ...session,
          tutor: tutorProfile,
          student: studentProfile
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading session",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, toast]);

  return { session: enhancedSession, loading, error };
}
