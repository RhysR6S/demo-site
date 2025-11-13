// src/types/community.ts

export type TierLevel = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Channel {
  id: string
  name: string
  emoji: string
  description: string | null
  min_tier: TierLevel
  allow_member_posts: boolean
  is_default: boolean
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  position: number
  // Client-side additions
  has_unread?: boolean
  latest_message_at?: string | null
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
  // Client-side additions
  has_unread?: boolean
  latest_message?: {
    content: string
    created_at: string
  }
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

export interface CreatorProfile {
  display_name: string
  profile_picture_url: string | null
  bio: string | null
}

// API Response Types
export interface ChannelsResponse {
  channels: Channel[]
}

export interface MessagesResponse {
  messages: ChannelMessage[] | DMMessage[]
}

export interface ConversationsResponse {
  conversations?: DMConversation[]
  conversation?: DMConversation
}

// Form Data Types
export interface CreateChannelData {
  name: string
  emoji: string
  description: string
  min_tier: TierLevel
  allow_member_posts: boolean
  position?: number
}

export interface UpdateChannelData extends Partial<CreateChannelData> {
  id: string
}

export interface SendMessageData {
  content: string
}

// UI State Types
export type ViewType = 'channels' | 'dms'
export type SortOrder = 'pinned' | 'newest' | 'unread'

export interface CommunityUser {
  id: string
  name: string
  tier: string
  isCreator?: boolean
}
