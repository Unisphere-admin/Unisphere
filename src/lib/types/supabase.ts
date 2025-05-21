export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tutoring_session: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          conversation_id: string
          message_id: string
          tutor_id: string
          student_id: string
          status: 'requested' | 'accepted' | 'started' | 'ended' | 'cancelled'
          tutor_ready: boolean
          student_ready: boolean
          started_at: string | null
          ended_at: string | null
          scheduled_for: string | null
          name: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          conversation_id: string
          message_id: string
          tutor_id: string
          student_id: string
          status?: 'requested' | 'accepted' | 'started' | 'ended' | 'cancelled'
          tutor_ready?: boolean
          student_ready?: boolean
          started_at?: string | null
          ended_at?: string | null
          scheduled_for?: string | null
          name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          conversation_id?: string
          message_id?: string
          tutor_id?: string
          student_id?: string
          status?: 'requested' | 'accepted' | 'started' | 'ended' | 'cancelled'
          tutor_ready?: boolean
          student_ready?: boolean
          started_at?: string | null
          ended_at?: string | null
          scheduled_for?: string | null
          name?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          is_tutor: boolean
        }
        Insert: {
          id: string
          email: string
          is_tutor?: boolean
        }
        Update: {
          id?: string
          email?: string
          is_tutor?: boolean
        }
      }
      tutor_profile: {
        Row: {
          id: string
          first_name: string
          last_name: string
          description?: string
          subjects?: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          description?: string
          subjects?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          description?: string
          subjects?: string
        }
      }
      student_profile: {
        Row: {
          id: string
          first_name: string
          last_name: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
        }
      }
    }
  }
} 