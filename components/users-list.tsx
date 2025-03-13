"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, doc, updateDoc, query, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Plus, Minus } from "lucide-react"
import LoadingSpinner from "@/components/loading-spinner"

interface User {
  id: string
  username: string
  email: string
  balance: number
  isAdmin: boolean
}

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const { toast } = useToast()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log("Fetching users...")
        setLoading(true)
        setError(null)

        const usersCollection = collection(db, "users")
        const usersQuery = query(usersCollection, limit(50)) // Limitar a 50 usuarios para evitar problemas de rendimiento
        const usersSnapshot = await getDocs(usersQuery)

        if (usersSnapshot.empty) {
          console.log("No users found")
          setUsers([])
          setLoading(false)
          return
        }

        console.log(`Found ${usersSnapshot.docs.length} users`)

        const usersList = usersSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            username: data.username || "Unknown",
            email: data.email || "No email",
            balance: data.balance || 0,
            isAdmin: data.isAdmin || false,
          }
        })

        setUsers(usersList)

        // Initialize amounts object
        const initialAmounts: Record<string, number> = {}
        usersList.forEach((user) => {
          initialAmounts[user.id] = 0
        })
        setAmounts(initialAmounts)
      } catch (error) {
        console.error("Error fetching users:", error)
        setError("Failed to load users. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleAmountChange = (userId: string, value: string) => {
    const numValue = Number.parseInt(value) || 0
    setAmounts({
      ...amounts,
      [userId]: numValue,
    })
  }

  const handleAddFunds = async (userId: string) => {
    if (!amounts[userId]) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    try {
      const userRef = doc(db, "users", userId)
      const user = users.find((u) => u.id === userId)

      if (!user) return

      await updateDoc(userRef, {
        balance: user.balance + amounts[userId],
      })

      // Update local state
      setUsers(users.map((u) => (u.id === userId ? { ...u, balance: u.balance + amounts[userId] } : u)))

      setAmounts({
        ...amounts,
        [userId]: 0,
      })

      toast({
        title: "Funds added",
        description: `Added ${amounts[userId]} coins to ${user.username}'s balance`,
      })
    } catch (error) {
      console.error("Error adding funds:", error)
      toast({
        title: "Error",
        description: "Failed to add funds. Check console for details.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveFunds = async (userId: string) => {
    if (!amounts[userId]) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    try {
      const userRef = doc(db, "users", userId)
      const user = users.find((u) => u.id === userId)

      if (!user) return

      if (user.balance < amounts[userId]) {
        toast({
          title: "Insufficient balance",
          description: `User only has ${user.balance} coins`,
          variant: "destructive",
        })
        return
      }

      await updateDoc(userRef, {
        balance: user.balance - amounts[userId],
      })

      // Update local state
      setUsers(users.map((u) => (u.id === userId ? { ...u, balance: u.balance - amounts[userId] } : u)))

      setAmounts({
        ...amounts,
        [userId]: 0,
      })

      toast({
        title: "Funds removed",
        description: `Removed ${amounts[userId]} coins from ${user.username}'s balance`,
      })
    } catch (error) {
      console.error("Error removing funds:", error)
      toast({
        title: "Error",
        description: "Failed to remove funds. Check console for details.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-card rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Error</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8 bg-card rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">No users found</h2>
        <p className="text-muted-foreground">Create an account first to see users here.</p>
        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm">Debug info:</p>
          <p className="text-xs text-muted-foreground mt-1">
            Make sure your Firestore security rules allow reading the users collection.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Users ({users.length})</h2>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>

      {users.map((user) => (
        <Card key={user.id}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{user.username}</span>
              <span className="text-primary">{user.balance} coins</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={amounts[user.id] || ""}
                  onChange={(e) => handleAmountChange(user.id, e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => handleAddFunds(user.id)}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleRemoveFunds(user.id)}>
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

