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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Coins } from "lucide-react";

interface HorseRacingBet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  horse: string;
  timestamp: any;
  status: "pending" | "won" | "lost";
}

const horses = [
  { id: "1", name: "Thunder Bolt" },
  { id: "2", name: "Silver Arrow" },
  { id: "3", name: "Golden Star" },
  { id: "4", name: "Midnight Runner" },
];

export default function HorseRacingBetting() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [selectedHorse, setSelectedHorse] = useState("");
  const [loading, setLoading] = useState(false);
  const [allBets, setAllBets] = useState<HorseRacingBet[]>([]);
  const [userBets, setUserBets] = useState<HorseRacingBet[]>([]);
  const [totalPot, setTotalPot] = useState(0);
  const [horseTotals, setHorseTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchBets = async () => {
      if (!user) return;

      try {
        const betsRef = collection(db, "bets");
        const q = query(
          betsRef,
          where("game", "==", "horse-racing"),
          where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);

        const fetchedBets: HorseRacingBet[] = [];
        let total = 0;
        const horseAmounts: Record<string, number> = {
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
        };

        querySnapshot.forEach((doc) => {
          const betData = doc.data() as HorseRacingBet;
          betData.id = doc.id;
          fetchedBets.push(betData);
          total += betData.amount;

          if (betData.horse) {
            horseAmounts[betData.horse] =
              (horseAmounts[betData.horse] || 0) + betData.amount;
          }
        });

        setAllBets(fetchedBets);
        setUserBets(fetchedBets.filter((bet) => bet.userId === user.uid));
        setTotalPot(total);
        setHorseTotals(horseAmounts);
      } catch (error) {
        console.error("Error fetching bets:", error);
      }
    };

    fetchBets();
  }, [user]);

  // Añadir función para calcular el beneficio potencial
  const calculatePotentialWinnings = (bet: HorseRacingBet): number => {
    if (!bet.horse) return 0;

    const totalBetOnHorse = horseTotals[bet.horse] || 0;

    // Si no hay apuestas en este caballo, no hay ganancia estimada
    if (totalBetOnHorse === 0) return 0;

    // Calculamos la proporción de la apuesta del usuario respecto al total apostado en ese caballo
    const userProportion = bet.amount / totalBetOnHorse;

    // La ganancia potencial es la proporción del usuario multiplicada por el bote total
    return totalPot * userProportion;
  };

  // Añadir el cálculo del beneficio total potencial
  const totalPotentialWinnings = userBets.reduce(
    (sum, bet) => sum + calculatePotentialWinnings(bet),
    0
  );

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

    if (!selectedHorse) {
      toast({
        title: "No horse selected",
        description: "Please select a horse to bet on",
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
        game: "horse-racing",
        amount: betAmount,
        horse: selectedHorse,
        timestamp: serverTimestamp(),
        status: "pending", // pending, won, lost
      });

      const horseName = horses.find((h) => h.id === selectedHorse)?.name;

      toast({
        title: "Bet placed!",
        description: `You bet ${betAmount} coins on ${horseName}`,
      });

      // Reset form
      setAmount("");

      // Refresh bets - CORREGIDO: Ahora filtramos por status: "pending"
      const betsRef = collection(db, "bets");
      const q = query(
        betsRef,
        where("game", "==", "horse-racing"),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(q);

      const fetchedBets: HorseRacingBet[] = [];
      let total = 0;
      const horseAmounts: Record<string, number> = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
      };

      querySnapshot.forEach((doc) => {
        const betData = doc.data() as HorseRacingBet;
        betData.id = doc.id;
        fetchedBets.push(betData);
        total += betData.amount;

        if (betData.horse) {
          horseAmounts[betData.horse] =
            (horseAmounts[betData.horse] || 0) + betData.amount;
        }
      });

      setAllBets(fetchedBets);
      setUserBets(fetchedBets.filter((bet) => bet.userId === user.uid));
      setTotalPot(total);
      setHorseTotals(horseAmounts);
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
                Elige tu caballo y la cantidad a apostar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Selecciona un Caballo</Label>
                <RadioGroup
                  value={selectedHorse}
                  onValueChange={setSelectedHorse}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {horses.map((horse) => (
                      <div
                        key={horse.id}
                        className="flex items-center space-x-2"
                      >
                        <RadioGroupItem
                          value={horse.id}
                          id={`horse-${horse.id}`}
                        />
                        <Label
                          htmlFor={`horse-${horse.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div
                            className={`p-4 rounded-md border ${
                              selectedHorse === horse.id
                                ? "border-primary bg-primary/10"
                                : "border-muted"
                            }`}
                          >
                            <div className="font-medium">{horse.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Total apostado: {horseTotals[horse.id] || 0}{" "}
                              monedas
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

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
                  <Button
                    onClick={handleBet}
                    disabled={loading || !selectedHorse || !amount}
                  >
                    Apostar
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
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de la Carrera</CardTitle>
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
                  {totalPotentialWinnings.toFixed(0)} monedas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Jugadores Totales:</span>
                <span className="font-bold">
                  {new Set(allBets.map((bet) => bet.userId)).size}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">
                  Probabilidades por Caballo
                </h3>
                {horses.map((horse) => {
                  const horseTotal = horseTotals[horse.id] || 0;
                  const percentage =
                    totalPot > 0 ? (horseTotal / totalPot) * 100 : 0;
                  const odds =
                    percentage > 0 ? (100 / percentage).toFixed(2) : "N/A";

                  return (
                    <div
                      key={horse.id}
                      className="flex justify-between items-center text-sm mb-1"
                    >
                      <span>{horse.name}</span>
                      <span>{odds}:1</span>
                    </div>
                  );
                })}
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
                  {userBets.map((bet) => {
                    const horseName =
                      horses.find((h) => h.id === bet.horse)?.name ||
                      "Desconocido";

                    return (
                      <li key={bet.id} className="text-sm border-b pb-2">
                        <div className="flex justify-between">
                          <span>{horseName}</span>
                          <span className="font-bold">
                            {bet.amount} monedas
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Estado: {bet.status}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Ganancias Potenciales:{" "}
                          {calculatePotentialWinnings(bet).toFixed(2)} monedas
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no has realizado ninguna apuesta
                </p>
              )}
              {userBets.length > 0 && (
                <div className="mt-4">
                  <div className="font-bold">
                    Ganancias Potenciales Totales:{" "}
                    {totalPotentialWinnings.toFixed(2)} monedas
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
