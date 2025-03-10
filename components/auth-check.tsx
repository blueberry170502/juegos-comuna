"use client"

import type React from "react"

import { useAuth } from "@/lib/firebase-hooks"

export default function AuthCheck({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return user ? <>{children}</> : <>{fallback}</>
}

