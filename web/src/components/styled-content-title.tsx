// src/components/styled-content-title.tsx
"use client"

interface StyledContentTitleProps {
  title: string
  className?: string
  imageCountClassName?: string
  titleTextClassName?: string
}

export function StyledContentTitle({ 
  title, 
  className = "",
  imageCountClassName = "",
  titleTextClassName = ""
}: StyledContentTitleProps) {
  // Parse the title to extract image count and title text
  const match = title.match(/^\[(\d+)\s+IMAGES?\]\s*(.*)$/i)
  
  if (!match) {
    // If title doesn't match the format, just return it as is
    return <span className={className}>{title}</span>
  }
  
  const imageCount = match[1]
  const titleText = match[2] || ''
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Image count in red glass box - without brackets */}
      <span className={`
        px-3 py-1.5 
        bg-red-600/90 backdrop-blur-sm 
        text-white font-semibold 
        rounded-lg shadow-lg
        text-sm
        ${imageCountClassName}
      `}>
        {imageCount} IMAGES
      </span>
      
      {/* Title text */}
      <span className={`text-white font-medium ${titleTextClassName}`}>
        {titleText}
      </span>
    </div>
  )
}
