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
  addDoc,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// First, update the StoreItem interface to include the optional stock attribute and new item types
interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "regular" | "challenge" | "blocker" | "custom-challenge";
  image?: string;
  stock?: number; // Optional stock attribute for regular items
}

interface User {
  id: string;
  username: string;
}

// Update the component to group items by type and handle stock
export default function StoreItems() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [customChallengeTitle, setCustomChallengeTitle] = useState("");
  const [customChallengeDescription, setCustomChallengeDescription] =
    useState("");
  const [activeTab, setActiveTab] = useState<
    "regular" | "challenge" | "blocker" | "custom-challenge"
  >("regular");
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

    // Check if item is in stock for regular items
    if (
      item.type === "regular" &&
      item.stock !== undefined &&
      item.stock <= 0
    ) {
      toast({
        title: "Out of stock",
        description: "This item is currently out of stock",
        variant: "destructive",
      });
      return;
    }

    if (item.type === "challenge") {
      setSelectedItem(item);
    } else if (item.type === "custom-challenge") {
      setSelectedItem(item);
    } else if (item.type === "blocker") {
      // Purchase blocker item
      try {
        const userRef = doc(db, "users", user.uid);

        // Update user balance and add to purchases
        await updateDoc(userRef, {
          balance: userData.balance - item.price,
          blockers: arrayUnion({
            itemId: item.id,
            itemName: item.name,
            price: item.price,
            purchasedAt: new Date(),
          }),
        });

        // Update item stock if it has stock
        if (item.stock !== undefined) {
          const itemRef = doc(db, "items", item.id);
          await updateDoc(itemRef, {
            stock: item.stock - 1,
          });

          // Update local state
          setItems(
            items.map((i) =>
              i.id === item.id ? { ...i, stock: (i.stock || 0) - 1 } : i
            )
          );
        }

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
    } else {
      // Regular item purchase logic
      try {
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

        // Update item stock if it has stock
        if (item.type === "regular" && item.stock !== undefined) {
          const itemRef = doc(db, "items", item.id);
          await updateDoc(itemRef, {
            stock: item.stock - 1,
          });

          // Update local state
          setItems(
            items.map((i) =>
              i.id === item.id ? { ...i, stock: (i.stock || 0) - 1 } : i
            )
          );
        }

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

      // Create challenge name and description
      // Si es un desafío personalizado existente (con ID), usar su nombre y descripción
      // Si es un nuevo desafío personalizado (sin ID), usar los valores de los campos
      const challengeName =
        selectedItem.type === "custom-challenge" && !selectedItem.id
          ? customChallengeTitle
          : selectedItem.name;

      const challengeDescription =
        selectedItem.type === "custom-challenge" && !selectedItem.id
          ? customChallengeDescription
          : selectedItem.description;

      // Create challenge for the sender
      const senderChallenge = {
        challengeId,
        challengeName,
        challengeDescription,
        otherUserId: selectedUser,
        otherUsername: targetUserData.username,
        status: "pending",
        isReceived: false,
        createdAt: new Date(),
        value: selectedItem.price,
      };

      // Create challenge for the receiver
      const receiverChallenge = {
        challengeId,
        challengeName,
        challengeDescription,
        otherUserId: user.uid,
        otherUsername: userData.username,
        status: "pending",
        isReceived: true,
        createdAt: new Date(),
        value: selectedItem.price,
      };

      // Si es un desafío personalizado existente, incrementar su contador de uso
      if (selectedItem.type === "custom-challenge" && selectedItem.id) {
        const itemRef = doc(db, "items", selectedItem.id);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          const itemData = itemSnap.data();
          await updateDoc(itemRef, {
            timesUsed: (itemData.timesUsed || 0) + 1,
          });
        }
      }

      // Update in Firestore for the sender
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - selectedItem.price,
        challenges: arrayUnion(senderChallenge),
      });

      // Update in Firestore for the receiver
      const targetUserRef2 = doc(db, "users", selectedUser);
      await updateDoc(targetUserRef2, {
        challenges: arrayUnion(receiverChallenge),
      });

      toast({
        title: "Challenge sent!",
        description: `You sent a challenge to ${targetUserData.username}`,
      });

      setSelectedItem(null);
      setSelectedUser("");
      setCustomChallengeTitle("");
      setCustomChallengeDescription("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send challenge",
        variant: "destructive",
      });
    }
  };

  const handleCreateCustomChallenge = async () => {
    if (
      !userData ||
      !user ||
      !selectedUser ||
      !customChallengeTitle ||
      !customChallengeDescription
    ) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (userData.balance < 1000) {
      toast({
        title: "Saldo insuficiente",
        description:
          "Necesitas 1000 monedas para crear un desafío personalizado",
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
          description: "Usuario objetivo no encontrado",
          variant: "destructive",
        });
        return;
      }

      const targetUserData = targetUserSnap.data();

      // Create challenge ID
      const challengeId = uuidv4();

      // Create challenge for the sender
      const senderChallenge = {
        challengeId,
        challengeName: customChallengeTitle,
        challengeDescription: customChallengeDescription,
        otherUserId: selectedUser,
        otherUsername: targetUserData.username,
        status: "pending",
        isReceived: false,
        createdAt: new Date(),
        value: 1000,
      };

      // Create challenge for the receiver
      const receiverChallenge = {
        challengeId,
        challengeName: customChallengeTitle,
        challengeDescription: customChallengeDescription,
        otherUserId: user.uid,
        otherUsername: userData.username,
        status: "pending",
        isReceived: true,
        createdAt: new Date(),
        value: 1000,
      };

      // Save the custom challenge to the items collection for reuse
      await addDoc(collection(db, "items"), {
        name: customChallengeTitle,
        description: customChallengeDescription,
        price: 1000,
        type: "custom-challenge",
        createdBy: user.uid,
        createdAt: new Date(),
        timesUsed: 1,
      });

      // Update in Firestore for the sender
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - 1000,
        challenges: arrayUnion(senderChallenge),
      });

      // Update in Firestore for the receiver
      const targetUserRef2 = doc(db, "users", selectedUser);
      await updateDoc(targetUserRef2, {
        challenges: arrayUnion(receiverChallenge),
      });

      toast({
        title: "¡Desafío creado y enviado!",
        description: `Has enviado un desafío personalizado a ${targetUserData.username}`,
      });

      // Reset form
      setSelectedUser("");
      setCustomChallengeTitle("");
      setCustomChallengeDescription("");

      // Refresh items list to show the new custom challenge
      const itemsCollection = collection(db, "items");
      const itemsSnapshot = await getDocs(itemsCollection);
      const itemsList = itemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StoreItem[];

      setItems(itemsList);
    } catch (error) {
      console.error("Error creating custom challenge:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el desafío personalizado",
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
  type: "regular" | "challenge" | "blocker" | "custom-challenge",
  stock: 10 // Optional, only for regular items
}`}
          </pre>
        </div>
      </div>
    );
  }

  // Filter items by type
  const regularItems = items.filter((item) => item.type === "regular");
  const challengeItems = items.filter((item) => item.type === "challenge");
  const blockerItems = items.filter((item) => item.type === "blocker");
  const customChallengeItems = items.filter(
    (item) => item.type === "custom-challenge"
  );

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

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="regular">Regulares</TabsTrigger>
          <TabsTrigger value="challenge">Desafíos</TabsTrigger>
          <TabsTrigger value="blocker">Bloqueadores</TabsTrigger>
          <TabsTrigger value="custom-challenge">
            Desafíos Personalizados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regular">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.name}</CardTitle>
                  <CardDescription>Artículo Regular</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {item.description}
                  </p>
                  <p className="font-bold text-lg">{item.price} monedas</p>
                  {item.stock !== undefined && (
                    <p
                      className={`text-sm mt-2 ${
                        item.stock > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {item.stock > 0 ? `En stock: ${item.stock}` : "Agotado"}
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handlePurchase(item)}
                    disabled={
                      (userData?.balance ?? 0) < item.price ||
                      (item.stock !== undefined && item.stock <= 0)
                    }
                    className="w-full"
                  >
                    Comprar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="challenge">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challengeItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.name}</CardTitle>
                  <CardDescription>Artículo de Desafío</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {item.description}
                  </p>
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
        </TabsContent>

        <TabsContent value="blocker">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blockerItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.name}</CardTitle>
                  <CardDescription>Bloqueador de Desafíos</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {item.description}
                  </p>
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
        </TabsContent>

        <TabsContent value="custom-challenge">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Crear Desafío Personalizado</CardTitle>
                <CardDescription>
                  Crea tu propio desafío personalizado por 1000 monedas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="challenge-title">Título del Desafío</Label>
                    <Input
                      id="challenge-title"
                      value={customChallengeTitle}
                      onChange={(e) => setCustomChallengeTitle(e.target.value)}
                      placeholder="Ej: Bailar la Macarena"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="challenge-description">
                      Descripción del Desafío
                    </Label>
                    <Textarea
                      id="challenge-description"
                      value={customChallengeDescription}
                      onChange={(e) =>
                        setCustomChallengeDescription(e.target.value)
                      }
                      placeholder="Describe lo que debe hacer la persona"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user">Seleccionar Usuario</Label>
                    <Select
                      value={selectedUser}
                      onValueChange={setSelectedUser}
                    >
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
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleCreateCustomChallenge}
                  disabled={
                    !selectedUser ||
                    !customChallengeTitle ||
                    !customChallengeDescription ||
                    (userData?.balance ?? 0) < 1000
                  }
                  className="w-full"
                >
                  Crear y Enviar (1000 monedas)
                </Button>
              </CardFooter>
            </Card>

            <div>
              <h3 className="text-lg font-medium mb-4">
                Desafíos Personalizados Guardados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customChallengeItems.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>Desafío Personalizado</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        {item.description}
                      </p>
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
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.type === "custom-challenge" && !selectedItem.id
                ? "Crear Desafío Personalizado"
                : "Seleccionar Usuario para el Desafío"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.type === "custom-challenge" && !selectedItem.id
                ? "Crea un desafío personalizado para enviar a otro usuario"
                : `Elige un usuario para enviar el desafío "${selectedItem?.name}"`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedItem?.type === "custom-challenge" && !selectedItem.id && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="challenge-title">Título del Desafío</Label>
                  <Input
                    id="challenge-title"
                    value={customChallengeTitle}
                    onChange={(e) => setCustomChallengeTitle(e.target.value)}
                    placeholder="Ej: Bailar la Macarena"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challenge-description">
                    Descripción del Desafío
                  </Label>
                  <Textarea
                    id="challenge-description"
                    value={customChallengeDescription}
                    onChange={(e) =>
                      setCustomChallengeDescription(e.target.value)
                    }
                    placeholder="Describe lo que debe hacer la persona"
                    rows={3}
                  />
                </div>
              </>
            )}
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
            <Button
              onClick={handleChallengeConfirm}
              disabled={
                !selectedUser ||
                (selectedItem?.type === "custom-challenge" &&
                  !selectedItem.id &&
                  (!customChallengeTitle || !customChallengeDescription))
              }
            >
              Enviar Desafío
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
