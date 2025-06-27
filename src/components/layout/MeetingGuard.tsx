"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

interface MeetingGuardProps {
  sessionId: string;
  children: React.ReactNode;
}

export function MeetingGuard({ sessionId, children }: MeetingGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const validateSession = async () => {
      if (!sessionId || !user) {
        setError("Invalid session or not authenticated");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch session details
        const response = await fetch(`/api/tutoring-sessions?session_id=${sessionId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch session: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.session) {
          throw new Error("Session not found");
        }
        
        const session = data.session;
        
        // Check if user is authorized to join this session
        if (session.tutor_id !== user.id && session.student_id !== user.id) {
          throw new Error("You are not authorized to join this session");
        }
        
        // Check if session is active - allow joining if:
        // 1. Status is 'started' (always allow)
        // 2. Status is 'accepted' AND either:
        //    a. Both participants are ready
        //    b. User is the tutor who is starting the meeting
        const isSessionStarted = session.status === 'started';
        const isSessionAccepted = session.status === 'accepted';
        const areBothReady = session.tutor_ready && session.student_ready;
        const isTutorStartingMeeting = user.id === session.tutor_id && session.tutor_ready;
        
        if (isSessionStarted || (isSessionAccepted && (isTutorStartingMeeting))) {
          // Session is valid - allow access
          setIsLoading(false);
        } else {
          // Session is not in a valid state for meeting
          const statusMessage = session.status === 'ended' ? 
            'This session has ended' : 
            session.status === 'cancelled' ? 
              'This session has been cancelled' : 
              `This session is not active (current status: ${session.status})`;
              
          throw new Error(statusMessage);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to validate session");
        setIsLoading(false);
      }
    };

    validateSession();
  }, [sessionId, user]);

  // Periodically check session status
  useEffect(() => {
    if (error) return; // Don't check if already in error state
    
    const checkInterval = setInterval(async () => {
      if (!sessionId || !user) return;
      
      try {
        const response = await fetch(`/api/tutoring-sessions?session_id=${sessionId}`);
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.session) {
          const session = data.session;
          
          // If session is ended or cancelled, redirect to dashboard
          if (session.status === 'ended' || session.status === 'cancelled') {
            clearInterval(checkInterval);
            router.push('/dashboard/messages');
          }
        }
      } catch (error) {
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(checkInterval);
  }, [sessionId, user, router, error]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-lg">Validating session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push('/dashboard/messages')}
          className="mt-6"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
} 