"use client"

import type React from "react"

import { useAppContext } from "@/lib/app-context"

export default function AdminCheck({
  children,
}: {
  children: React.ReactNode
}) {
  const { userData, loading } = useAppContext()

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!userData?.isAdmin) {
    return (
      <div className="bg-card p-8 rounded-lg shadow text-center">
        <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
        <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
      </div>
    )
  }

  return <>{children}</>
}

