"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase-hooks";
import { db } from "@/lib/firebase-config";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  writeBatch,
  serverTimestamp,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

interface Bet {
  id: string;
  userId: string;
  username: string;
  game: string;
  amount: number;
  betType?: string;
  betValue?: string;
  horse?: string;
  difficulty?: string;
  multiplier?: number;
  currentRound?: number;
  isActive?: boolean;
  timestamp: any;
  status: "pending" | "won" | "lost";
}

interface User {
  id: string;
  username: string;
}

const horses = [
  { id: "1", name: "Thunder Bolt" },
  { id: "2", name: "Silver Arrow" },
  { id: "3", name: "Golden Star" },
  { id: "4", name: "Midnight Runner" },
];

export default function GameManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rouletteBets, setRouletteBets] = useState<Bet[]>([]);
  const [blackjackBets, setBlackjackBets] = useState<Bet[]>([]);
  const [pokerBets, setPokerBets] = useState<Bet[]>([]);
  const [horseRacingBets, setHorseRacingBets] = useState<Bet[]>([]);
  const [higherLowerBets, setHigherLowerBets] = useState<Bet[]>([]);

  const [rouletteResult, setRouletteResult] = useState("");
  const [blackjackWinners, setBlackjackWinners] = useState<string[]>([]);
  const [dealerWins, setDealerWins] = useState(false);
  const [pokerWinners, setPokerWinners] = useState<string[]>([]);
  const [winningHorse, setWinningHorse] = useState("");
  const [higherLowerAction, setHigherLowerAction] = useState<
    "correct" | "incorrect" | "cashout"
  >("correct");

  useEffect(() => {
    const fetchBets = async () => {
      if (!user) return;

      try {
        // Fetch roulette bets
        const rouletteQuery = query(
          collection(db, "bets"),
          where("game", "==", "roulette"),
          where("status", "==", "pending")
        );
        const rouletteSnapshot = await getDocs(rouletteQuery);
        const rouletteBetsList: Bet[] = [];
        rouletteSnapshot.forEach((doc) => {
          const betData = doc.data() as Bet;
          betData.id = doc.id;
          rouletteBetsList.push(betData);
        });
        setRouletteBets(rouletteBetsList);

        // Fetch blackjack bets
        const blackjackQuery = query(
          collection(db, "bets"),
          where("game", "==", "blackjack"),
          where("status", "==", "pending")
        );
        const blackjackSnapshot = await getDocs(blackjackQuery);
        const blackjackBetsList: Bet[] = [];
        blackjackSnapshot.forEach((doc) => {
          const betData = doc.data() as Bet;
          betData.id = doc.id;
          blackjackBetsList.push(betData);
        });
        setBlackjackBets(blackjackBetsList);

        // Fetch poker bets
        const pokerQuery = query(
          collection(db, "bets"),
          where("game", "==", "poker"),
          where("status", "==", "pending")
        );
        const pokerSnapshot = await getDocs(pokerQuery);
        const pokerBetsList: Bet[] = [];
        pokerSnapshot.forEach((doc) => {
          const betData = doc.data() as Bet;
          betData.id = doc.id;
          pokerBetsList.push(betData);
        });
        setPokerBets(pokerBetsList);

        // Fetch horse racing bets
        const horseRacingQuery = query(
          collection(db, "bets"),
          where("game", "==", "horse-racing"),
          where("status", "==", "pending")
        );
        const horseRacingSnapshot = await getDocs(horseRacingQuery);
        const horseRacingBetsList: Bet[] = [];
        horseRacingSnapshot.forEach((doc) => {
          const betData = doc.data() as Bet;
          betData.id = doc.id;
          horseRacingBetsList.push(betData);
        });
        setHorseRacingBets(horseRacingBetsList);

        // Fetch higher-lower bets
        const higherLowerQuery = query(
          collection(db, "bets"),
          where("game", "==", "higher-lower"),
          where("status", "==", "pending"),
          where("isActive", "==", true)
        );
        const higherLowerSnapshot = await getDocs(higherLowerQuery);
        const higherLowerBetsList: Bet[] = [];
        higherLowerSnapshot.forEach((doc) => {
          const betData = doc.data() as Bet;
          betData.id = doc.id;
          higherLowerBetsList.push(betData);
        });
        setHigherLowerBets(higherLowerBetsList);
      } catch (error) {
        console.error("Error fetching bets:", error);
        toast({
          title: "Error",
          description: "Failed to fetch bets",
          variant: "destructive",
        });
      }
    };

    fetchBets();
  }, [user, toast]);

  const handleRouletteResult = async () => {
    if (!rouletteResult) {
      toast({
        title: "No result selected",
        description: "Please select a roulette result",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const batch = writeBatch(db);

      // Process each bet
      for (const bet of rouletteBets) {
        let won = false;

        // Check if the bet won based on the result
        switch (bet.betType) {
          case "number":
            won = bet.betValue === rouletteResult;
            break;
          case "color":
            // Red numbers: 1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
            const redNumbers = [
              1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
            ];
            const resultNumber = Number.parseInt(rouletteResult);
            if (bet.betValue === "red") {
              won = redNumbers.includes(resultNumber);
            } else if (bet.betValue === "black") {
              won = !redNumbers.includes(resultNumber) && resultNumber !== 0;
            }
            break;
          case "evenOdd":
            const num = Number.parseInt(rouletteResult);
            if (bet.betValue === "even") {
              won = num !== 0 && num % 2 === 0;
            } else if (bet.betValue === "odd") {
              won = num % 2 === 1;
            }
            break;
          case "highLow":
            const number = Number.parseInt(rouletteResult);
            if (bet.betValue === "1-18") {
              won = number >= 1 && number <= 18;
            } else if (bet.betValue === "19-36") {
              won = number >= 19 && number <= 36;
            }
            break;
          case "dozen":
          case "section":
            const n = Number.parseInt(rouletteResult);
            if (bet.betValue === "1-12") {
              won = n >= 1 && n <= 12;
            } else if (bet.betValue === "13-24") {
              won = n >= 13 && n <= 24;
            } else if (bet.betValue === "25-36") {
              won = n >= 25 && n <= 36;
            }
            break;
          case "column":
            const col = Number.parseInt(rouletteResult) % 3;
            if (bet.betValue === "1st" && col === 1) won = true;
            if (bet.betValue === "2nd" && col === 2) won = true;
            if (
              bet.betValue === "3rd" &&
              col === 0 &&
              Number.parseInt(rouletteResult) !== 0
            )
              won = true;
            break;
        }

        // Update bet status
        const betRef = doc(db, "bets", bet.id);
        batch.update(betRef, {
          status: won ? "won" : "lost",
          resolvedAt: serverTimestamp(),
        });

        // If won, update user balance
        if (won) {
          const userRef = doc(db, "users", bet.userId);

          // Calculate winnings based on bet type
          let multiplier = 1;
          switch (bet.betType) {
            case "number":
              multiplier = 36;
              break;
            case "color":
            case "evenOdd":
            case "highLow":
              multiplier = 2;
              break;
            case "dozen":
            case "section":
            case "column":
              multiplier = 3;
              break;
          }

          // Add original bet amount + winnings
          const winnings = bet.amount * multiplier;

          const userDoc = await getDoc(doc(db, "users", bet.userId));
          const userData = userDoc.data();

          if (userData) {
            batch.update(userRef, {
              balance: userData.balance + winnings,
            });
          }
        }
      }

      // Commit all updates
      await batch.commit();

      toast({
        title: "Roulette results processed",
        description: `Result: ${rouletteResult}`,
      });

      // Reset form and refresh bets
      setRouletteResult("");
      setRouletteBets([]);
    } catch (error) {
      console.error("Error processing roulette results:", error);
      toast({
        title: "Error",
        description: "Failed to process roulette results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBlackjackResults = async () => {
    // Si el crupier gana, no debería haber ganadores seleccionados
    if (dealerWins && blackjackWinners.length > 0) {
      toast({
        title: "Invalid selection",
        description: "If the dealer wins, you cannot select player winners",
        variant: "destructive",
      });
      return;
    }

    // Si el crupier no gana, debe haber al menos un ganador seleccionado
    if (!dealerWins && blackjackWinners.length === 0) {
      toast({
        title: "No winners selected",
        description:
          "Please select at least one winner or indicate that the dealer wins",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const batch = writeBatch(db);

      // Process each bet
      for (const bet of blackjackBets) {
        // Si el crupier gana, todos los jugadores pierden
        const won = dealerWins ? false : blackjackWinners.includes(bet.userId);

        // Update bet status
        const betRef = doc(db, "bets", bet.id);
        batch.update(betRef, {
          status: won ? "won" : "lost",
          resolvedAt: serverTimestamp(),
        });

        // If won, update user balance
        if (won) {
          const userRef = doc(db, "users", bet.userId);

          // Blackjack typically pays 3:2
          const winnings = bet.amount * 2.5;

          // We need to get the current balance first
          const userDoc = await getDoc(doc(db, "users", bet.userId));
          const userData = userDoc.data();

          if (userData) {
            batch.update(userRef, {
              balance: userData.balance + winnings,
            });
          }
        }
      }

      // Commit all updates
      await batch.commit();

      toast({
        title: "Blackjack results processed",
        description: dealerWins
          ? "Dealer wins! All players lose."
          : `${blackjackWinners.length} winners`,
      });

      // Reset form and refresh bets
      setBlackjackWinners([]);
      setDealerWins(false);
      setBlackjackBets([]);
    } catch (error) {
      console.error("Error processing blackjack results:", error);
      toast({
        title: "Error",
        description: "Failed to process blackjack results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePokerResults = async () => {
    if (pokerWinners.length === 0) {
      toast({
        title: "No winners selected",
        description: "Please select at least one winner",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const batch = writeBatch(db);

      // Calculate total pot
      const totalPot = pokerBets.reduce((sum, bet) => sum + bet.amount, 0);

      // Calculate winnings per winner
      const winningsPerWinner = totalPot / pokerWinners.length;

      // Process each bet
      for (const bet of pokerBets) {
        const won = pokerWinners.includes(bet.userId);

        // Update bet status
        const betRef = doc(db, "bets", bet.id);
        batch.update(betRef, {
          status: won ? "won" : "lost",
          resolvedAt: serverTimestamp(),
        });

        // If won, update user balance
        if (won) {
          const userRef = doc(db, "users", bet.userId);

          // We need to get the current balance first
          const userDoc = await getDoc(doc(db, "users", bet.userId));
          const userData = userDoc.data();

          if (userData) {
            batch.update(userRef, {
              balance: userData.balance + winningsPerWinner,
            });
          }
        }
      }

      // Commit all updates
      await batch.commit();

      toast({
        title: "Poker results processed",
        description: `${
          pokerWinners.length
        } winners, ${winningsPerWinner.toFixed(0)} coins each`,
      });

      // Reset form and refresh bets
      setPokerWinners([]);
      setPokerBets([]);
    } catch (error) {
      console.error("Error processing poker results:", error);
      toast({
        title: "Error",
        description: "Failed to process poker results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHorseRacingResults = async () => {
    if (!winningHorse) {
      toast({
        title: "No winning horse selected",
        description: "Please select a winning horse",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const batch = writeBatch(db);

      // Calculate total pot
      const totalPot = horseRacingBets.reduce(
        (sum, bet) => sum + bet.amount,
        0
      );

      // Get winning bets
      const winningBets = horseRacingBets.filter(
        (bet) => bet.horse === winningHorse
      );

      // Calculate total amount bet on winning horse
      const totalWinningBets = winningBets.reduce(
        (sum, bet) => sum + bet.amount,
        0
      );

      // Process each bet
      for (const bet of horseRacingBets) {
        const won = bet.horse === winningHorse;

        // Update bet status
        const betRef = doc(db, "bets", bet.id);
        batch.update(betRef, {
          status: won ? "won" : "lost",
          resolvedAt: serverTimestamp(),
        });

        // If won, update user balance
        if (won) {
          const userRef = doc(db, "users", bet.userId);

          // Calculate winnings proportional to bet amount
          const winningRatio = bet.amount / totalWinningBets;
          const winnings = totalPot * winningRatio;

          // We need to get the current balance first
          const userDoc = await getDoc(doc(db, "users", bet.userId));
          const userData = userDoc.data();

          if (userData) {
            batch.update(userRef, {
              balance: userData.balance + winnings,
            });
          }
        }
      }

      // Commit all updates
      await batch.commit();

      const horseName = horses.find((h) => h.id === winningHorse)?.name;

      toast({
        title: "Horse racing results processed",
        description: `Winner: ${horseName}`,
      });

      // Reset form and refresh bets
      setWinningHorse("");
      setHorseRacingBets([]);
    } catch (error) {
      console.error("Error processing horse racing results:", error);
      toast({
        title: "Error",
        description: "Failed to process horse racing results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHigherLowerResults = async (betId: string) => {
    setLoading(true);

    try {
      const batch = writeBatch(db);
      const bet = higherLowerBets.find((b) => b.id === betId);

      if (!bet) {
        throw new Error("Bet not found");
      }

      const betRef = doc(db, "bets", betId);
      const userRef = doc(db, "users", bet.userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (!userData) {
        throw new Error("User data not found");
      }

      if (higherLowerAction === "correct") {
        // El jugador acertó, actualizar la ronda y continuar
        const newRound = (bet.currentRound || 1) + 1;
        batch.update(betRef, {
          currentRound: newRound,
        });

        // Actualizar el estado local en lugar de eliminar la apuesta
        setHigherLowerBets(
          higherLowerBets.map((b) =>
            b.id === betId ? { ...b, currentRound: newRound } : b
          )
        );

        toast({
          title: "Predicción correcta",
          description: `El jugador avanza a la ronda ${newRound}`,
        });
      } else if (higherLowerAction === "incorrect") {
        // El jugador falló, pierde la apuesta
        batch.update(betRef, {
          status: "lost",
          isActive: false,
          resolvedAt: serverTimestamp(),
        });

        // Eliminar la apuesta del estado local
        setHigherLowerBets(higherLowerBets.filter((b) => b.id !== betId));

        toast({
          title: "Predicción incorrecta",
          description: "El jugador ha perdido su apuesta",
        });
      } else if (higherLowerAction === "cashout") {
        // El jugador se retira, calcular ganancias
        const multiplier = bet.multiplier || 1;
        const rounds = bet.currentRound || 1;

        // Calcular ganancias: apuesta inicial * (multiplicador ^ (rondas - 1))
        const winnings = bet.amount * Math.pow(multiplier, rounds - 1);

        batch.update(betRef, {
          status: "won",
          isActive: false,
          resolvedAt: serverTimestamp(),
        });

        batch.update(userRef, {
          balance: userData.balance + winnings,
        });

        // Eliminar la apuesta del estado local
        setHigherLowerBets(higherLowerBets.filter((b) => b.id !== betId));

        toast({
          title: "Jugador se retira",
          description: `Ganancias: ${winnings.toFixed(0)} monedas`,
        });
      }

      // Commit all updates
      await batch.commit();
    } catch (error) {
      console.error("Error processing higher-lower results:", error);
      toast({
        title: "Error",
        description: "Failed to process higher-lower results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleBlackjackWinner = (userId: string) => {
    // Si el crupier gana, no permitimos seleccionar ganadores
    if (dealerWins) return;

    if (blackjackWinners.includes(userId)) {
      setBlackjackWinners(blackjackWinners.filter((id) => id !== userId));
    } else {
      setBlackjackWinners([...blackjackWinners, userId]);
    }
  };

  const togglePokerWinner = (userId: string) => {
    if (pokerWinners.includes(userId)) {
      setPokerWinners(pokerWinners.filter((id) => id !== userId));
    } else {
      setPokerWinners([...pokerWinners, userId]);
    }
  };

  // Cuando se cambia el estado del crupier, resetear los ganadores seleccionados
  const handleDealerWinsChange = (checked: boolean) => {
    setDealerWins(checked);
    if (checked) {
      setBlackjackWinners([]);
    }
  };

  return (
    <Tabs defaultValue="roulette">
      <TabsList className="grid grid-cols-5 mb-8">
        <TabsTrigger value="roulette">Ruleta</TabsTrigger>
        <TabsTrigger value="blackjack">Blackjack</TabsTrigger>
        <TabsTrigger value="poker">Póker</TabsTrigger>
        <TabsTrigger value="horse-racing">Carreras de Caballos</TabsTrigger>
        <TabsTrigger value="higher-lower">Higher or Lower</TabsTrigger>
      </TabsList>

      <TabsContent value="roulette">
        <Card>
          <CardHeader>
            <CardTitle>Resultados de la Ruleta</CardTitle>
            <CardDescription>
              Ingresa el número ganador y procesa los resultados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rouletteResult">Número Ganador (0-36)</Label>
              <Input
                id="rouletteResult"
                type="number"
                min="0"
                max="36"
                value={rouletteResult}
                onChange={(e) => setRouletteResult(e.target.value)}
                placeholder="Ingresa el número ganador"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Apuestas Actuales</h3>
              {rouletteBets.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Jugador
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Tipo de Apuesta
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Valor de Apuesta
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-gray-200">
                      {rouletteBets.map((bet) => (
                        <tr key={bet.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {bet.username}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {bet.betType}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {bet.betValue}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                            {bet.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay apuestas pendientes
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleRouletteResult}
              disabled={loading || !rouletteResult || rouletteBets.length === 0}
            >
              Procesar Resultados
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="blackjack">
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Blackjack</CardTitle>
            <CardDescription>
              Selecciona los ganadores y procesa los resultados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4 p-3 border rounded-md bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="dealer-wins" className="font-medium">
                    Gana el Crupier (Casa Gana)
                  </Label>
                  <Switch
                    id="dealer-wins"
                    checked={dealerWins}
                    onCheckedChange={handleDealerWinsChange}
                  />
                </div>
                {dealerWins && (
                  <div className="text-sm text-muted-foreground">
                    Todos los jugadores perderán sus apuestas
                  </div>
                )}
              </div>

              <h3 className="text-sm font-medium">Seleccionar Ganadores</h3>
              {blackjackBets.length > 0 ? (
                <div className="space-y-2">
                  {Array.from(
                    new Set(blackjackBets.map((bet) => bet.userId))
                  ).map((userId) => {
                    const bet = blackjackBets.find((b) => b.userId === userId);
                    if (!bet) return null;

                    return (
                      <div
                        key={userId}
                        className={`p-3 border rounded-md cursor-pointer ${
                          dealerWins
                            ? "border-gray-200 opacity-50"
                            : blackjackWinners.includes(userId)
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200"
                        }`}
                        onClick={() => toggleBlackjackWinner(userId)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                dealerWins
                                  ? "bg-red-500 text-white"
                                  : blackjackWinners.includes(userId)
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-200"
                              }`}
                            >
                              {dealerWins ? (
                                <X className="h-4 w-4" />
                              ) : blackjackWinners.includes(userId) ? (
                                <Check className="h-4 w-4" />
                              ) : null}
                            </div>
                            <span className="ml-2 font-medium">
                              {bet.username}
                            </span>
                          </div>
                          <span className="font-bold">
                            {bet.amount} monedas
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay apuestas pendientes
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleBlackjackResults}
              disabled={
                loading ||
                (!dealerWins && blackjackWinners.length === 0) ||
                blackjackBets.length === 0
              }
            >
              Procesar Resultados
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="poker">
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Póker</CardTitle>
            <CardDescription>
              Selecciona los ganadores y procesa los resultados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Seleccionar Ganadores</h3>
              {pokerBets.length > 0 ? (
                <div className="space-y-2">
                  {Array.from(new Set(pokerBets.map((bet) => bet.userId))).map(
                    (userId) => {
                      const bet = pokerBets.find((b) => b.userId === userId);
                      if (!bet) return null;

                      return (
                        <div
                          key={userId}
                          className={`p-3 border rounded-md cursor-pointer ${
                            pokerWinners.includes(userId)
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200"
                          }`}
                          onClick={() => togglePokerWinner(userId)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  pokerWinners.includes(userId)
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-200"
                                }`}
                              >
                                {pokerWinners.includes(userId) ? (
                                  <Check className="h-4 w-4" />
                                ) : null}
                              </div>
                              <span className="ml-2 font-medium">
                                {bet.username}
                              </span>
                            </div>
                            <span className="font-bold">
                              {bet.amount} monedas
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay apuestas pendientes
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handlePokerResults}
              disabled={
                loading || pokerWinners.length === 0 || pokerBets.length === 0
              }
            >
              Procesar Resultados
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="horse-racing">
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Carreras de Caballos</CardTitle>
            <CardDescription>
              Selecciona el caballo ganador y procesa los resultados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Caballo Ganador</Label>
              <RadioGroup value={winningHorse} onValueChange={setWinningHorse}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {horses.map((horse) => (
                    <div key={horse.id} className="flex items-center space-x-2">
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
                            winningHorse === horse.id
                              ? "border-primary bg-primary/10"
                              : "border-muted"
                          }`}
                        >
                          <div className="font-medium">{horse.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Apuestas:{" "}
                            {
                              horseRacingBets.filter(
                                (bet) => bet.horse === horse.id
                              ).length
                            }
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Apuestas Actuales</h3>
              {horseRacingBets.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Jugador
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Caballo
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-gray-200">
                      {horseRacingBets.map((bet) => (
                        <tr key={bet.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {bet.username}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {horses.find((h) => h.id === bet.horse)?.name ||
                              "Desconocido"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                            {bet.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay apuestas pendientes
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleHorseRacingResults}
              disabled={
                loading || !winningHorse || horseRacingBets.length === 0
              }
            >
              Procesar Resultados
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="higher-lower">
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Higher or Lower</CardTitle>
            <CardDescription>
              Evalúa las predicciones de los jugadores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {higherLowerBets.length > 0 ? (
              <div className="space-y-4">
                {higherLowerBets.map((bet) => (
                  <Card key={bet.id} className="border-2 border-muted">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          {bet.username}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                            Ronda:{" "}
                            <span className="font-bold">
                              {bet.currentRound || 1}
                            </span>
                          </span>
                          <span className="px-2 py-1 bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-foreground rounded-md text-xs font-medium">
                            Multiplicador: x{bet.multiplier || 1.5}
                          </span>
                        </div>
                      </div>
                      <CardDescription>
                        Apuesta inicial:{" "}
                        <span className="font-semibold text-black dark:text-white">
                          {bet.amount} monedas
                        </span>{" "}
                        | Ganancias potenciales:{" "}
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {(
                            bet.amount *
                            Math.pow(
                              bet.multiplier || 1.5,
                              (bet.currentRound || 1) - 1
                            )
                          ).toFixed(0)}{" "}
                          monedas
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-2">
                        <Label>Resultado de la predicción</Label>
                        <RadioGroup
                          value={higherLowerAction}
                          onValueChange={(value) =>
                            setHigherLowerAction(
                              value as "correct" | "incorrect" | "cashout"
                            )
                          }
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="correct"
                              id={`correct-${bet.id}`}
                            />
                            <Label htmlFor={`correct-${bet.id}`}>
                              Predicción correcta (continuar)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="incorrect"
                              id={`incorrect-${bet.id}`}
                            />
                            <Label htmlFor={`incorrect-${bet.id}`}>
                              Predicción incorrecta (pierde)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="cashout"
                              id={`cashout-${bet.id}`}
                            />
                            <Label htmlFor={`cashout-${bet.id}`}>
                              Jugador se retira (cobra ganancias)
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleHigherLowerResults(bet.id)}
                        disabled={loading}
                        className="w-full"
                      >
                        Procesar Resultado
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay apuestas pendientes
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
