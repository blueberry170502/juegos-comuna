"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { v4 as uuidv4 } from "uuid"

// Types
interface User {
  id: string
  username: string
  email: string
  balance: number
  isAdmin: boolean
  purchases: Purchase[]
  challenges: Challenge[]
}

interface Purchase {
  itemId: string
  itemName: string
  price: number
  purchasedAt: string
}

interface Challenge {
  challengeId: string
  challengeName: string
  otherUserId: string
  otherUsername: string
  status: "pending" | "completed" | "failed"
  isReceived: boolean
  timeRemaining?: string
}

interface StoreItem {
  id: string
  name: string
  description: string
  price: number
  type: "regular" | "challenge"
  image?: string
}

interface AppContextType {
  user: any | null
  userData: User | null
  allUsers: User[]
  storeItems: StoreItem[]
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => void
  updateUserBalance: (userId: string, newBalance: number) => void
  purchaseItem: (item: StoreItem) => void
  sendChallenge: (item: StoreItem, targetUserId: string) => void
  completeChallenge: (challengeId: string) => void
  failChallenge: (challengeId: string) => void
}

// Mock data
const mockStoreItems: StoreItem[] = [
  {
    id: "1",
    name: "Party Hat",
    description: "A colorful hat for the party",
    price: 50,
    type: "regular",
  },
  {
    id: "2",
    name: "Confetti Cannon",
    description: "Blast confetti all over the place",
    price: 100,
    type: "regular",
  },
  {
    id: "3",
    name: "Dance Challenge",
    description: "Challenge someone to dance for 30 seconds",
    price: 150,
    type: "challenge",
  },
  {
    id: "4",
    name: "Sing Challenge",
    description: "Challenge someone to sing a song",
    price: 200,
    type: "challenge",
  },
  {
    id: "5",
    name: "Truth or Dare",
    description: "Challenge someone to answer a truth or perform a dare",
    price: 250,
    type: "challenge",
  },
  {
    id: "6",
    name: "Drink Ticket",
    description: "Redeem for a drink at the party",
    price: 75,
    type: "regular",
  },
]

const mockUsers: User[] = [
  {
    id: "1",
    username: "admin",
    email: "admin@example.com",
    balance: 1000,
    isAdmin: true,
    purchases: [],
    challenges: [],
  },
  {
    id: "2",
    username: "user1",
    email: "user1@example.com",
    balance: 500,
    isAdmin: false,
    purchases: [
      {
        itemId: "1",
        itemName: "Party Hat",
        price: 50,
        purchasedAt: new Date().toISOString(),
      },
    ],
    challenges: [],
  },
  {
    id: "3",
    username: "user2",
    email: "user2@example.com",
    balance: 300,
    isAdmin: false,
    purchases: [],
    challenges: [],
  },
]

