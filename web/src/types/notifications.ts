// File: src/types/notifications.ts

export interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  link?: string
  created_at: string
  read: boolean
  metadata?: NotificationMetadata
}

export type NotificationType = 'like' | 'comment' | 'new_member' | 'commission' | 'dm'

export interface NotificationMetadata {
  userNames?: string[]
  postTitle?: string
  userName?: string
  additionalCount?: number
  setId?: string
  conversationId?: string
  commissionId?: string
}

export interface NotificationResponse {
  notifications: Notification[]
  unreadCount: number
}

export interface NotificationPreferences {
  likes: boolean
  comments: boolean
  newMembers: boolean
  commissions: boolean
  directMessages: boolean
  emailDigest: 'never' | 'daily' | 'weekly'
}

// Helper type for grouping notifications
export interface GroupedNotification extends Notification {
  groupedItems?: Notification[]
}

// For future database implementation
export interface DBNotification {
  id: string
  creator_id: string
  type: NotificationType
  title: string
  description: string | null
  link: string | null
  metadata: Record<string, any>
  read: boolean
  created_at: string
  read_at: string | null
}

// Notification action types
export type NotificationAction = 
  | { type: 'LOAD_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'UPDATE_UNREAD_COUNT'; payload: number }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
