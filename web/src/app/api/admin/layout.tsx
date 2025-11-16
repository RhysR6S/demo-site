// src/app/admin/layout.tsx
"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  // More aggressive auth check that runs on every render
  useEffect(() => {
    // Always check, don't wait for loading to complete
    if (status !== "loading" && (!session || !session.user?.isCreator)) {
      }