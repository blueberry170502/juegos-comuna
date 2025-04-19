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
  query,
  where,
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
import { useToast } from "@/hooks/use-toast";
import { Coins } from "lucide-react";

interface BlackjackBet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  timestamp: any;
  status: "pending" | "won" | "lost";
}

export default function BlackjackBetting() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [allBets, setAllBets] = useState<BlackjackBet[]>([]);
  const [userBets, setUserBets] = useState<BlackjackBet[]>([]);
  const [totalPot, setTotalPot] = useState(0);

  useEffect(() => {
    const fetchBets = async () => {
      if (!user) return;

      try {
        const betsRef = collection(db, "bets");
        const q = query(
          betsRef,
          where("game", "==", "blackjack"),
          where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);

        const fetchedBets: BlackjackBet[] = [];
        let total = 0;

        querySnapshot.forEach((doc) => {
          const betData = doc.data() as BlackjackBet;
          betData.id = doc.id;
          fetchedBets.push(betData);
          total += betData.amount;
        });

        setAllBets(fetchedBets);
        setUserBets(fetchedBets.filter((bet) => bet.userId === user.uid));
        setTotalPot(total);
      } catch (error) {
        console.error("Error al obtener las apuestas:", error);
      }
    };

    fetchBets();
  }, [user]);

  const handleBet = async () => {
    if (!userData || !user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar una apuesta",
        variant: "destructive",
      });
      return;
    }

    const betAmount = Number.parseInt(amount);

    if (isNaN(betAmount) || betAmount <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "Por favor, ingresa una cantidad válida para apostar",
        variant: "destructive",
      });
      return;
    }

    if (betAmount > userData.balance) {
      toast({
        title: "Fondos insuficientes",
        description: "No tienes suficientes monedas para esta apuesta",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Actualizar el saldo del usuario
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - betAmount,
      });

      // Agregar la apuesta a la base de datos
      await addDoc(collection(db, "bets"), {
        userId: user.uid,
        username: userData.username,
        game: "blackjack",
        amount: betAmount,
        timestamp: serverTimestamp(),
        status: "pending", // pendiente, ganado, perdido
      });

      toast({
        title: "¡Apuesta realizada!",
        description: `Apostaste ${betAmount} monedas en Blackjack`,
      });

      // Reiniciar el formulario
      setAmount("");

      // Refrescar las apuestas
      const betsRef = collection(db, "bets");
      const q = query(
        betsRef,
        where("game", "==", "blackjack"),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(q);

      const fetchedBets: BlackjackBet[] = [];
      let total = 0;

      querySnapshot.forEach((doc) => {
        const betData = doc.data() as BlackjackBet;
        betData.id = doc.id;
        fetchedBets.push(betData);
        total += betData.amount;
      });

      setAllBets(fetchedBets);
      setUserBets(fetchedBets.filter((bet) => bet.userId === user.uid));
      setTotalPot(total);
    } catch (error) {
      console.error("Error al realizar la apuesta:", error);
      toast({
        title: "Error",
        description: "No se pudo realizar la apuesta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePotentialWinnings = (bet: BlackjackBet): number => {
    // Blackjack típicamente paga 3:2
    return bet.amount * 2.5;
  };

  const totalPotentialWinnings = userBets.reduce(
    (sum, bet) => sum + calculatePotentialWinnings(bet),
    0
  );

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Realiza tu apuesta</CardTitle>
              <CardDescription>
                Ingresa la cantidad que deseas apostar en Blackjack
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Cantidad a apostar</Label>
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
                    onClick={handleBet}
                    disabled={loading || !amount || userBets.length > 0}
                  >
                    Apostar
                  </Button>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Reglas de Blackjack</h3>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>
                    Intenta obtener un valor de mano más cercano a 21 que el
                    crupier sin pasarte
                  </li>
                  <li>
                    Las cartas con figuras valen 10, los Ases valen 1 o 11
                  </li>
                  <li>
                    El crupier debe pedir carta con 16 o menos y plantarse con
                    17 o más
                  </li>
                  <li>Blackjack (un As con una carta de valor 10) paga 3:2</li>
                </ul>
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
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Blackjack</CardTitle>
              <CardDescription>
                Apuestas actuales y tamaño del bote
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Bote total:</span>
                <span className="font-bold flex items-center">
                  <Coins className="h-4 w-4 mr-1" />
                  {totalPot} monedas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Tus apuestas:</span>
                <span className="font-bold flex items-center">
                  <Coins className="h-4 w-4 mr-1" />
                  {userBets.reduce((sum, bet) => sum + bet.amount, 0)} monedas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Ganancias potenciales:</span>
                <span className="font-bold flex items-center text-green-600">
                  <Coins className="h-4 w-4 mr-1" />
                  {totalPotentialWinnings} monedas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Jugadores totales:</span>
                <span className="font-bold">
                  {new Set(allBets.map((bet) => bet.userId)).size}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Tus apuestas</CardTitle>
            </CardHeader>
            <CardContent>
              {userBets.length > 0 ? (
                <ul className="space-y-2">
                  {userBets.map((bet) => (
                    <li key={bet.id} className="text-sm border-b pb-2">
                      <div className="flex justify-between">
                        <span>Blackjack</span>
                        <span className="font-bold">{bet.amount} monedas</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Estado: {bet.status}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no has realizado ninguna apuesta
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
