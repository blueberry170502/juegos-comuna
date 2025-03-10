"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { auth } from "./firebase-config"
import { onAuthStateChanged } from "firebase/auth"

interface FirebaseContextType {
  user: any | null
  loading: boolean
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
})

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return <FirebaseContext.Provider value={{ user, loading }}>{children}</FirebaseContext.Provider>
}

export const useFirebaseContext = () => useContext(FirebaseContext)

