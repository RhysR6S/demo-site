// src/components/loading-skeleton.tsx
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-800/50",
        className
      )}
    />
  )
}

export function ContentCardSkeleton() {
  return (
    <div className="bg-slate-900/50 rounded-xl overflow-hidden border border-zinc-800">
      <Skeleton className="aspect-[3/4]" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  )
}

export function ThumbnailSkeleton() {
  return <Skeleton className="aspect-[3/4] rounded-lg" />
}