import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  TutorProfile, 
  StudentProfile, 
  Review, 
  User, 
  TutoringSession,
  Conversation,
  ConversationParticipant,
  Message
} from '@/types/supabaseTypes';
import { useToast } from '@/hooks/use-toast';

// Hook for fetching tutor profiles
export function useTutorProfiles() {
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const { data, error } = await supabase
          .from('tutor_profile')
          .select('*');

        if (error) throw error;
        setTutors(data ? data.map((tutor: any) => ({
          ...tutor,
          first_name: tutor.first_name || undefined,
          last_name: tutor.last_name || undefined,
          description: tutor.description || undefined,
          subjects: tutor.subjects || undefined,
          avatar_url: tutor.avatar_url || undefined,
          search_id: tutor.search_id || '',
        })) as TutorProfile[] : []);
      } catch (err) {
        console.error('Error fetching tutors:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading tutors",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTutors();
  }, [toast]);

  return { tutors, loading, error };
}

// Hook for fetching a single tutor profile
export function useTutorProfile(id: string | undefined) {
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchTutor = async () => {
      try {
        const { data, error } = await supabase
          .from('tutor_profile')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows returned
            setTutor(null);
          } else {
            throw error;
          }
        } else {
          setTutor(data);
        }
      } catch (err) {
        console.error('Error fetching tutor:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading tutor profile",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTutor();
  }, [id, toast]);

  return { tutor, loading, error };
}

// Hook for fetching reviews for a tutor
export function useTutorReviews(tutorId: string | undefined) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!tutorId) {
      setLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('tutor_id', tutorId);

        if (error) throw error;
        setReviews(data || []);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading reviews",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [tutorId, toast]);

  return { reviews, loading, error };
}

// Hook for fetching a user by ID
export function useUser(userId: string | undefined) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows returned
            setUser(null);
          } else {
            throw error;
          }
        } else {
          setUser(data);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading user",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, toast]);

  return { user, loading, error };
}

// Hook for fetching student profile
export function useStudentProfile(id: string | undefined) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchStudent = async () => {
      try {
        const { data, error } = await supabase
          .from('student_profile')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows returned
            setStudent(null);
          } else {
            throw error;
          }
        } else {
          setStudent(data);
        }
      } catch (err) {
        console.error('Error fetching student:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading student profile",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id, toast]);

  return { student, loading, error };
}

// Hook for fetching tutoring sessions
export function useTutoringSessions(userId: string | undefined, isTutor: boolean = false) {
  const [sessions, setSessions] = useState<TutoringSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSessions = async () => {
      try {
        const column = isTutor ? 'tutor_id' : 'student_id';
        const { data, error } = await supabase
          .from('tutoring_session')
          .select('*')
          .eq(column, userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading sessions",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [userId, isTutor, toast]);

  return { sessions, loading, error };
}

// Hook for creating or updating a review
export function useReviewMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const submitReview = async (review: Partial<Review>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if this is an update or a new review
      const isUpdate = !!review.id;
      
      let result;
      if (isUpdate) {
        // Update existing review
        result = await supabase
          .from('reviews')
          .update({
            review: review.review,
            rating: review.rating,
            // Don't update created_at for existing reviews
          })
          .eq('id', review.id!);
      } else {
        // Insert new review
        result = await supabase
          .from('reviews')
          .insert({
            tutor_id: review.tutor_id,
            student_id: review.student_id,
            review: review.review,
            rating: review.rating,
            // created_at will be set by default value
          });
      }
      
      if (result.error) throw result.error;
      
      toast({
        title: isUpdate ? "Review updated" : "Review submitted",
        description: "Thank you for your feedback!",
      });
      
      return result.data;
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      toast({
        title: "Error submitting review",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return { submitReview, loading, error };
}

// Hook for fetching conversations
export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchConversations = async () => {
      try {
        // First get all conversation participants for this user
        const { data: participantsData, error: participantsError } = await supabase
          .from('conversation_participant')
          .select('*')
          .eq('user_id', userId);

        if (participantsError) throw participantsError;
        
        if (!participantsData || participantsData.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Get all conversation IDs
        const conversationIds = participantsData
          .map(p => p.conversation_id)
          .filter(Boolean) as string[];

        if (conversationIds.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Get all conversations
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversation')
          .select('*')
          .in('id', conversationIds);

        if (conversationsError) throw conversationsError;
        setConversations(conversationsData || []);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading conversations",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [userId, toast]);

  return { conversations, loading, error };
}

// Hook for fetching messages for a conversation
export function useConversationMessages(conversationId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('message')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading messages",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId, toast]);

  return { messages, loading, error };
}

// Hook for sending a message
export function useSendMessage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const sendMessage = async (message: {
    conversation_id: string;
    sender_id: string;
    content: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('message')
        .insert([message]);
      
      if (error) throw error;
      
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      toast({
        title: "Error sending message",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  return { sendMessage, loading, error };
}

// Hook for fetching a specific tutoring session
export function useTutoringSession(sessionId: string | undefined) {
  const [session, setSession] = useState<TutoringSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const { data, error } = await supabase
          .from('tutoring_session')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setSession(null);
          } else {
            throw error;
          }
        } else {
          setSession(data);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
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

    fetchSession();
  }, [sessionId, toast]);

  return { session, loading, error };
}

// Hook for updating tutoring session status
export function useUpdateSessionStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const updateSessionStatus = async (
    sessionId: string, 
    updateData: Partial<{
      status: string;
      started_at: string | null;
      ended_at: string | null;
      tutor_ready: boolean;
      student_ready: boolean;
    }>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('tutoring_session')
        .update(updateData)
        .eq('id', sessionId);
      
      if (error) throw error;
      
      toast({
        title: "Session updated",
        description: "Session status has been updated successfully.",
      });
      
      return true;
    } catch (err) {
      console.error('Error updating session:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      toast({
        title: "Error updating session",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  return { updateSessionStatus, loading, error };
}

// Hook for creating a new tutoring session
export function useCreateTutoringSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const createSession = async (sessionData: {
    tutor_id: string;
    student_id: string;
    conversation_id: string;
    message_id: string;
    name?: string;
    scheduled_for?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('tutoring_session')
        .insert([{
          ...sessionData,
          status: 'requested',
          tutor_ready: false,
          student_ready: false
        }])
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Session created",
        description: "Tutoring session has been created successfully.",
      });
      
      return data?.[0] || null;
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      toast({
        title: "Error creating session",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return { createSession, loading, error };
}
