"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
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

// Base API fetcher with error handling
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    // Try to parse error message from response
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // Could not parse error JSON
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// Common query options
const defaultQueryOptions = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  refetchOnWindowFocus: false,
  retry: 1,
};

// Hook for fetching tutor profiles with React Query
export function useApiTutorProfiles() {
  const { toast } = useToast();
  
  const { data, error, isLoading } = useQuery({
    queryKey: ['tutors'],
    queryFn: async () => {
      const data = await fetchApi<{tutors: TutorProfile[]}>('/api/tutors');
      return data.tutors || [];
    },
    ...defaultQueryOptions,
    onError: (err) => {
      toast({
        title: "Error loading tutors",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    }
  });

  return { 
    tutors: data || [], 
    loading: isLoading, 
    error: error instanceof Error ? error : error ? new Error(String(error)) : null 
  };
}

// Hook for fetching a single tutor profile with React Query
export function useApiTutorProfile(id: string | undefined) {
  const { toast } = useToast();
  
  const { data, error, isLoading } = useQuery({
    queryKey: ['tutor', id],
    queryFn: async () => {
      if (!id) return null;
      const data = await fetchApi<{tutor: TutorProfile}>(`/api/tutors/${id}`);
      return data.tutor;
    },
    enabled: !!id,
    ...defaultQueryOptions,
    onError: (err) => {
      toast({
        title: "Error loading tutor profile",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    }
  });

  return { 
    tutor: data || null, 
    loading: isLoading, 
    error: error instanceof Error ? error : error ? new Error(String(error)) : null 
  };
}

// Hook for fetching reviews for a tutor with React Query
export function useApiTutorReviews(tutorId: string | undefined) {
  const { toast } = useToast();
  
  const { data, error, isLoading } = useQuery({
    queryKey: ['tutorReviews', tutorId],
    queryFn: async () => {
      if (!tutorId) return [];
      const data = await fetchApi<{reviews: Review[]}>(`/api/reviews/tutor/${tutorId}`);
      return data.reviews || [];
    },
    enabled: !!tutorId,
    ...defaultQueryOptions,
    onError: (err) => {
      toast({
        title: "Error loading reviews",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    }
  });

  return { 
    reviews: data || [], 
    loading: isLoading, 
    error: error instanceof Error ? error : error ? new Error(String(error)) : null 
  };
}

// Hook for fetching tutoring sessions with React Query
export function useApiTutoringSessions(userId: string | undefined, isForTutor = false) {
  const { toast } = useToast();
  
  const { data, error, isLoading } = useQuery({
    queryKey: ['sessions', userId, isForTutor ? 'tutor' : 'student'],
    queryFn: async () => {
      if (!userId) return [];
      const endpoint = isForTutor 
        ? `/api/tutoring-sessions/tutor/${userId}`
        : `/api/tutoring-sessions/student/${userId}`;
      
      const data = await fetchApi<{sessions: TutoringSession[]}>(endpoint);
      return data.sessions || [];
    },
    enabled: !!userId,
    ...defaultQueryOptions,
    onError: (err) => {
      toast({
        title: "Error loading sessions",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    }
  });

  return { 
    sessions: data || [], 
    loading: isLoading, 
    error: error instanceof Error ? error : error ? new Error(String(error)) : null 
  };
}

// Hook for creating a tutoring session with React Query
export function useApiCreateSession() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async (sessionData: {
      tutor_id: string;
      student_id: string;
      name?: string;
      scheduled_for?: string;
    }) => {
      const data = await fetchApi<{session: TutoringSession}>('/api/tutoring-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
      return data.session;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Session created",
        description: "Your tutoring session has been scheduled.",
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.student_id, 'student'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.tutor_id, 'tutor'] });
    },
    onError: (err) => {
      toast({
        title: "Error scheduling session",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    }
  });

  return { 
    createSession: mutation.mutate, 
    createSessionAsync: mutation.mutateAsync,
    loading: mutation.isPending, 
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null 
  };
}

// Hook for accessing messages in a conversation with React Query
export function useApiConversationMessages(conversationId: string | undefined) {
  const { toast } = useToast();
  
  const { data, error, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const data = await fetchApi<{messages: Message[]}>(`/api/messages/${conversationId}`);
      return data.messages || [];
    },
    enabled: !!conversationId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
    ...defaultQueryOptions,
    onError: (err) => {
      toast({
        title: "Error loading messages",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    }
  });

  return { 
    messages: data || [], 
    loading: isLoading, 
    error: error instanceof Error ? error : error ? new Error(String(error)) : null 
  };
}

// Hook for sending a message with React Query
export function useApiSendMessage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async (message: {
      conversation_id: string;
      sender_id: string;
      content: string;
    }) => {
      const data = await fetchApi<{message: Message}>('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      return data.message;
    },
    onSuccess: (data, variables) => {
      // Optimistically update message list cache
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversation_id] });
    },
    onError: (err) => {
      toast({
        title: "Error sending message",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    }
  });

  return { 
    sendMessage: mutation.mutate, 
    sendMessageAsync: mutation.mutateAsync,
    loading: mutation.isPending, 
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null 
  };
}

// Hook for submitting a review with React Query
export function useApiSubmitReview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async (review: {
      tutor_id: string;
      student_id: string;
      rating: number;
      content?: string;
    }) => {
      const data = await fetchApi<{review: Review}>('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(review),
      });
      return data.review;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      
      // Invalidate tutor reviews cache
      queryClient.invalidateQueries({ queryKey: ['tutorReviews', variables.tutor_id] });
      // Also invalidate tutor profile since rating might change
      queryClient.invalidateQueries({ queryKey: ['tutor', variables.tutor_id] });
    },
    onError: (err) => {
      toast({
        title: "Error submitting review",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    }
  });

  return { 
    submitReview: mutation.mutate, 
    submitReviewAsync: mutation.mutateAsync,
    loading: mutation.isPending, 
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null 
  };
} 