// Create context
const AppContext = createContext<AppContextType>({
  user: null,
  userData: null,
  allUsers: [],
  storeItems: [],
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: () => {},
  updateUserBalance: () => {},
  purchaseItem: () => {},
  sendChallenge: () => {},
  completeChallenge: () => {},
  failChallenge: () => {},
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>(mockUsers)
  const [storeItems, setStoreItems] = useState<StoreItem[]>(mockStoreItems)
  const [loading, setLoading] = useState(true)

  // Simulate auth loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const signIn = async (email: string, password: string) => {
    // Find user by email
    const user = allUsers.find((u) => u.email === email)

    if (!user) {
      throw new Error("User not found")
    }

    // In a real app, you'd verify the password here

    setUser({ uid: user.id, email: user.email })
    setUserData(user)
  }

  const signUp = async (email: string, password: string, username: string) => {
    // Check if email already exists
    if (allUsers.some((u) => u.email === email)) {
      throw new Error("Email already in use")
    }

    // Create new user
    const newUser: User = {
      id: uuidv4(),
      username,
      email,
      balance: 100, // Starting balance
      isAdmin: false,
      purchases: [],
      challenges: [],
    }

    setAllUsers([...allUsers, newUser])
    setUser({ uid: newUser.id, email: newUser.email })
    setUserData(newUser)
  }

  const signOut = () => {
    setUser(null)
    setUserData(null)
  }

  const updateUserBalance = (userId: string, newBalance: number) => {
    setAllUsers(allUsers.map((user) => (user.id === userId ? { ...user, balance: newBalance } : user)))

    if (userData && userData.id === userId) {
      setUserData({ ...userData, balance: newBalance })
    }
  }

  const purchaseItem = (item: StoreItem) => {
    if (!userData) return

    // Update user balance
    const newBalance = userData.balance - item.price

    // Add to purchases
    const newPurchase: Purchase = {
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      purchasedAt: new Date().toISOString(),
    }

    const updatedUserData = {
      ...userData,
      balance: newBalance,
      purchases: [...userData.purchases, newPurchase],
    }

    setUserData(updatedUserData)

    // Update in all users
    setAllUsers(allUsers.map((user) => (user.id === userData.id ? updatedUserData : user)))
  }

  const sendChallenge = (item: StoreItem, targetUserId: string) => {
    if (!userData) return

    // Find target user
    const targetUser = allUsers.find((u) => u.id === targetUserId)
    if (!targetUser) return

    // Create challenge
    const challengeId = uuidv4()

    // Add challenge to sender
    const senderChallenge: Challenge = {
      challengeId,
      challengeName: item.name,
      otherUserId: targetUserId,
      otherUsername: targetUser.username,
      status: "pending",
      isReceived: false,
    }

    // Add challenge to receiver
    const receiverChallenge: Challenge = {
      challengeId,
      challengeName: item.name,
      otherUserId: userData.id,
      otherUsername: userData.username,
      status: "pending",
      isReceived: true,
    }

    // Update sender
    const updatedUserData = {
      ...userData,
      balance: userData.balance - item.price,
      challenges: [...userData.challenges, senderChallenge],
    }

    setUserData(updatedUserData)

    // Update all users
    setAllUsers(
      allUsers.map((user) => {
        if (user.id === userData.id) {
          return updatedUserData
        } else if (user.id === targetUserId) {
          return {
            ...user,
            challenges: [...user.challenges, receiverChallenge],
          }
        }
        return user
      }),
    )
  }

  const completeChallenge = (challengeId: string) => {
    if (!userData) return

    // Find the challenge
    const challenge = userData.challenges.find((c) => c.challengeId === challengeId)
    if (!challenge) return

    // Update user's challenge
    const updatedUserData = {
      ...userData,
      challenges: userData.challenges.map((c) => (c.challengeId === challengeId ? { ...c, status: "completed" } : c)),
    }

    setUserData(updatedUserData)

    // Update all users
    setAllUsers(
      allUsers.map((user) => {
        if (user.id === userData.id) {
          return updatedUserData
        } else if (user.id === challenge.otherUserId) {
          // Update the other user's challenge too
          return {
            ...user,
            challenges: user.challenges.map((c) => (c.challengeId === challengeId ? { ...c, status: "completed" } : c)),
          }
        }
        return user
      }),
    )
  }

  const failChallenge = (challengeId: string) => {
    if (!userData) return

    // Find the challenge
    const challenge = userData.challenges.find((c) => c.challengeId === challengeId)
    if (!challenge) return

    // Update user's challenge and deduct balance
    const updatedUserData = {
      ...userData,
      balance: userData.balance - 10, // Penalty
      challenges: userData.challenges.map((c) => (c.challengeId === challengeId ? { ...c, status: "failed" } : c)),
    }

    setUserData(updatedUserData)

    // Update all users
    setAllUsers(
      allUsers.map((user) => {
        if (user.id === userData.id) {
          return updatedUserData
        } else if (user.id === challenge.otherUserId) {
          // Update the other user's challenge too
          return {
            ...user,
            challenges: user.challenges.map((c) => (c.challengeId === challengeId ? { ...c, status: "failed" } : c)),
          }
        }
        return user
      }),
    )
  }

  return (
    <AppContext.Provider
      value={{
        user,
        userData,
        allUsers,
        storeItems,
        loading,
        signIn,
        signUp,
        signOut,
        updateUserBalance,
        purchaseItem,
        sendChallenge,
        completeChallenge,
        failChallenge,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)

