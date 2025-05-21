export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      conversation: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participant: {
        Row: {
          conversation_id: string | null
          id: string
          last_viewed_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          last_viewed_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          id?: string
          last_viewed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participant_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participant_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string
          id: string
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: number
          rating: number | null
          review: string | null
          student_id: string | null
          tutor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          rating?: number | null
          review?: string | null
          student_id?: string | null
          tutor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          rating?: number | null
          review?: string | null
          student_id?: string | null
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profile: {
        Row: {
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Update: {
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profile_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_profile: {
        Row: {
          "a-levels": string[] | null
          age: number | null
          avatar_url: string | null
          current_education: string | null
          description: string | null
          extracurriculars: string[] | null
          first_name: string | null
          gcse: string[] | null
          id: string
          last_name: string | null
          major: string | null
          previous_education: string[] | null
          search_id: string
          spm: string | null
          subjects: string | null
          year: string | null
        }
        Insert: {
          "a-levels"?: string[] | null
          age?: number | null
          avatar_url?: string | null
          current_education?: string | null
          description?: string | null
          extracurriculars?: string[] | null
          first_name?: string | null
          gcse?: string[] | null
          id?: string
          last_name?: string | null
          major?: string | null
          previous_education?: string[] | null
          search_id?: string
          spm?: string | null
          subjects?: string | null
          year?: string | null
        }
        Update: {
          "a-levels"?: string[] | null
          age?: number | null
          avatar_url?: string | null
          current_education?: string | null
          description?: string | null
          extracurriculars?: string[] | null
          first_name?: string | null
          gcse?: string[] | null
          id?: string
          last_name?: string | null
          major?: string | null
          previous_education?: string[] | null
          search_id?: string
          spm?: string | null
          subjects?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_session: {
        Row: {
          cancelled_at: string | null
          conversation_id: string
          created_at: string
          ended_at: string | null
          id: string
          message_id: string
          name: string | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          student_id: string
          student_ready: boolean
          tutor_id: string
          tutor_ready: boolean
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          conversation_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          message_id: string
          name?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          student_id: string
          student_ready?: boolean
          tutor_id: string
          tutor_ready?: boolean
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          conversation_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          message_id?: string
          name?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          student_id?: string
          student_ready?: boolean
          tutor_id?: string
          tutor_ready?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_session_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutoring_session_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "message"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutoring_session_student_id_fkey1"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutoring_session_tutor_id_fkey1"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          conversation: string[] | null
          email: string
          email_confirmed_at: string | null
          id: string
          is_tutor: boolean | null
        }
        Insert: {
          conversation?: string[] | null
          email?: string
          email_confirmed_at?: string | null
          id?: string
          is_tutor?: boolean | null
        }
        Update: {
          conversation?: string[] | null
          email?: string
          email_confirmed_at?: string | null
          id?: string
          is_tutor?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
