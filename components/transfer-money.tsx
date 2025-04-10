"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase-hooks";
import { db } from "@/lib/firebase-config";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  deleteDoc,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

interface User {
  id: string;
  username: string;
}

interface Transfer {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  amount: number;
  timestamp: any;
}

export default function TransferMoney() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;

      try {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);

        const usersList = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            username: doc.data().username,
          }))
          .filter((u) => u.id !== user.uid); // Filter out current user

        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const fetchTransfers = async () => {
      if (!user) return;

      try {
        const transfersCollection = collection(db, "transfers");
        const transfersSnapshot = await getDocs(transfersCollection);

        const transfersList: Transfer[] = [];

        transfersSnapshot.forEach((doc) => {
          const transferData = doc.data() as Transfer;
          transferData.id = doc.id;

          // Only include transfers where the current user is involved
          if (
            transferData.fromUserId === user.uid ||
            transferData.toUserId === user.uid
          ) {
            transfersList.push(transferData);
          }
        });

        // Sort by timestamp (newest first)
        transfersList.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp.seconds - a.timestamp.seconds;
        });

        setTransfers(transfersList);
      } catch (error) {
        console.error("Error fetching transfers:", error);
      }
    };

    fetchUsers();
    fetchTransfers();
  }, [user]);

  const handleTransfer = async () => {
    if (!userData || !user) {
      toast({
        title: "Error",
        description: "You must be logged in to transfer money",
        variant: "destructive",
      });
      return;
    }

    const transferAmount = Number.parseInt(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid transfer amount",
        variant: "destructive",
      });
      return;
    }

    if (transferAmount > userData.balance) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough coins for this transfer",
        variant: "destructive",
      });
      return;
    }

    if (!selectedUser) {
      toast({
        title: "No recipient selected",
        description: "Please select a user to transfer to",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get recipient user data
      const recipientRef = doc(db, "users", selectedUser);
      const recipientDoc = await getDoc(recipientRef);

      if (!recipientDoc.exists()) {
        toast({
          title: "User not found",
          description: "The selected recipient does not exist",
          variant: "destructive",
        });
        return;
      }

      const recipientData = recipientDoc.data();

      // Update sender balance
      const senderRef = doc(db, "users", user.uid);
      await updateDoc(senderRef, {
        balance: userData.balance - transferAmount,
      });

      // Update recipient balance
      await updateDoc(recipientRef, {
        balance: (recipientData.balance || 0) + transferAmount,
      });

      // Record the transfer
      await addDoc(collection(db, "transfers"), {
        fromUserId: user.uid,
        fromUsername: userData.username,
        toUserId: selectedUser,
        toUsername: recipientData.username,
        amount: transferAmount,
        timestamp: serverTimestamp(),
      });

      toast({
        title: "Transfer successful!",
        description: `You sent ${transferAmount} coins to ${recipientData.username}`,
      });

      // Reset form
      setAmount("");
      setSelectedUser("");

      // Refresh transfers
      const transfersCollection = collection(db, "transfers");
      const transfersSnapshot = await getDocs(transfersCollection);

      const transfersList: Transfer[] = [];

      transfersSnapshot.forEach((doc) => {
        const transferData = doc.data() as Transfer;
        transferData.id = doc.id;

        // Only include transfers where the current user is involved
        if (
          transferData.fromUserId === user.uid ||
          transferData.toUserId === user.uid
        ) {
          transfersList.push(transferData);
        }
      });

      // Sort by timestamp (newest first)
      transfersList.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.seconds - a.timestamp.seconds;
      });

      if (transfersList.length > 5) {
        const excessTransfers = transfersList.slice(5);

        for (const transfer of excessTransfers) {
          const transferRef = doc(db, "transfers", transfer.id);
          await deleteDoc(transferRef);
        }

        transfersList.splice(5);
      }

      setTransfers(transfersList);
    } catch (error) {
      console.error("Error transferring money:", error);
      toast({
        title: "Error",
        description: "Failed to transfer money. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Transferir Monedas</CardTitle>
            <CardDescription>Envía monedas a otro jugador</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recipient">Destinatario</Label>
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

            <div className="space-y-2">
              <Label htmlFor="amount">Cantidad</Label>
              <div className="flex space-x-2">
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ingresa la cantidad"
                />
                <Button
                  onClick={handleTransfer}
                  disabled={loading || !selectedUser || !amount}
                >
                  Transferir
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Tu saldo:{" "}
              <span className="font-bold">{userData?.balance || 0}</span>{" "}
              monedas
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Transferencias</CardTitle>
            <CardDescription>Transferencias recientes</CardDescription>
          </CardHeader>
          <CardContent>
            {transfers.length > 0 ? (
              <ul className="space-y-4">
                {transfers.map((transfer) => {
                  const isSender = transfer.fromUserId === user?.uid;

                  return (
                    <li key={transfer.id} className="border-b pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isSender
                                ? "bg-red-100 text-red-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            <ArrowRight
                              className={`h-4 w-4 ${
                                isSender ? "" : "rotate-180"
                              }`}
                            />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium">
                              {isSender
                                ? `Para: ${transfer.toUsername}`
                                : `De: ${transfer.fromUsername}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {transfer.timestamp
                                ? new Date(
                                    transfer.timestamp.seconds * 1000
                                  ).toLocaleString()
                                : "Procesando..."}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`font-medium ${
                            isSender ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {isSender ? "-" : "+"}
                          {transfer.amount} monedas
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no hay historial de transferencias
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
