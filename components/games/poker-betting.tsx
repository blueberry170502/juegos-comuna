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

interface PokerBet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  timestamp: any;
  status: "pending" | "won" | "lost";
}

export default function PokerBetting() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [allBets, setAllBets] = useState<PokerBet[]>([]);
  const [userBets, setUserBets] = useState<PokerBet[]>([]);
  const [totalPot, setTotalPot] = useState(0);

  useEffect(() => {
    const fetchBets = async () => {
      if (!user) return;

      try {
        const betsRef = collection(db, "bets");
        const q = query(
          betsRef,
          where("game", "==", "poker"),
          where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);

        const fetchedBets: PokerBet[] = [];
        let total = 0;

        querySnapshot.forEach((doc) => {
          const betData = doc.data() as PokerBet;
          betData.id = doc.id;
          fetchedBets.push(betData);
          total += betData.amount;
        });

        setAllBets(fetchedBets);
        setUserBets(fetchedBets.filter((bet) => bet.userId === user.uid));
        setTotalPot(total);
      } catch (error) {
        console.error("Error fetching bets:", error);
      }
    };

    fetchBets();
  }, [user]);

  // Añadir función para calcular el beneficio potencial
  const calculatePotentialWinnings = (bet: PokerBet): number => {
    // Estimación simple: si hay 4 jugadores, el ganador se lleva todo
    const playerCount = new Set(allBets.map((bet) => bet.userId)).size;
    const estimatedWinnings = playerCount > 0 ? totalPot / playerCount : 0;

    // Asumimos que solo hay un ganador
    return estimatedWinnings;
  };

  // Añadir el cálculo del beneficio total potencial
  const totalPotentialWinnings =
    userBets.length > 0 ? calculatePotentialWinnings(userBets[0]) : 0;

  const handleBet = async () => {
    if (!userData || !user) {
      toast({
        title: "Error",
        description: "You must be logged in to place a bet",
        variant: "destructive",
      });
      return;
    }

    const betAmount = Number.parseInt(amount);

    if (isNaN(betAmount) || betAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    if (betAmount > userData.balance) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough coins for this bet",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Update user balance
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - betAmount,
      });

      // Add bet to database
      await addDoc(collection(db, "bets"), {
        userId: user.uid,
        username: userData.username,
        game: "poker",
        amount: betAmount,
        timestamp: serverTimestamp(),
        status: "pending", // pending, won, lost
      });

      toast({
        title: "Bet placed!",
        description: `You bet ${betAmount} coins on Poker`,
      });

      // Reset form
      setAmount("");

      // Refresh bets - CORREGIDO: Ahora filtramos por status: "pending"
      const betsRef = collection(db, "bets");
      const q = query(
        betsRef,
        where("game", "==", "poker"),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(q);

      const fetchedBets: PokerBet[] = [];
      let total = 0;

      querySnapshot.forEach((doc) => {
        const betData = doc.data() as PokerBet;
        betData.id = doc.id;
        fetchedBets.push(betData);
        total += betData.amount;
      });

      setAllBets(fetchedBets);
      setUserBets(fetchedBets.filter((bet) => bet.userId === user.uid));
      setTotalPot(total);
    } catch (error) {
      console.error("Error placing bet:", error);
      toast({
        title: "Error",
        description: "Failed to place bet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Realiza Tu Apuesta</CardTitle>
              <CardDescription>
                Ingresa la cantidad que deseas apostar en Poker
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Cantidad a Apostar</Label>
                <div className="flex space-x-2">
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ingresa la cantidad"
                  />
                  <Button onClick={handleBet} disabled={loading || !amount}>
                    Apostar
                  </Button>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Reglas del Poker</h3>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>Los jugadores reciben cartas y apuestan en rondas</li>
                  <li>La mejor mano gana el bote</li>
                  <li>
                    Clasificación de manos: Escalera Real, Escalera de Color,
                    Póker, Full, etc.
                  </li>
                  <li>
                    Las apuestas continúan hasta que todos los jugadores se
                    retiran o llega el enfrentamiento final
                  </li>
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
              <CardTitle>Estadísticas de Poker</CardTitle>
              <CardDescription>
                Apuestas actuales y tamaño del bote
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Bote Total:</span>
                <span className="font-bold flex items-center">
                  <Coins className="h-4 w-4 mr-1" />
                  {totalPot} monedas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Tus Apuestas:</span>
                <span className="font-bold flex items-center">
                  <Coins className="h-4 w-4 mr-1" />
                  {userBets.reduce((sum, bet) => sum + bet.amount, 0)} monedas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Ganancias Potenciales:</span>
                <span className="font-bold flex items-center text-green-600">
                  <Coins className="h-4 w-4 mr-1" />
                  {totalPotentialWinnings} monedas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Jugadores Totales:</span>
                <span className="font-bold">
                  {new Set(allBets.map((bet) => bet.userId)).size}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Tus Apuestas</CardTitle>
            </CardHeader>
            <CardContent>
              {userBets.length > 0 ? (
                <ul className="space-y-2">
                  {userBets.map((bet) => (
                    <li key={bet.id} className="text-sm border-b pb-2">
                      <div className="flex justify-between">
                        <span>Poker</span>
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
