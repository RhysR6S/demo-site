// src/components/user-avatar.tsx

import { Session } from 'next-auth'

interface UserAvatarProps {
  user: Session['user'] | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-lg'
  }

  const isCreator = user?.isCreator
  const displayName = isCreator && user.creatorProfile?.displayName 
    ? user.creatorProfile.displayName 
    : user?.name || 'User'
  
  const profilePicture = isCreator ? user.creatorProfile?.profilePictureUrl : null

  if (profilePicture) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden ${className}`}>
        <img
          src={profilePicture}
          alt={displayName}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            target.nextElementSibling?.classList.remove('hidden')
          }}
        />
        <div className="hidden w-full h-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
          <span className="text-white font-bold">
            {displayName[0]?.toUpperCase() || '?'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center ${className}`}>
      <span className="text-white font-bold">
        {displayName[0]?.toUpperCase() || '?'}
      </span>
    </div>
  )
}
