// src/components/progress-link.tsx
"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import NProgress from 'nprogress'
import { MouseEvent, AnchorHTMLAttributes } from 'react'

interface ProgressLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
}

export function ProgressLink({ href, children, onClick, ...props }: ProgressLinkProps) {
  const router = useRouter()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Call any existing onClick handler
    if (onClick) {
      onClick(e)
    }

    // Don't do anything if it's a special click
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) {
      return
    }

    // Don't do anything if it's an external link
    if (href.startsWith('http') || href.startsWith('//')) {
      return
    }

    // Prevent default navigation
    e.preventDefault()

    // Start the progress bar
    NProgress.start()

    // Navigate
    router.push(href)
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}
