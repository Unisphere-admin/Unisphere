// Custom type definitions for Supabase data
// These types complement the auto-generated types from Supabase

export interface TutorProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  description?: string | null;
  subjects?: string | null;
  avatar_url?: string | null;
  age?: number | null;
  major?: string | null;
  current_education?: string | null;
  year?: string | null;
  previous_education?: string[] | null;
  extracurriculars?: string[] | null;
  gcse?: string[] | null;
  "a-levels"?: string[] | null;
  spm?: string[] | string | null;
  ib?: string[] | null;
  search_id: string;
  service_costs?: Record<string, number> | null;
}

export interface StudentProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface Review {
  id: number;
  tutor_id?: string | null;
  student_id?: string | null;
  review?: string | null;
  rating?: number | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  is_tutor?: boolean | null;
  email_confirmed_at?: string | null;
  conversation?: string[] | null;
}

export interface TutoringSession {
  id: string;
  tutor_id: string;
  student_id: string;
  name?: string | null;
  status: string;
  started_at?: string | null;
  ended_at?: string | null;
  scheduled_for?: string | null;
  created_at: string;
  updated_at: string;
  conversation_id: string;
  message_id?: string | null;
  tutor_ready: boolean;
  student_ready: boolean;
  cancelled_at?: string | null;
  cost?: number | null;
  display_order?: string | null;
}

export interface Conversation {
  id: string;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
}

export interface ConversationParticipant {
  id: string;
  user_id: string;
  conversation_id?: string | null;
  last_viewed_at?: string | null;
}

export interface Message {
  id: string;
  content?: string | null;
  sender_id?: string | null;
  conversation_id?: string | null;
  created_at: string;
}
