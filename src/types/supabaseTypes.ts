
// Custom type definitions for Supabase data
// These types complement the auto-generated types from Supabase

export interface TutorProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  subjects?: string;
  avatar_url?: string;
  age?: number;
  major?: string;
  current_education?: string;
  year?: string;
  previous_education?: string[];
  extracurriculars?: string[];
  gcse?: string[];
  "a-levels"?: string[];
  spm?: string;
  search_id: string;
}

export interface StudentProfile {
  id: string;
  first_name?: string;
  last_name?: string;
}

export interface Review {
  id: number;
  tutor_id?: string;
  student_id?: string;
  review?: string;
  rating?: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  is_tutor?: boolean;
  email_confirmed_at?: string;
  conversation?: string[];
}

export interface TutoringSession {
  id: string;
  tutor_id: string;
  student_id: string;
  name?: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  conversation_id: string;
  message_id: string;
  tutor_ready: boolean;
  student_ready: boolean;
  cancelled_at?: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

export interface ConversationParticipant {
  id: string;
  user_id: string;
  conversation_id?: string;
  last_viewed_at?: string;
}

export interface Message {
  id: string;
  content?: string;
  sender_id?: string;
  conversation_id?: string;
  created_at: string;
}
