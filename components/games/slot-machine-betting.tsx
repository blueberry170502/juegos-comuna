"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-hooks";
import { db } from "@/lib/firebase-config";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus } from "lucide-react";

interface SlotBet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  linesPlayed: number;
  betPerLine: number;
  timestamp: any;
  status: "pending" | "won" | "lost";
  winAmount?: number;
}

// Símbolos de la máquina tragaperras
const SYMBOLS = [
  { id: "cherry", name: "Cherry", value: 1, color: "text-red-500" },
  { id: "lemon", name: "Lemon", value: 2, color: "text-yellow-500" },
  { id: "orange", name: "Orange", value: 3, color: "text-orange-500" },
  { id: "plum", name: "Plum", value: 4, color: "text-purple-500" },
  { id: "bell", name: "Bell", value: 5, color: "text-yellow-400" },
  { id: "seven", name: "Seven", value: 7, color: "text-green-500" },
  { id: "bar", name: "BAR", value: 10, color: "text-blue-500" },
  { id: "diamond", name: "Diamond", value: 15, color: "text-cyan-500" },
];

// Líneas de pago (para una máquina 3x3)
const PAYLINES = [
  [0, 1, 2], // Horizontal superior
  [3, 4, 5], // Horizontal medio
  [6, 7, 8], // Horizontal inferior
  [0, 4, 8], // Diagonal descendente
  [6, 4, 2], // Diagonal ascendente
];

// Tabla de pagos
const PAYTABLE = [
  { symbols: ["cherry", "cherry", "cherry"], multiplier: 2 },
  { symbols: ["lemon", "lemon", "lemon"], multiplier: 3 },
  { symbols: ["orange", "orange", "orange"], multiplier: 4 },
  { symbols: ["plum", "plum", "plum"], multiplier: 5 },
  { symbols: ["bell", "bell", "bell"], multiplier: 10 },
  { symbols: ["seven", "seven", "seven"], multiplier: 20 },
  { symbols: ["bar", "bar", "bar"], multiplier: 50 },
  { symbols: ["diamond", "diamond", "diamond"], multiplier: 100 },
  // Combinaciones especiales
  { symbols: ["seven", "seven", "any"], multiplier: 5 },
  { symbols: ["any", "seven", "seven"], multiplier: 5 },
  { symbols: ["bar", "bar", "any"], multiplier: 10 },
  { symbols: ["any", "bar", "bar"], multiplier: 10 },
];

