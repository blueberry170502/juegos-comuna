"use client"

import { useState, useEffect } from "react"
import { useFirebaseContext } from "./firebase-provider"
import { auth, db } from "./firebase-config"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as authSignOut } from "firebase/auth"
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore"

interface UserData {
  username: string
  email: string
  balance: number
  isAdmin: boolean
  createdAt: any
  purchases?: Array<{
    itemId: string
    itemName: string
    price: number
    purchasedAt: any
  }>
  challenges?: Array<{
    challengeId: string
    challengeName: string
    otherUserId: string
    otherUsername: string
    status: "pending" | "completed" | "failed"
    isReceived: boolean
    timeRemaining?: string
  }>
}

export function useAuth() {
  const { user, loading: authLoading } = useFirebaseContext()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setUserData(null)
      setLoading(false)
      return
    }

    const userRef = doc(db, "users", user.uid)
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data() as UserData)
      } else {
        setUserData(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const signIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, username: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      username,
      email,
      balance: 0,
      isAdmin: false,
      createdAt: serverTimestamp(),
      purchases: [],
      challenges: [],
    })

    return userCredential
  }

  const signOut = async () => {
    return authSignOut(auth)
  }

  return {
    user,
    userData,
    loading: authLoading || loading,
    signIn,
    signUp,
    signOut,
  }
}

