"use client"

import { useAppContext } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function UserProfile() {
  const { userData, loading } = useAppContext()

  if (loading || !userData) {
    return <div className="animate-pulse">Loading profile...</div>
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{userData.username}</CardTitle>
            {userData.isAdmin && (
              <Badge variant="outline" className="bg-primary text-primary-foreground">
                Admin
              </Badge>
            )}
          </div>
          <CardDescription>{userData.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-3xl font-bold text-primary">{userData.balance} coins</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="purchases">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="purchases">Purchase History</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Purchases</CardTitle>
              <CardDescription>History of items you've purchased</CardDescription>
            </CardHeader>
            <CardContent>
              {userData.purchases && userData.purchases.length > 0 ? (
                <ul className="space-y-2">
                  {userData.purchases.map((purchase, index) => (
                    <li key={index} className="flex justify-between items-center border-b pb-2">
                      <span>{purchase.itemName}</span>
                      <span className="text-muted-foreground">{purchase.price} coins</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No purchase history yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="challenges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Challenges</CardTitle>
              <CardDescription>Challenges you've received or sent</CardDescription>
            </CardHeader>
            <CardContent>
              {userData.challenges && userData.challenges.length > 0 ? (
                <ul className="space-y-4">
                  {userData.challenges.map((challenge, index) => (
                    <li key={index} className="border rounded-md p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{challenge.challengeName}</span>
                        <Badge variant={challenge.status === "pending" ? "outline" : "default"}>
                          {challenge.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {challenge.isReceived ? "From" : "To"}: {challenge.otherUsername}
                      </p>
                      {challenge.timeRemaining && (
                        <p className="text-sm font-medium mt-2">Time remaining: {challenge.timeRemaining}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No challenges yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

