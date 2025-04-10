"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase-hooks";
import { db } from "@/lib/firebase-config";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/loading-spinner";
import { v4 as uuidv4 } from "uuid";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "regular" | "challenge";
  image?: string;
}

interface User {
  id: string;
  username: string;
}

export default function StoreItems() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, userData } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const itemsCollection = collection(db, "items");
        const itemsSnapshot = await getDocs(itemsCollection);
        const itemsList = itemsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as StoreItem[];

        setItems(itemsList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching items:", error);
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            username: doc.data().username,
          }))
          .filter((u) => u.id !== user?.uid); // Filter out current user

        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchItems();
    if (user) fetchUsers();
  }, [user]);

  const handlePurchase = async (item: StoreItem) => {
    if (!userData || !user) {
      toast({
        title: "Error",
        description: "User data not available",
        variant: "destructive",
      });
      return;
    }

    if (userData.balance < item.price) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough money to purchase this item",
        variant: "destructive",
      });
      return;
    }

    if (item.type === "challenge") {
      setSelectedItem(item);
    } else {
      try {
        // Regular item purchase logic
        const userRef = doc(db, "users", user.uid);

        // Update user balance and add to purchases
        await updateDoc(userRef, {
          balance: userData.balance - item.price,
          purchases: arrayUnion({
            itemId: item.id,
            itemName: item.name,
            price: item.price,
            purchasedAt: new Date(),
          }),
        });

        toast({
          title: "Purchase successful!",
          description: `You purchased ${item.name} for ${item.price} coins`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to complete purchase",
          variant: "destructive",
        });
      }
    }
  };

  const handleChallengeConfirm = async () => {
    if (!selectedItem || !selectedUser || !user || !userData) {
      toast({
        title: "Error",
        description: "Please select a user for the challenge",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get target user data
      const targetUserRef = doc(db, "users", selectedUser);
      const targetUserSnap = await getDoc(targetUserRef);

      if (!targetUserSnap.exists()) {
        toast({
          title: "Error",
          description: "Target user not found",
          variant: "destructive",
        });
        return;
      }

      const targetUserData = targetUserSnap.data();

      // Create challenge ID
      const challengeId = uuidv4();

      // Update sender's data
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - selectedItem.price,
        challenges: arrayUnion({
          challengeId,
          challengeName: selectedItem.name,
          otherUserId: selectedUser,
          otherUsername: targetUserData.username,
          status: "pending",
          isReceived: false,
          createdAt: new Date(),
          value: selectedItem.price,
        }),
      });

      // Update receiver's data
      await updateDoc(targetUserRef, {
        challenges: arrayUnion({
          challengeId,
          challengeName: selectedItem.name,
          otherUserId: user.uid,
          otherUsername: userData.username,
          status: "pending",
          isReceived: true,
          createdAt: new Date(),
          value: selectedItem.price,
        }),
      });

      toast({
        title: "Challenge sent!",
        description: `You sent a challenge to ${targetUserData.username}`,
      });

      setSelectedItem(null);
      setSelectedUser("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send challenge",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // If no items are found, show a message to create items
  if (items.length === 0) {
    return (
      <div className="text-center p-8 bg-card rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">No items available</h2>
        <p className="text-muted-foreground mb-6">
          You need to add items to the store first. Use the Firebase console to
          add items to the 'items' collection.
        </p>
        <div className="bg-muted p-4 rounded text-left mb-4">
          <p className="font-mono text-sm">
            Each item should have these fields:
          </p>
          <pre className="bg-background p-2 rounded mt-2 overflow-x-auto">
            {`{
  name: "Item Name",
  description: "Item Description",
  price: 100,
  type: "regular" or "challenge"
}`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Artículos Disponibles</h2>
        <div className="bg-card px-4 py-2 rounded-md">
          <span className="font-medium">Tu Saldo: </span>
          <span className="text-primary font-bold">
            {userData?.balance || 0} monedas
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
              <CardDescription>
                {item.type === "challenge"
                  ? "Artículo de Desafío"
                  : "Artículo Regular"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{item.description}</p>
              <p className="font-bold text-lg">{item.price} monedas</p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handlePurchase(item)}
                disabled={(userData?.balance ?? 0) < item.price}
                className="w-full"
              >
                Comprar
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar Usuario para el Desafío</DialogTitle>
            <DialogDescription>
              Elige un usuario para enviar el desafío "{selectedItem?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">Seleccionar Usuario</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleChallengeConfirm}>Enviar Desafío</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
