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

    // Asegúrate de que estamos usando la ruta correcta para el documento del usuario
    const userRef = doc(db, "users", user.uid)

    const unsubscribe = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          console.log("User data found:", docSnapshot.data())
          setUserData(docSnapshot.data() as UserData)
        } else {
          console.log("No user data found for:", user.uid)
          setUserData(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching user data:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user])

  const signIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, username: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create user document in Firestore with initial data
    await setDoc(doc(db, "users", user.uid), {
      username,
      email,
      balance: 100, // Dar un saldo inicial
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