export default function SlotMachineBetting() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [betPerLine, setBetPerLine] = useState(1);
  const [linesPlayed, setLinesPlayed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<string[][]>([
    [SYMBOLS[0].id, SYMBOLS[1].id, SYMBOLS[2].id],
    [SYMBOLS[1].id, SYMBOLS[2].id, SYMBOLS[3].id],
    [SYMBOLS[2].id, SYMBOLS[3].id, SYMBOLS[4].id],
  ]);
  const [visibleSymbols, setVisibleSymbols] = useState<string[]>(
    Array(9).fill(SYMBOLS[0].id)
  );
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [winAmount, setWinAmount] = useState(0);
  const [totalBet, setTotalBet] = useState(0);
  const [userBets, setUserBets] = useState<SlotBet[]>([]);
  const [showPaytable, setShowPaytable] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef(autoPlay);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Actualizar la referencia cuando cambia autoPlay
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    // Calcular apuesta total
    setTotalBet(betPerLine * linesPlayed);
  }, [betPerLine, linesPlayed]);

  useEffect(() => {
    const fetchBets = async () => {
      if (!user) return;

      try {
        const betsRef = collection(db, "bets");
        const q = query(
          betsRef,
          where("game", "==", "slots"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const fetchedBets: SlotBet[] = [];
        querySnapshot.forEach((doc) => {
          const betData = doc.data() as SlotBet;
          betData.id = doc.id;
          fetchedBets.push(betData);
        });

        // Ordenar por timestamp (más reciente primero)
        fetchedBets.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp.seconds - a.timestamp.seconds;
        });

        setUserBets(fetchedBets);
      } catch (error) {
        console.error("Error fetching bets:", error);
      }
    };

    fetchBets();
  }, [user]);

  // Función para generar símbolos aleatorios
  const generateRandomSymbols = () => {
    const newReels = [
      Array(3)
        .fill(0)
        .map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id),
      Array(3)
        .fill(0)
        .map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id),
      Array(3)
        .fill(0)
        .map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id),
    ];
    return newReels;
  };

  // Función para aplanar los carretes en una matriz visible
  const flattenReels = (reels: string[][]) => {
    return [
      reels[0][0],
      reels[1][0],
      reels[2][0],
      reels[0][1],
      reels[1][1],
      reels[2][1],
      reels[0][2],
      reels[1][2],
      reels[2][2],
    ];
  };

  // Función para verificar si una línea es ganadora
  const checkWinningLine = (symbols: string[], line: number[]) => {
    const lineSymbols = line.map((index) => symbols[index]);

    for (const paytableEntry of PAYTABLE) {
      let matches = true;

      for (let i = 0; i < paytableEntry.symbols.length; i++) {
        if (
          paytableEntry.symbols[i] !== "any" &&
          paytableEntry.symbols[i] !== lineSymbols[i]
        ) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return paytableEntry.multiplier;
      }
    }

    return 0;
  };

  // Función para calcular ganancias
  const calculateWinnings = (symbols: string[]) => {
    let totalWin = 0;
    const winLines: number[] = [];

    // Verificar cada línea de pago
    for (let i = 0; i < PAYLINES.length; i++) {
      // Solo verificar las líneas que el jugador ha apostado
      if (i < linesPlayed) {
        const multiplier = checkWinningLine(symbols, PAYLINES[i]);
        if (multiplier > 0) {
          // Calcular ganancias: apuesta por línea * multiplicador
          totalWin += betPerLine * multiplier;
          winLines.push(i);
        }
      }
    }

    return { totalWin, winLines };
  };

  // Función para incrementar la apuesta por línea
  const increaseBetPerLine = () => {
    if (betPerLine < 10) {
      setBetPerLine(betPerLine + 1);
    }
  };

  // Función para decrementar la apuesta por línea
  const decreaseBetPerLine = () => {
    if (betPerLine > 1) {
      setBetPerLine(betPerLine - 1);
    }
  };

  // Función para incrementar las líneas jugadas
  const increaseLines = () => {
    if (linesPlayed < PAYLINES.length) {
      setLinesPlayed(linesPlayed + 1);
    }
  };

  // Función para decrementar las líneas jugadas
  const decreaseLines = () => {
    if (linesPlayed > 1) {
      setLinesPlayed(linesPlayed - 1);
    }
  };

  // Función para apostar la cantidad máxima
  const betMax = () => {
    setBetPerLine(10);
    setLinesPlayed(PAYLINES.length);
  };

  // Función para girar los carretes
  const spin = async () => {
    if (!userData || !user) {
      toast({
        title: "Error",
        description: "You must be logged in to play",
        variant: "destructive",
      });
      return;
    }

    if (totalBet > userData.balance) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough coins for this bet",
        variant: "destructive",
      });
      return;
    }

    if (spinning) return;

    setSpinning(true);
    setWinningLines([]);
    setWinAmount(0);

    try {
      // Actualizar saldo del usuario
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - totalBet,
      });

      // Simular giro de carretes
      const spinDuration = 2000; // 2 segundos
      const spinFrames = 20;
      const frameInterval = spinDuration / spinFrames;

      // Animación de giro
      for (let frame = 0; frame < spinFrames; frame++) {
        setTimeout(() => {
          const randomReels = generateRandomSymbols();
          setReels(randomReels);
          setVisibleSymbols(flattenReels(randomReels));
        }, frame * frameInterval);
      }

      // Resultado final
      setTimeout(async () => {
        const finalReels = generateRandomSymbols();
        setReels(finalReels);
        const finalSymbols = flattenReels(finalReels);
        setVisibleSymbols(finalSymbols);

        // Calcular ganancias
        const { totalWin, winLines } = calculateWinnings(finalSymbols);
        setWinAmount(totalWin);
        setWinningLines(winLines);

        // Registrar apuesta en la base de datos
        const betRef = await addDoc(collection(db, "bets"), {
          userId: user.uid,
          username: userData.username,
          game: "slots",
          amount: totalBet,
          linesPlayed,
          betPerLine,
          timestamp: serverTimestamp(),
          status: totalWin > 0 ? "won" : "lost",
          winAmount: totalWin,
        });

        // Verificar si hay más de 5 apuestas y eliminar la más antigua
        const betsRef = collection(db, "bets");
        const q = query(
          betsRef,
          where("game", "==", "slots"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "asc")
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.size > 5) {
          const oldestBet = querySnapshot.docs[0];
          await deleteDoc(oldestBet.ref);
        }

        // Si hay ganancias, actualizar saldo
        if (totalWin > 0) {
          await updateDoc(userRef, {
            // Devolver la apuesta original + las ganancias
            balance: userData.balance + totalWin,
          });

          toast({
            title: "You won!",
            description: `You won ${totalWin} coins!`,
          });
        }

        // Actualizar lista de apuestas
        const newBet: SlotBet = {
          id: betRef.id,
          userId: user.uid,
          username: userData.username,
          amount: totalBet,
          linesPlayed,
          betPerLine,
          timestamp: { seconds: Date.now() / 1000 },
          status: totalWin > 0 ? "won" : "lost",
          winAmount: totalWin,
        };

        setUserBets((prevBets) => {
          const updatedBets = [newBet, ...prevBets];
          if (updatedBets.length > 5) {
            updatedBets.pop(); // Elimina la apuesta más antigua (última en la lista)
          }
          return updatedBets;
        });
        setSpinning(false);

        // Si autoPlay está activado, programar el siguiente giro
        if (autoPlayRef.current) {
          // Calcular el nuevo saldo después de esta ronda
          // Si hay ganancias, se suma al saldo (ya incluye la apuesta original)
          const newBalance =
            totalWin > 0
              ? userData.balance + totalWin
              : userData.balance - totalBet;

          // Solo programar el siguiente giro si hay suficiente saldo
          if (newBalance >= totalBet) {
            spinTimeoutRef.current = setTimeout(() => {
              // Actualizar el userData local para que el siguiente spin tenga el saldo correcto
              userData.balance = newBalance;
              spin();
            }, 1500);
          } else {
            // Detener autoplay si no hay suficiente saldo
            setAutoPlay(false);
            toast({
              title: "Autoplay stopped",
              description: "Insufficient balance for next spin",
            });
          }
        }
      }, spinDuration);
    } catch (error) {
      console.error("Error placing bet:", error);
      toast({
        title: "Error",
        description: "Failed to place bet. Please try again.",
        variant: "destructive",
      });
      setSpinning(false);
    }
  };

  // Detener autoplay
  const stopAutoPlay = () => {
    setAutoPlay(false);
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
  };

  // Renderizar símbolo
  const renderSymbol = (symbolId: string) => {
    const symbol = SYMBOLS.find((s) => s.id === symbolId);
    if (!symbol) return null;

    return (
      <div className={`text-2xl font-bold ${symbol.color}`}>
        {symbol.id === "cherry" && "🍒"}
        {symbol.id === "lemon" && "🍋"}
        {symbol.id === "orange" && "🍊"}
        {symbol.id === "plum" && "🍇"}
        {symbol.id === "bell" && "🔔"}
        {symbol.id === "seven" && "7️⃣"}
        {symbol.id === "bar" && "BAR"}
        {symbol.id === "diamond" && "💎"}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Máquina Tragaperras</CardTitle>
              <CardDescription>
                ¡Gira los carretes y prueba tu suerte!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Máquina tragaperras */}
              <div className="bg-gray-800 p-6 rounded-lg">
                {/* Carretes */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {Array.from({ length: 9 }).map((_, index) => {
                    const isWinningSymbol = winningLines.some((line) =>
                      PAYLINES[line].includes(index)
                    );

                    return (
                      <div
                        key={index}
                        className={`aspect-square flex items-center justify-center bg-gray-700 rounded-md border-2 ${
                          isWinningSymbol
                            ? "border-yellow-400 animate-pulse"
                            : "border-gray-600"
                        }`}
                      >
                        {renderSymbol(visibleSymbols[index])}
                      </div>
                    );
                  })}
                </div>

                {/* Controles de apuesta */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-white">Apuesta por Línea</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={decreaseBetPerLine}
                        disabled={spinning || betPerLine <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="bg-gray-700 text-white px-4 py-2 rounded-md w-16 text-center">
                        {betPerLine}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={increaseBetPerLine}
                        disabled={spinning || betPerLine >= 10}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Líneas</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={decreaseLines}
                        disabled={spinning || linesPlayed <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="bg-gray-700 text-white px-4 py-2 rounded-md w-16 text-center">
                        {linesPlayed}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={increaseLines}
                        disabled={spinning || linesPlayed >= PAYLINES.length}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Apuesta total y botones */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white">
                    <span className="text-gray-400">Apuesta Total:</span>{" "}
                    {totalBet} monedas
                  </div>
                  <div className="text-white">
                    <span className="text-gray-400">Ganancia:</span> {winAmount}{" "}
                    monedas
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button
                    onClick={spin}
                    disabled={
                      spinning || !userData || userData.balance < totalBet
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {spinning ? "Girando..." : "Girar"}
                  </Button>
                  <Button
                    onClick={betMax}
                    disabled={
                      spinning ||
                      (betPerLine === 10 && linesPlayed === PAYLINES.length)
                    }
                    variant="outline"
                  >
                    Apuesta Máxima
                  </Button>
                  <Button
                    onClick={() =>
                      autoPlay ? stopAutoPlay() : setAutoPlay(true)
                    }
                    disabled={spinning && !autoPlay}
                    variant={autoPlay ? "destructive" : "secondary"}
                  >
                    {autoPlay ? "Detener Auto" : "Auto Play"}
                  </Button>
                </div>
              </div>

              {/* Tabla de pagos */}
              <div>
                <Button
                  variant="outline"
                  onClick={() => setShowPaytable(!showPaytable)}
                  className="w-full"
                >
                  {showPaytable
                    ? "Ocultar Tabla de Pagos"
                    : "Mostrar Tabla de Pagos"}
                </Button>

                {showPaytable && (
                  <div className="mt-4 border rounded-md p-4">
                    <h3 className="font-bold mb-2">
                      Tabla de Pagos (Multiplicadores)
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYTABLE.slice(0, 8).map((entry, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center border-b pb-1"
                        >
                          <div className="flex space-x-1">
                            {entry.symbols.map((symbol, i) => (
                              <span key={i}>{renderSymbol(symbol)}</span>
                            ))}
                          </div>
                          <span className="font-bold">x{entry.multiplier}</span>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-bold mt-4 mb-2">
                      Combinaciones Especiales
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYTABLE.slice(8).map((entry, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center border-b pb-1"
                        >
                          <div className="flex space-x-1">
                            {entry.symbols.map((symbol, i) => (
                              <span key={i}>
                                {symbol === "any"
                                  ? "Cualquiera"
                                  : renderSymbol(symbol)}
                              </span>
                            ))}
                          </div>
                          <span className="font-bold">x{entry.multiplier}</span>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-bold mt-4 mb-2">Líneas de Pago</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {PAYLINES.map((line, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <span className="font-bold">{index + 1}:</span>
                          <div className="flex-1 h-6 bg-gray-200 rounded-md relative">
                            {line.map((pos) => {
                              const row = Math.floor(pos / 3);
                              const col = pos % 3;
                              return (
                                <div
                                  key={pos}
                                  className="absolute w-2 h-2 bg-primary rounded-full"
                                  style={{
                                    left: `${col * 33.33 + 16.67}%`,
                                    top: `${row * 33.33 + 16.67}%`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              <CardTitle>Tus Apuestas</CardTitle>
              <CardDescription>
                Apuestas recientes en la máquina tragaperras
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userBets.length > 0 ? (
                <ul className="space-y-4">
                  {userBets.slice(0, 10).map((bet) => (
                    <li key={bet.id} className="border-b pb-2">
                      <div className="flex justify-between">
                        <span
                          className={
                            bet.status === "won"
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {bet.status === "won" ? "Ganado" : "Perdido"}
                        </span>
                        <span className="font-bold">{bet.amount} monedas</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Apuesta: {bet.betPerLine} x {bet.linesPlayed} líneas
                      </div>
                      {bet.winAmount && bet.winAmount > 0 && (
                        <div className="text-sm text-green-600 mt-1">
                          Ganado: {bet.winAmount} monedas
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {bet.timestamp
                          ? new Date(
                              bet.timestamp.seconds * 1000
                            ).toLocaleString()
                          : "Justo ahora"}
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
