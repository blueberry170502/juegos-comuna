"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase-hooks";
import { db } from "@/lib/firebase-config";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Coins, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function HigherLowerBetting() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasActiveBet, setHasActiveBet] = useState(false);
  const [accumulatedWinnings, setAccumulatedWinnings] = useState(0);
  interface Bet {
    id: string;
    userId: string;
    username: string;
    game: string;
    amount: number;
    multiplier: number;
    status: string;
    timestamp?: any;
    currentRound: number;
    isActive: boolean;
  }

  const [currentBet, setCurrentBet] = useState<Bet | null>(null);

  // Reemplazar el objeto difficultyMultipliers con una constante
  const MULTIPLIER = 1.5;

  // Función para actualizar los datos de la apuesta
  const fetchUserBets = async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      const betsRef = collection(db, "bets");
      const q = query(
        betsRef,
        where("userId", "==", user.uid),
        where("game", "==", "higher-lower"),
        where("isActive", "==", true)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const betDoc = querySnapshot.docs[0];
        const betData = betDoc.data();
        console.log("Apuesta activa encontrada:", betData);

        setCurrentBet({
          id: betDoc.id,
          userId: betData.userId,
          username: betData.username,
          game: betData.game,
          amount: betData.amount,
          multiplier: betData.multiplier,
          status: betData.status,
          timestamp: betData.timestamp,
          currentRound: betData.currentRound,
          isActive: betData.isActive,
        });
        setHasActiveBet(true);

        // Calcular ganancias acumuladas con el multiplicador fijo
        const rounds = betData.currentRound || 1;
        setAccumulatedWinnings(
          betData.amount * Math.pow(MULTIPLIER, rounds - 1)
        );
      } else {
        console.log("No se encontraron apuestas activas");
        setCurrentBet(null);
        setHasActiveBet(false);
        setAccumulatedWinnings(0);
      }
    } catch (error) {
      console.error("Error fetching bets:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Cargar apuestas al iniciar
  useEffect(() => {
    fetchUserBets();
  }, [user]);

  // Actualizar la función handleBet para usar el multiplicador fijo
  const handleBet = async () => {
    if (!user || !userData) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para apostar",
        variant: "destructive",
      });
      return;
    }

    const betAmount = Number.parseInt(amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      toast({
        title: "Error",
        description: "Ingresa un monto válido",
        variant: "destructive",
      });
      return;
    }

    if (betAmount > userData.balance) {
      toast({
        title: "Error",
        description: "No tienes suficientes monedas",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Crear la apuesta en Firestore con multiplicador fijo
      const betRef = await addDoc(collection(db, "bets"), {
        userId: user.uid,
        username: userData.username,
        game: "higher-lower",
        amount: betAmount,
        multiplier: MULTIPLIER,
        status: "pending",
        timestamp: serverTimestamp(),
        currentRound: 1,
        isActive: true,
      });

      console.log("Apuesta creada con ID:", betRef.id);

      // Actualizar el saldo del usuario
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - betAmount,
      });

      toast({
        title: "Apuesta realizada",
        description: `Has apostado ${betAmount} monedas`,
      });

      // Actualizar el estado para mostrar la apuesta en progreso
      setCurrentBet({
        id: betRef.id,
        userId: user.uid,
        username: userData.username,
        game: "higher-lower",
        amount: betAmount,
        multiplier: MULTIPLIER,
        status: "pending",
        currentRound: 1,
        isActive: true,
      });
      setHasActiveBet(true);
      setAccumulatedWinnings(betAmount); // Inicialmente las ganancias son iguales a la apuesta
      setAmount(""); // Limpiar el campo de entrada
    } catch (error) {
      console.error("Error al realizar la apuesta:", error);
      toast({
        title: "Error",
        description: "No se pudo realizar la apuesta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apuesta en Higher or Lower</CardTitle>
        <CardDescription>
          Adivina si algo es más famoso que otra cosa y gana monedas con cada
          acierto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasActiveBet ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto de la apuesta</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ingresa el monto"
                  disabled={loading}
                />
                <Coins className="h-5 w-5 text-muted-foreground" />
              </div>
              {userData && (
                <p className="text-sm text-muted-foreground">
                  Saldo actual: {userData.balance} monedas
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Multiplicador por ronda: x{MULTIPLIER}
              </p>
            </div>
          </>
        ) : null}

        {hasActiveBet && currentBet && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-md dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-primary dark:text-white">
              Apuesta en progreso
            </h3>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ronda actual:
                </span>
                <span className="font-bold text-black dark:text-white">
                  {currentBet.currentRound || 1}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Apuesta inicial:
                </span>
                <span className="font-bold text-black dark:text-white">
                  {currentBet.amount} monedas
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Multiplicador por ronda:
                </span>
                <span className="font-bold text-black dark:text-white">
                  x{currentBet.multiplier || 1.5}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ganancias acumuladas:
                </span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {accumulatedWinnings.toFixed(0)} monedas
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!hasActiveBet ? (
          <Button
            onClick={handleBet}
            disabled={loading || !amount}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                Procesando...
              </span>
            ) : (
              "Realizar Apuesta"
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={fetchUserBets}
            disabled={refreshing}
            className="w-full"
          >
            {refreshing ? (
              <span className="flex items-center justify-center">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar estado
              </span>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
