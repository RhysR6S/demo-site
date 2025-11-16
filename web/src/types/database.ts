// src/types/database.ts
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
      series: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          name: string
          series_id: string | null
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          series_id?: string | null
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          series_id?: string | null
          slug?: string
          created_at?: string
        }
      }
      content_sets: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          image_count: number
          is_commission: boolean
          thumbnail_image_id: string | null
          r2_folder_key: string
          created_at: string
          scheduled_time: string | null
          published_at: string | null
          patreon_post_id: string | null
          patreon_posted_at: string | null
          view_count: number
          download_count: number
          tags: string[]
          generation_batch_id: string | null
          flagged_for_review: boolean
          like_count: number
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          image_count?: number
          is_commission?: boolean
          thumbnail_image_id?: string | null
          r2_folder_key: string
          created_at?: string
          scheduled_time?: string | null
          published_at?: string | null
          patreon_post_id?: string | null
          patreon_posted_at?: string | null
          view_count?: number
          download_count?: number
          tags?: string[]
          generation_batch_id?: string | null
          flagged_for_review?: boolean
          like_count?: number
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          image_count?: number
          is_commission?: boolean
          thumbnail_image_id?: string | null
          r2_folder_key?: string
          created_at?: string
          scheduled_time?: string | null
          published_at?: string | null
          patreon_post_id?: string | null
          patreon_posted_at?: string | null
          view_count?: number
          download_count?: number
          tags?: string[]
          generation_batch_id?: string | null
          flagged_for_review?: boolean
          like_count?: number
        }
      }
      images: {
        Row: {
          id: string
          set_id: string
          filename: string
          r2_key: string
          watermarked_r2_key: string | null
          thumbnail_r2_key: string | null
          order_index: number
          width: number | null
          height: number | null
          file_size_bytes: number | null
          mime_type: string
          prompt_tags: string[] | null
          generation_model: string | null
          created_at: string
        }
        Insert: {
          id?: string
          set_id: string
          filename: string
          r2_key: string
          watermarked_r2_key?: string | null
          thumbnail_r2_key?: string | null
          order_index: number
          width?: number | null
          height?: number | null
          file_size_bytes?: number | null
          mime_type?: string
          prompt_tags?: string[] | null
          generation_model?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          set_id?: string
          filename?: string
          r2_key?: string
          watermarked_r2_key?: string | null
          thumbnail_r2_key?: string | null
          order_index?: number
          width?: number | null
          height?: number | null
          file_size_bytes?: number | null
          mime_type?: string
          prompt_tags?: string[] | null
          generation_model?: string | null
          created_at?: string
        }
      }
      set_characters: {
        Row: {
          set_id: string
          character_id: string
          is_primary: boolean
        }
        Insert: {
          set_id: string
          character_id: string
          is_primary?: boolean
        }
        Update: {
          set_id?: string
          character_id?: string
          is_primary?: boolean
        }
      }
      commissions: {
        Row: {
          id: string
          user_id: string
          user_email: string
          user_name: string
          user_tier: string
          type: 'set' | 'custom'
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          is_free_tier: boolean
          request_data: Json
          notes: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          user_email: string
          user_name: string
          user_tier: string
          type: 'set' | 'custom'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          is_free_tier?: boolean
          request_data: Json
          notes?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          user_email?: string
          user_name?: string
          user_tier?: string
          type?: 'set' | 'custom'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          is_free_tier?: boolean
          request_data?: Json
          notes?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      user_activity: {
        Row: {
          id: string
          user_id: string
          set_id: string | null
          image_id: string | null
          action: 'view_set' | 'view_image' | 'download'
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          set_id?: string | null
          image_id?: string | null
          action: 'view_set' | 'view_image' | 'download'
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          set_id?: string | null
          image_id?: string | null
          action?: 'view_set' | 'view_image' | 'download'
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      user_set_views: {
        Row: {
          id: string
          user_id: string
          set_id: string
          first_viewed_at: string
          last_viewed_at: string
          view_count: number
        }
        Insert: {
          id?: string
          user_id: string
          set_id: string
          first_viewed_at?: string
          last_viewed_at?: string
          view_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          set_id?: string
          first_viewed_at?: string
          last_viewed_at?: string
          view_count?: number
        }
      }
      user_set_downloads: {
        Row: {
          id: string
          user_id: string
          set_id: string
          downloaded_at: string
          download_count: number
          marked_as_downloaded: boolean
        }
        Insert: {
          id?: string
          user_id: string
          set_id: string
          downloaded_at?: string
          download_count?: number
          marked_as_downloaded?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          set_id?: string
          downloaded_at?: string
          download_count?: number
          marked_as_downloaded?: boolean
        }
      }
      studio_schedule: {
        Row: {
          id: string
          scheduled_date: string
          time_slot: string
          set_id: string | null
          status: 'empty' | 'uploading' | 'scheduled' | 'live' | 'posted'
          patreon_posted_at: string | null
        }
        Insert: {
          id?: string
          scheduled_date: string
          time_slot: string
          set_id?: string | null
          status?: 'empty' | 'uploading' | 'scheduled' | 'live' | 'posted'
          patreon_posted_at?: string | null
        }
        Update: {
          id?: string
          scheduled_date?: string
          time_slot?: string
          set_id?: string | null
          status?: 'empty' | 'uploading' | 'scheduled' | 'live' | 'posted'
          patreon_posted_at?: string | null
        }
      }
      content_likes: {
        Row: {
          id: string
          user_id: string
          set_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          set_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          set_id?: string
          created_at?: string
        }
      }
      content_comments: {
        Row: {
          id: string
          user_id: string
          user_name: string
          user_email: string
          set_id: string
          comment: string
          created_at: string
          updated_at: string
          is_deleted: boolean
        }
        Insert: {
          id?: string
          user_id: string
          user_name: string
          user_email: string
          set_id: string
          comment: string
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          user_name?: string
          user_email?: string
          set_id?: string
          comment?: string
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
      }
      creator_profile: {
        Row: {
          id: string
          user_id: string
          display_name: string
          profile_picture_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name: string
          profile_picture_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string
          profile_picture_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      creator_watermark_settings: {
        Row: {
          id: string
          creator_id: string
          watermark_type: 'text' | 'image'
          watermark_image_r2_key: string | null
          position: 'corner' | 'center' | 'diagonal' | 'custom'
          opacity: number
          scale: number
          enabled: boolean
          offset_x: number | null
          offset_y: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          watermark_type?: 'text' | 'image'
          watermark_image_r2_key?: string | null
          position?: 'corner' | 'center' | 'diagonal' | 'custom'
          opacity?: number
          scale?: number
          enabled?: boolean
          offset_x?: number | null
          offset_y?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          watermark_type?: 'text' | 'image'
          watermark_image_r2_key?: string | null
          position?: 'corner' | 'center' | 'diagonal' | 'custom'
          opacity?: number
          scale?: number
          enabled?: boolean
          offset_x?: number | null
          offset_y?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      cache: {
        Row: {
          key: string
          value: Json
          expires_at: string
        }
        Insert: {
          key: string
          value: Json
          expires_at: string
        }
        Update: {
          key?: string
          value?: Json
          expires_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment: {
        Args: {
          table_name: string
          row_id: string
          column_name: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types for common operations
export type ContentSet = Database['public']['Tables']['content_sets']['Row']
export type ContentSetInsert = Database['public']['Tables']['content_sets']['Insert']
export type ContentSetUpdate = Database['public']['Tables']['content_sets']['Update']

export type Image = Database['public']['Tables']['images']['Row']
export type Character = Database['public']['Tables']['characters']['Row']
export type Series = Database['public']['Tables']['series']['Row']

export type UserActivity = Database['public']['Tables']['user_activity']['Row']
export type UserSetView = Database['public']['Tables']['user_set_views']['Row']
export type UserSetDownload = Database['public']['Tables']['user_set_downloads']['Row']
export type StudioSchedule = Database['public']['Tables']['studio_schedule']['Row']
export type ContentLike = Database['public']['Tables']['content_likes']['Row']
export type ContentComment = Database['public']['Tables']['content_comments']['Row']
export type Cache = Database['public']['Tables']['cache']['Row']

export type CreatorProfile = Database['public']['Tables']['creator_profile']['Row']
export type CreatorProfileInsert = Database['public']['Tables']['creator_profile']['Insert']
export type CreatorProfileUpdate = Database['public']['Tables']['creator_profile']['Update']

export type Commission = Database['public']['Tables']['commissions']['Row']
export type CommissionInsert = Database['public']['Tables']['commissions']['Insert']
export type CommissionUpdate = Database['public']['Tables']['commissions']['Update']

// Community/DM Types
export interface Channel {
  id: string
  name: string
  emoji: string
  description: string | null
  min_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  allow_member_posts: boolean
  is_default: boolean
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  position: number
}

export interface ChannelMessage {
  id: string
  channel_id: string
  user_id: string
  user_name: string
  user_tier: string
  content: string
  is_pinned: boolean
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

export interface DMConversation {
  id: string
  member_id: string
  member_name: string
  member_email: string
  member_tier: string
  last_message_at: string | null
  is_pinned: boolean
  creator_last_read_at: string | null
  created_at: string
}

export interface DMMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  sender_role: 'member' | 'creator'
  content: string
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

export interface ChannelReadStatus {
  user_id: string
  channel_id: string
  last_read_at: string
}

// Joined types for common queries
export interface ContentSetWithRelations extends ContentSet {
  images?: Image[]
  characters?: (Character & { series?: Series })[]
  thumbnail?: Image
}

export interface CharacterWithSeries extends Character {
  series: Series
}