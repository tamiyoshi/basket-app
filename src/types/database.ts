export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          role: "user" | "admin";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          role?: "user" | "admin";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          role?: "user" | "admin";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courts: {
        Row: {
          id: string;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          is_free: boolean;
          hoop_count: number | null;
          surface: string | null;
          notes: string | null;
          opening_hours: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          is_free: boolean;
          hoop_count?: number | null;
          surface?: string | null;
          notes?: string | null;
          opening_hours?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          is_free?: boolean;
          hoop_count?: number | null;
          surface?: string | null;
          notes?: string | null;
          opening_hours?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courts_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      court_photos: {
        Row: {
          id: string;
          court_id: string;
          storage_path: string;
          created_at: string;
          uploaded_by: string;
        };
        Insert: {
          id?: string;
          court_id: string;
          storage_path: string;
          created_at?: string;
          uploaded_by: string;
        };
        Update: {
          id?: string;
          court_id?: string;
          storage_path?: string;
          created_at?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "court_photos_court_id_fkey";
            columns: ["court_id"];
            referencedRelation: "courts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "court_photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      reviews: {
        Row: {
          id: string;
          court_id: string;
          author_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          court_id: string;
          author_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          court_id?: string;
          author_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_court_id_fkey";
            columns: ["court_id"];
            referencedRelation: "courts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "user" | "admin";
    };
    CompositeTypes: Record<string, never>;
  };
};
