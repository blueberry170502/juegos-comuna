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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/loading-spinner";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "regular" | "challenge" | "blocker" | "custom-challenge";
  image?: string;
  stock?: number; // Optional stock attribute for regular items
}

export default function StoreItems() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("regular"); // Estado para el filtro seleccionado
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

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

    fetchItems();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Filtrar los elementos según el filtro seleccionado
  const filteredItems = items.filter((item) => {
    if (selectedFilter === "regular") {
      return item.type === "regular";
    } else if (selectedFilter === "challenge") {
      return item.type === "challenge";
    } else if (selectedFilter === "blocker") {
      return item.type === "blocker";
    } else if (selectedFilter === "custom-challenge") {
      return item.type === "custom-challenge";
    }
    return false;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Label htmlFor="Filter by">Filtrar por:</Label>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un filtro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="regular" value="regular">
                Regulares
              </SelectItem>
              <SelectItem key="challenge" value="challenge">
                Desafíos
              </SelectItem>
              <SelectItem key="blocker" value="blocker">
                Bloqueadores
              </SelectItem>
              <SelectItem key="custom-challenge" value="custom-challenge">
                Desafíos Personalizados
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="bg-card px-4 py-2 rounded-md">
          <span className="font-medium">Tu Saldo: </span>
          <span className="text-primary font-bold">
            {userData?.balance || 0} monedas
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
              <CardDescription>
                {item.type === "regular"
                  ? "Artículo Regular"
                  : item.type === "challenge"
                  ? "Artículo de Desafío"
                  : item.type === "blocker"
                  ? "Bloqueador de Desafíos"
                  : "Desafío Personalizado"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{item.description}</p>
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
                onClick={() => console.log(`Comprar ${item.name}`)}
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
    </div>
  );
}
