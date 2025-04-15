"use client";

import { useState, useEffect, useRef } from "react";
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
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, Trash2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import "../../styles/roulette-table.css";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type BetType =
  | "number"
  | "color"
  | "section"
  | "dozen"
  | "column"
  | "evenOdd"
  | "highLow";

interface RouletteBet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  betType: BetType;
  betValue: string;
  timestamp: any;
  status: "pending" | "won" | "lost";
}

interface BetPosition {
  x: number;
  y: number;
  betType: BetType;
  betValue: string;
  amount: number;
}

interface UserBet {
  userId: string;
  username: string;
  color: string;
  bets: BetPosition[];
}

// Define 20 colores distintos para los jugadores
const USER_COLORS = [
  "#FF5252", // Rojo
  "#2196F3", // Azul
  "#4CAF50", // Verde
  "#FF9800", // Naranja
  "#9C27B0", // Púrpura
  "#00BCD4", // Cian
  "#FFEB3B", // Amarillo
  "#795548", // Marrón
  "#607D8B", // Azul grisáceo
  "#E91E63", // Rosa
  "#3F51B5", // Índigo
  "#009688", // Verde azulado
  "#FFC107", // Ámbar
  "#673AB7", // Violeta profundo
  "#8BC34A", // Lima
  "#FF5722", // Naranja profundo
  "#CDDC39", // Lima-limón
  "#03A9F4", // Azul claro
  "#F44336", // Rojo intenso
  "#9E9E9E", // Gris
];

// Define red numbers in European roulette
const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export default function InteractiveRouletteTable() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [currentBetAmount, setCurrentBetAmount] = useState(10);
  const [existingBets, setExistingBets] = useState<BetPosition[]>([]); // Apuestas ya realizadas
  const [pendingBets, setPendingBets] = useState<BetPosition[]>([]); // Apuestas nuevas pendientes
  const [allUserBets, setAllUserBets] = useState<UserBet[]>([]);
  const [totalExistingAmount, setTotalExistingAmount] = useState(0); // Monto total de apuestas existentes
  const [totalPendingAmount, setTotalPendingAmount] = useState(0); // Monto total de apuestas pendientes
  const [loading, setLoading] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [showPayouts, setShowPayouts] = useState(false);
  const [userColorMap, setUserColorMap] = useState<Map<string, string>>(
    new Map()
  );
  const [existingBetIds, setExistingBetIds] = useState<Map<string, string>>(
    new Map()
  ); // Para almacenar IDs de apuestas
  const [totalBetAmount, setTotalBetAmount] = useState(0);
  const [showBetSummary, setShowBetSummary] = useState(false);

  // Detectar si estamos en móvil
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fetch existing bets when component mounts
  useEffect(() => {
    fetchExistingBets();
  }, [user]);

  const fetchExistingBets = async () => {
    if (!user) return;

    try {
      const betsRef = collection(db, "bets");
      const q = query(
        betsRef,
        where("game", "==", "roulette"),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(q);

      const userBetsMap = new Map<string, UserBet>();
      const colorMap = new Map<string, string>(userColorMap);
      const betIdsMap = new Map<string, string>(); // Para almacenar IDs de apuestas
      let colorIndex = 0;

      // Primero, procesar todas las apuestas
      querySnapshot.forEach((doc) => {
        const betData = doc.data() as RouletteBet;
        betData.id = doc.id;

        // Skip processing if missing essential data
        if (
          !betData.userId ||
          !betData.username ||
          !betData.betType ||
          !betData.betValue
        )
          return;

        // Assign a color to this user if they don't have one yet
        if (!colorMap.has(betData.userId)) {
          colorMap.set(
            betData.userId,
            USER_COLORS[colorIndex % USER_COLORS.length]
          );
          colorIndex++;
        }

        // Get or create user bet entry
        if (!userBetsMap.has(betData.userId)) {
          userBetsMap.set(betData.userId, {
            userId: betData.userId,
            username: betData.username,
            color: colorMap.get(betData.userId) || "#000000",
            bets: [],
          });
        }

        const userBet = userBetsMap.get(betData.userId)!;

        // Add bet position
        const position = getBetPosition(betData.betType, betData.betValue);
        if (position) {
          // Crear una clave única para esta apuesta
          const betKey = `${betData.betType}-${betData.betValue}`;

          // Guardar el ID de la apuesta para el usuario actual
          if (betData.userId === user.uid) {
            betIdsMap.set(betKey, betData.id);
          }

          // Check if there's already a bet on this position
          const existingBetIndex = userBet.bets.findIndex(
            (bet) =>
              bet.betType === betData.betType &&
              bet.betValue === betData.betValue
          );

          if (existingBetIndex >= 0) {
            // Replace existing bet
            userBet.bets[existingBetIndex] = {
              ...position,
              amount: betData.amount,
            };
          } else {
            // Add new bet
            userBet.bets.push({
              ...position,
              amount: betData.amount,
            });
          }
        }
      });

      // Update color map
      setUserColorMap(colorMap);

      // Guardar los IDs de las apuestas
      setExistingBetIds(betIdsMap);

      // Convert map to array
      const userBets = Array.from(userBetsMap.values());

      // If current user has pending bets, update the existingBets state
      const currentUserBet = userBets.find((bet) => bet.userId === user.uid);
      if (currentUserBet) {
        setExistingBets(currentUserBet.bets);
        setTotalExistingAmount(
          currentUserBet.bets.reduce((sum, bet) => sum + bet.amount, 0)
        );
        setPendingBets([]); // Inicializar pendingBets como vacío
        setTotalPendingAmount(0);

        // Remove current user from all users bets to avoid duplication
        setAllUserBets(userBets.filter((bet) => bet.userId !== user.uid));
      } else {
        setExistingBets([]);
        setTotalExistingAmount(0);
        setPendingBets([]);
        setTotalPendingAmount(0);
        setAllUserBets(userBets);
      }
    } catch (error) {
      console.error("Error fetching bets:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las apuestas existentes",
        variant: "destructive",
      });
    }
  };

  // Helper function to get position for a bet
  const getBetPosition = (
    betType: BetType,
    betValue: string
  ): BetPosition | null => {
    // For number bets
    if (betType === "number") {
      if (betValue === "0") {
        return { x: 0, y: 0, betType, betValue, amount: 0 };
      } else if (betValue === "00") {
        return { x: 0, y: 1, betType, betValue, amount: 0 };
      }

      const num = Number.parseInt(betValue);
      if (isNaN(num)) return null;

      // Calculate position based on the number's position in the grid
      const row = Math.floor((num - 1) / 12);
      const col = (num - 1) % 12;

      return {
        x: col + 1, // +1 to account for zeros column
        y: row,
        betType,
        betValue,
        amount: 0,
      };
    }

    // For other bet types
    if (betType === "color") {
      return {
        x: betValue === "red" ? 3 : 4,
        y: 4,
        betType,
        betValue,
        amount: 0,
      };
    }

    if (betType === "evenOdd") {
      return {
        x: betValue === "even" ? 2 : 5,
        y: 4,
        betType,
        betValue,
        amount: 0,
      };
    }

    if (betType === "highLow") {
      return {
        x: betValue === "1-18" ? 1 : 6,
        y: 4,
        betType,
        betValue,
        amount: 0,
      };
    }

    if (betType === "dozen") {
      if (betValue === "1-12")
        return { x: 2, y: 3, betType, betValue, amount: 0 };
      if (betValue === "13-24")
        return { x: 6, y: 3, betType, betValue, amount: 0 };
      if (betValue === "25-36")
        return { x: 10, y: 3, betType, betValue, amount: 0 };
    }

    if (betType === "column") {
      if (betValue === "1st")
        return { x: 14, y: 0, betType, betValue, amount: 0 };
      if (betValue === "2nd")
        return { x: 14, y: 1, betType, betValue, amount: 0 };
      if (betValue === "3rd")
        return { x: 14, y: 2, betType, betValue, amount: 0 };
    }

    return null;
  };

  const handleCellClick = (betType: BetType, betValue: string) => {
    if (!userData) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar apuestas",
        variant: "destructive",
      });
      return;
    }

    if (currentBetAmount <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad a apostar debe ser mayor que cero",
        variant: "destructive",
      });
      return;
    }

    // Calcular el total que se apostaría (existente + pendiente + nueva apuesta)
    const totalAfterBet =
      totalExistingAmount + totalPendingAmount + currentBetAmount;

    if (totalAfterBet > userData.balance) {
      toast({
        title: "Saldo insuficiente",
        description: "No tienes suficiente saldo para realizar esta apuesta",
        variant: "destructive",
      });
      return;
    }

    // Check if there's already a pending bet on this position
    const existingPendingBetIndex = pendingBets.findIndex(
      (bet) => bet.betType === betType && bet.betValue === betValue
    );

    if (existingPendingBetIndex >= 0) {
      // Acumular la apuesta pendiente
      const updatedBets = [...pendingBets];
      updatedBets[existingPendingBetIndex].amount += currentBetAmount;
      setPendingBets(updatedBets);
      setTotalPendingAmount(totalPendingAmount + currentBetAmount);
    } else {
      // Add new pending bet
      const position = getBetPosition(betType, betValue);
      if (position) {
        setPendingBets([
          ...pendingBets,
          { ...position, amount: currentBetAmount },
        ]);
        setTotalPendingAmount(totalPendingAmount + currentBetAmount);
      }
    }
  };

  const handlePlaceBets = async () => {
    if (!userData || !user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar apuestas",
        variant: "destructive",
      });
      return;
    }

    if (pendingBets.length === 0) {
      toast({
        title: "Sin apuestas",
        description: "No has realizado ninguna apuesta nueva",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Update user balance - solo restar el monto de las apuestas pendientes
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - totalPendingAmount,
      });

      // Add each pending bet to the database
      for (const bet of pendingBets) {
        // Crear una clave única para esta apuesta
        const betKey = `${bet.betType}-${bet.betValue}`;

        // Verificar si ya existe una apuesta para esta posición
        if (existingBetIds.has(betKey)) {
          // Actualizar la apuesta existente, sumando el nuevo monto al existente
          const betId = existingBetIds.get(betKey)!;
          const betRef = doc(db, "bets", betId);

          // Obtener la apuesta actual para sumar el monto
          const betDoc = await getDoc(betRef);
          if (betDoc.exists()) {
            const currentAmount = betDoc.data().amount || 0;
            await updateDoc(betRef, {
              amount: currentAmount + bet.amount,
              timestamp: serverTimestamp(),
            });
          } else {
            // Si por alguna razón la apuesta ya no existe, crear una nueva
            const docRef = await addDoc(collection(db, "bets"), {
              userId: user.uid,
              username: userData.username,
              game: "roulette",
              amount: bet.amount,
              betType: bet.betType,
              betValue: bet.betValue,
              timestamp: serverTimestamp(),
              status: "pending",
            });
            existingBetIds.set(betKey, docRef.id);
          }
        } else {
          // Crear una nueva apuesta
          const docRef = await addDoc(collection(db, "bets"), {
            userId: user.uid,
            username: userData.username,
            game: "roulette",
            amount: bet.amount,
            betType: bet.betType,
            betValue: bet.betValue,
            timestamp: serverTimestamp(),
            status: "pending",
          });

          // Guardar el ID de la nueva apuesta
          existingBetIds.set(betKey, docRef.id);
        }
      }

      toast({
        title: "¡Apuestas realizadas!",
        description: `Has apostado un total de ${totalPendingAmount} monedas`,
      });

      // Assign a color to this user if they don't have one yet
      let userColor = userColorMap.get(user.uid);
      if (!userColor) {
        userColor = USER_COLORS[userColorMap.size % USER_COLORS.length];
        setUserColorMap(new Map(userColorMap.set(user.uid, userColor)));
      }

      // Clear pending bets
      setPendingBets([]);
      setTotalPendingAmount(0);

      // Refrescar las apuestas
      fetchExistingBets();
    } catch (error) {
      console.error("Error placing bets:", error);
      toast({
        title: "Error",
        description: "No se pudieron realizar las apuestas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearPendingBets = () => {
    setPendingBets([]);
    setTotalPendingAmount(0);
    toast({
      title: "Apuestas pendientes eliminadas",
      description: "Todas tus apuestas pendientes han sido eliminadas",
    });
  };

  const handleClearBets = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Eliminar todas las apuestas pendientes del usuario
      for (const [betKey, betId] of existingBetIds.entries()) {
        const betRef = doc(db, "bets", betId);
        await deleteDoc(betRef);
      }

      // Limpiar el estado
      setPendingBets([]);
      setTotalBetAmount(0);
      setExistingBetIds(new Map());

      toast({
        title: "Apuestas eliminadas",
        description: "Todas tus apuestas han sido eliminadas",
      });

      // Refrescar las apuestas
      fetchExistingBets();
    } catch (error) {
      console.error("Error clearing bets:", error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las apuestas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderChips = (betType: BetType, betValue: string) => {
    const chips = [];

    // Find existing bets at this position
    const existingBetsAtPosition = existingBets.filter(
      (bet) => bet.betType === betType && bet.betValue === betValue
    );
    const existingAmount = existingBetsAtPosition.reduce(
      (sum, bet) => sum + bet.amount,
      0
    );

    // Find pending bets at this position
    const pendingBetsAtPosition = pendingBets.filter(
      (bet) => bet.betType === betType && bet.betValue === betValue
    );
    const pendingAmount = pendingBetsAtPosition.reduce(
      (sum, bet) => sum + bet.amount,
      0
    );

    // Render existing bets (if any)
    if (existingAmount > 0) {
      const maxChipsPerRow = 3; // Máximo de fichas por fila
      const chipSize = 20; // Tamaño de cada ficha en píxeles
      const spacing = 5; // Espaciado entre fichas en píxeles

      existingBetsAtPosition.forEach((bet, index) => {
        // Calcular la posición relativa de cada ficha
        const row = Math.floor(index / maxChipsPerRow); // Fila de la ficha
        const col = index % maxChipsPerRow; // Columna de la ficha

        const offsetX =
          (col - Math.floor(maxChipsPerRow / 2)) * (chipSize + spacing);
        const offsetY = row * (chipSize + spacing);

        chips.push(
          <div
            key={`existing-${user?.uid}-${betType}-${betValue}-${index}`}
            className="chip"
            style={{
              backgroundColor: userColorMap.get(user?.uid || "") || "#ffffff",
              zIndex: 15 + index,
              top: `calc(50% + ${offsetY}px)`,
              left: `calc(50% + ${offsetX}px)`,
              boxShadow: "0 0 8px rgba(0, 0, 0, 0.5)",
              transform: `translate(-50%, -50%)`,
              transition: "transform 0.3s ease",
            }}
          >
            <span className="chip-value">{bet.amount}</span>
          </div>
        );
      });
    }

    // Render pending bets with a different color (if any)
    if (pendingAmount > 0) {
      // Usar un color más brillante para las apuestas pendientes
      const pendingColor = "#FFD700"; // Color dorado para apuestas pendientes

      // Calcular posición ligeramente desplazada para que se vean ambas fichas
      const offsetX = existingAmount > 0 ? 5 : 0;
      const offsetY = existingAmount > 0 ? -5 : 0;

      chips.push(
        <div
          key={`pending-${user?.uid}-${betType}-${betValue}`}
          className="chip pending-chip"
          style={{
            backgroundColor: pendingColor,
            border: "2px dashed #FF8C00",
            boxShadow: "0 0 8px rgba(255, 215, 0, 0.6)",
            transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
            zIndex: 20,
          }}
        >
          <span className="chip-value" style={{ color: "#000" }}>
            {pendingAmount}
          </span>
        </div>
      );
    }

    // Render other users' bets
    allUserBets.forEach((userBet, userIndex) => {
      const userBetsAtPosition = userBet.bets.filter(
        (bet) => bet.betType === betType && bet.betValue === betValue
      );

      if (userBetsAtPosition.length > 0) {
        const totalAmount = userBetsAtPosition.reduce(
          (sum, bet) => sum + bet.amount,
          0
        );
        const offsetX = ((userIndex % 3) - 1) * 15;
        const offsetY = Math.floor(userIndex / 3) * 15 - 15;

        chips.push(
          <div
            key={`user-${userBet.userId}-${betType}-${betValue}-${userIndex}`}
            className="other-player-chip"
            style={{
              backgroundColor: userBet.color,
              top: `calc(50% + ${offsetY}px)`,
              left: `calc(50% + ${offsetX}px)`,
              zIndex: 10,
            }}
            title={`${userBet.username}: ${totalAmount} monedas`}
          >
            <span className="chip-value">{totalAmount}</span>
          </div>
        );
      }
    });

    return chips;
  };

  // Función para obtener una descripción legible de una apuesta
  const getBetDescription = (bet: BetPosition): string => {
    switch (bet.betType) {
      case "number":
        return `Número ${bet.betValue}`;
      case "color":
        return bet.betValue === "red" ? "Rojo" : "Negro";
      case "evenOdd":
        return bet.betValue === "even" ? "Par" : "Impar";
      case "highLow":
        return bet.betValue === "1-18" ? "1-18" : "19-36";
      case "dozen":
        return `Docena ${bet.betValue}`;
      case "column":
        return `Columna ${bet.betValue}`;
      default:
        return `${bet.betType}: ${bet.betValue}`;
    }
  };

  // Calculate potential winnings for a bet
  const calculatePotentialWinnings = (
    betType: BetType,
    amount: number
  ): number => {
    switch (betType) {
      case "number":
        return amount * 36; // 35:1 plus original bet
      case "color":
      case "evenOdd":
      case "highLow":
        return amount * 2; // 1:1 plus original bet
      case "dozen":
      case "section":
      case "column":
        return amount * 3; // 2:1 plus original bet
      default:
        return 0;
    }
  };

  // Calculate total potential winnings
  const totalPotentialWinnings =
    existingBets.reduce(
      (sum, bet) => sum + calculatePotentialWinnings(bet.betType, bet.amount),
      0
    ) +
    pendingBets.reduce(
      (sum, bet) => sum + calculatePotentialWinnings(bet.betType, bet.amount),
      0
    );

  // Renderizar la mesa de ruleta en formato PC
  const renderDesktopRouletteTable = () => {
    return (
      <div className="roulette-felt">
        <div className="roulette-table">
          <div className="table-container">
            {/* Zeros section */}
            <div className="zeros-section">
              {/* Zero */}
              <div
                className="zero-cell"
                onClick={() => handleCellClick("number", "0")}
                onMouseEnter={() => setHoveredCell("0")}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <span className="text-white text-xl">0</span>
                {renderChips("number", "0")}
              </div>

              {/* Double Zero */}
              <div
                className="double-zero-cell"
                onClick={() => handleCellClick("number", "00")}
                onMouseEnter={() => setHoveredCell("00")}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <span className="text-white text-xl">00</span>
                {renderChips("number", "00")}
              </div>
            </div>

            {/* Main numbers grid */}
            <div className="numbers-section">
              {/* First row (3, 6, 9, ..., 36) */}
              {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map((num) => (
                <div
                  key={num}
                  className={cn(
                    "number-cell",
                    RED_NUMBERS.includes(num) ? "red" : "black",
                    hoveredCell === `number-${num}` && "bg-opacity-80"
                  )}
                  onClick={() => handleCellClick("number", num.toString())}
                  onMouseEnter={() => setHoveredCell(`number-${num}`)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <span className="text-white">{num}</span>
                  {renderChips("number", num.toString())}
                </div>
              ))}

              {/* Second row (2, 5, 8, ..., 35) */}
              {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map((num) => (
                <div
                  key={num}
                  className={cn(
                    "number-cell",
                    RED_NUMBERS.includes(num) ? "red" : "black",
                    hoveredCell === `number-${num}` && "bg-opacity-80"
                  )}
                  onClick={() => handleCellClick("number", num.toString())}
                  onMouseEnter={() => setHoveredCell(`number-${num}`)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <span className="text-white">{num}</span>
                  {renderChips("number", num.toString())}
                </div>
              ))}

              {/* Third row (1, 4, 7, ..., 34) */}
              {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map((num) => (
                <div
                  key={num}
                  className={cn(
                    "number-cell",
                    RED_NUMBERS.includes(num) ? "red" : "black",
                    hoveredCell === `number-${num}` && "bg-opacity-80"
                  )}
                  onClick={() => handleCellClick("number", num.toString())}
                  onMouseEnter={() => setHoveredCell(`number-${num}`)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <span className="text-white">{num}</span>
                  {renderChips("number", num.toString())}
                </div>
              ))}
            </div>

            {/* Column bets (2 to 1) */}
            <div className="column-bets">
              <div
                className="column-bet"
                onClick={() => handleCellClick("column", "1st")}
                onMouseEnter={() => setHoveredCell("column-1st")}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <span className="text-white">2 to 1</span>
                {renderChips("column", "1st")}
              </div>
              <div
                className="column-bet"
                onClick={() => handleCellClick("column", "2nd")}
                onMouseEnter={() => setHoveredCell("column-2nd")}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <span className="text-white">2 to 1</span>
                {renderChips("column", "2nd")}
              </div>
              <div
                className="column-bet"
                onClick={() => handleCellClick("column", "3rd")}
                onMouseEnter={() => setHoveredCell("column-3rd")}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <span className="text-white">2 to 1</span>
                {renderChips("column", "3rd")}
              </div>
            </div>
          </div>

          {/* Dozen bets */}
          <div className="dozen-bets">
            <div
              className="dozen-bet"
              onClick={() => handleCellClick("dozen", "1-12")}
              onMouseEnter={() => setHoveredCell("dozen-1st")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">1st 12</span>
              {renderChips("dozen", "1-12")}
            </div>
            <div
              className="dozen-bet"
              onClick={() => handleCellClick("dozen", "13-24")}
              onMouseEnter={() => setHoveredCell("dozen-2nd")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">2nd 12</span>
              {renderChips("dozen", "13-24")}
            </div>
            <div
              className="dozen-bet"
              onClick={() => handleCellClick("dozen", "25-36")}
              onMouseEnter={() => setHoveredCell("dozen-3rd")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">3rd 12</span>
              {renderChips("dozen", "25-36")}
            </div>
          </div>

          {/* Outside bets */}
          <div className="outside-bets">
            <div
              className="outside-bet"
              onClick={() => handleCellClick("highLow", "1-18")}
              onMouseEnter={() => setHoveredCell("low")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">1 TO 18</span>
              {renderChips("highLow", "1-18")}
            </div>
            <div
              className="outside-bet"
              onClick={() => handleCellClick("evenOdd", "even")}
              onMouseEnter={() => setHoveredCell("even")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">EVEN</span>
              {renderChips("evenOdd", "even")}
            </div>
            <div
              className="outside-bet red-diamond"
              onClick={() => handleCellClick("color", "red")}
              onMouseEnter={() => setHoveredCell("red")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              {renderChips("color", "red")}
            </div>
            <div
              className="outside-bet black-diamond"
              onClick={() => handleCellClick("color", "black")}
              onMouseEnter={() => setHoveredCell("black")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              {renderChips("color", "black")}
            </div>
            <div
              className="outside-bet"
              onClick={() => handleCellClick("evenOdd", "odd")}
              onMouseEnter={() => setHoveredCell("odd")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">ODD</span>
              {renderChips("evenOdd", "odd")}
            </div>
            <div
              className="outside-bet"
              onClick={() => handleCellClick("highLow", "19-36")}
              onMouseEnter={() => setHoveredCell("high")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">19 TO 36</span>
              {renderChips("highLow", "19-36")}
            </div>
          </div>
        </div>

        {/* Leyenda para diferenciar tipos de fichas */}
        <div className="bet-legend">
          <div className="legend-item">
            <div
              className="legend-color"
              style={{
                backgroundColor: userColorMap.get(user?.uid || "") || "#ffffff",
              }}
            ></div>
            <span className="text-white">Realizadas</span>
          </div>
          <div className="legend-item">
            <div
              className="legend-color"
              style={{
                backgroundColor: "#FFD700",
                border: "1px dashed #FF8C00",
              }}
            ></div>
            <span className="text-white">Pendientes</span>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar la mesa de ruleta en formato móvil (vertical)
  const renderMobileRouletteTable = () => {
    return (
      <div className="roulette-felt">
        <div className="roulette-table-mobile">
          {/* Sección de ceros */}
          <div className="zeros-section-mobile">
            <div
              className="zero-cell-mobile"
              onClick={() => handleCellClick("number", "0")}
              onMouseEnter={() => setHoveredCell("0")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">0</span>
              {renderChips("number", "0")}
            </div>
            <div
              className="zero-cell-mobile"
              onClick={() => handleCellClick("number", "00")}
              onMouseEnter={() => setHoveredCell("00")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">00</span>
              {renderChips("number", "00")}
            </div>
          </div>

          {/* Contenedor para números y docenas */}
          <div className="numbers-and-dozens-mobile">
            {/* Sección de números */}
            <div className="numbers-section-mobile">
              {/* Números del 1 al 36 en orden correcto */}
              {[
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
                19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
                35, 36,
              ].map((num) => (
                <div
                  key={num}
                  className={cn(
                    "number-cell-mobile",
                    RED_NUMBERS.includes(num) ? "red" : "black",
                    hoveredCell === `number-${num}` && "bg-opacity-80"
                  )}
                  onClick={() => handleCellClick("number", num.toString())}
                  onMouseEnter={() => setHoveredCell(`number-${num}`)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <span className="text-white">{num}</span>
                  {renderChips("number", num.toString())}
                </div>
              ))}
            </div>

            {/* Sección de docenas (a la derecha) */}
            <div className="dozens-section-mobile">
              <div
                className="dozen-bet-mobile"
                onClick={() => handleCellClick("dozen", "1-12")}
                onMouseEnter={() => setHoveredCell("dozen-1st")}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <span className="text-white">1-12</span>
                {renderChips("dozen", "1-12")}
              </div>
              <div
                className="dozen-bet-mobile"
                onClick={() => handleCellClick("dozen", "13-24")}
                onMouseEnter={() => setHoveredCell("dozen-2nd")}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <span className="text-white">13-24</span>
                {renderChips("dozen", "13-24")}
              </div>
              <div
                className="dozen-bet-mobile"
                onClick={() => handleCellClick("dozen", "25-36")}
                onMouseEnter={() => setHoveredCell("dozen-3rd")}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <span className="text-white">25-36</span>
                {renderChips("dozen", "25-36")}
              </div>
            </div>
          </div>

          {/* Sección de columnas (abajo) */}
          <div className="column-bets-mobile">
            <div
              className="column-bet-mobile"
              onClick={() => handleCellClick("column", "1st")}
              onMouseEnter={() => setHoveredCell("column-1st")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">1ª Col</span>
              {renderChips("column", "1st")}
            </div>
            <div
              className="column-bet-mobile"
              onClick={() => handleCellClick("column", "2nd")}
              onMouseEnter={() => setHoveredCell("column-2nd")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">2ª Col</span>
              {renderChips("column", "2nd")}
            </div>
            <div
              className="column-bet-mobile"
              onClick={() => handleCellClick("column", "3rd")}
              onMouseEnter={() => setHoveredCell("column-3rd")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">3ª Col</span>
              {renderChips("column", "3rd")}
            </div>
          </div>

          {/* Apuestas externas */}
          <div className="outside-bets-mobile">
            <div
              className="outside-bet-mobile"
              onClick={() => handleCellClick("highLow", "1-18")}
              onMouseEnter={() => setHoveredCell("low")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">1-18</span>
              {renderChips("highLow", "1-18")}
            </div>
            <div
              className="outside-bet-mobile"
              onClick={() => handleCellClick("highLow", "19-36")}
              onMouseEnter={() => setHoveredCell("high")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">19-36</span>
              {renderChips("highLow", "19-36")}
            </div>
            <div
              className="outside-bet-mobile"
              onClick={() => handleCellClick("evenOdd", "even")}
              onMouseEnter={() => setHoveredCell("even")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">PAR</span>
              {renderChips("evenOdd", "even")}
            </div>
            <div
              className="outside-bet-mobile"
              onClick={() => handleCellClick("evenOdd", "odd")}
              onMouseEnter={() => setHoveredCell("odd")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-white">IMPAR</span>
              {renderChips("evenOdd", "odd")}
            </div>
            <div
              className="outside-bet-mobile red-diamond"
              onClick={() => handleCellClick("color", "red")}
              onMouseEnter={() => setHoveredCell("red")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              {renderChips("color", "red")}
            </div>
            <div
              className="outside-bet-mobile black-diamond"
              onClick={() => handleCellClick("color", "black")}
              onMouseEnter={() => setHoveredCell("black")}
              onMouseLeave={() => setHoveredCell(null)}
            >
              {renderChips("color", "black")}
            </div>
          </div>
        </div>

        {/* Leyenda para diferenciar tipos de fichas */}
        <div className="bet-legend">
          <div className="legend-item">
            <div
              className="legend-color"
              style={{
                backgroundColor: userColorMap.get(user?.uid || "") || "#ffffff",
              }}
            ></div>
            <span className="text-white">Realizadas</span>
          </div>
          <div className="legend-item">
            <div
              className="legend-color"
              style={{
                backgroundColor: "#FFD700",
                border: "1px dashed #FF8C00",
              }}
            ></div>
            <span className="text-white">Pendientes</span>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar controles de apuesta
  const renderBettingControls = () => {
    return (
      <div
        className={isMobile ? "betting-controls-mobile" : "betting-controls"}
      >
        <div
          className={
            isMobile
              ? "flex flex-col gap-4"
              : "flex flex-wrap items-center gap-4"
          }
        >
          <div className={isMobile ? "" : "flex-1"}>
            <h3 className="text-white mb-2 table-label text-center">
              SELECCIONA TU FICHA
            </h3>
            <div className="flex justify-center flex-wrap gap-2 mb-4">
              {[5, 10, 25, 50, 100].map((amount) => (
                <div
                  key={amount}
                  className={cn(
                    "chip-selector",
                    `chip-${amount}`,
                    currentBetAmount === amount && "selected"
                  )}
                  onClick={() => setCurrentBetAmount(amount)}
                >
                  <span className="chip-value">{amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClearPendingBets}
              disabled={pendingBets.length === 0}
              className={`${
                isMobile ? "flex-1" : ""
              } items-center bg-red-900 hover:bg-red-800 text-white border-none`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpiar
            </Button>

            <Button
              onClick={handlePlaceBets}
              disabled={loading || pendingBets.length === 0}
              className={`${
                isMobile ? "flex-1" : ""
              } items-center bg-amber-700 hover:bg-amber-600 text-white`}
            >
              {loading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Coins className="mr-2 h-4 w-4" />
              )}
              Apostar
            </Button>
          </div>

          {isMobile && (
            <Button
              variant="outline"
              onClick={() => setShowBetSummary(!showBetSummary)}
              className="w-full"
            >
              {showBetSummary ? "Ocultar Resumen" : "Ver Resumen de Apuestas"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Renderizar resumen de apuestas para móvil
  const renderMobileBetSummary = () => {
    if (!showBetSummary && isMobile) return null;

    return (
      <div className="bet-summary-mobile">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold table-label">
            RESUMEN DE APUESTAS
          </h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-amber-400 h-6 w-6 p-0"
              >
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tabla de Pagos</DialogTitle>
                <DialogDescription>
                  Información sobre los pagos de la ruleta
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Número directo:</span>
                  <span className="font-medium">35:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Rojo/Negro:</span>
                  <span className="font-medium">1:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Par/Impar:</span>
                  <span className="font-medium">1:1</span>
                </div>
                <div className="flex justify-between">
                  <span>1-18/19-36:</span>
                  <span className="font-medium">1:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Docenas:</span>
                  <span className="font-medium">2:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Columnas:</span>
                  <span className="font-medium">2:1</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {existingBets.length > 0 || pendingBets.length > 0 ? (
          <div className="space-y-3">
            {existingBets.length > 0 && (
              <div>
                <h4 className="text-xs font-medium mb-1 text-amber-400">
                  Apuestas Realizadas
                </h4>
                <div className="space-y-1">
                  {existingBets.map((bet, index) => {
                    const betDescription = getBetDescription(bet);
                    return (
                      <div
                        key={`existing-${index}`}
                        className="flex justify-between items-center p-1 bg-gray-800 rounded text-xs"
                      >
                        <span>{betDescription}</span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="bg-gray-700 text-xs"
                          >
                            {bet.amount}
                          </Badge>
                          <span className="text-xs text-green-400">
                            +
                            {calculatePotentialWinnings(
                              bet.betType,
                              bet.amount
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {pendingBets.length > 0 && (
              <div>
                <h4 className="text-xs font-medium mb-1 text-yellow-400">
                  Apuestas Pendientes
                </h4>
                <div className="space-y-1">
                  {pendingBets.map((bet, index) => {
                    const betDescription = getBetDescription(bet);
                    return (
                      <div
                        key={`pending-${index}`}
                        className="flex justify-between items-center p-1 bg-gray-700 rounded border border-yellow-500/30 text-xs"
                      >
                        <span>{betDescription}</span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="bg-yellow-900/50 text-xs"
                          >
                            {bet.amount}
                          </Badge>
                          <span className="text-xs text-green-400">
                            +
                            {calculatePotentialWinnings(
                              bet.betType,
                              bet.amount
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-700 text-sm">
              <div className="flex justify-between items-center">
                <span>Total apostado:</span>
                <span>{totalExistingAmount + totalPendingAmount} monedas</span>
              </div>
              <div className="flex justify-between items-center text-green-400">
                <span>Ganancia potencial:</span>
                <span>+{totalPotentialWinnings} monedas</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span>Tu saldo:</span>
                <span>{userData?.balance || 0} monedas</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No hay apuestas pendientes</p>
        )}
        {/* Other Players */}
        <div className="bet-summary p-4 text-white mt-4">
          <h3 className="text-lg font-semibold mb-4 table-label">
            OTROS JUGADORES
          </h3>

          {allUserBets.length > 0 ? (
            <div className="space-y-2">
              {allUserBets.map((userBet) => (
                <div key={userBet.userId} className="p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: userBet.color }}
                    ></div>
                    <span>{userBet.username}</span>
                    <span className="text-gray-400 text-sm ml-auto">
                      {userBet.bets.reduce((sum, bet) => sum + bet.amount, 0)}{" "}
                      monedas
                    </span>
                  </div>
                  {userBet.bets.length > 0 && (
                    <div className="pl-6 text-sm text-gray-300 space-y-1">
                      {userBet.bets.map((bet, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{getBetDescription(bet)}</span>
                          <span>{bet.amount} monedas</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              No hay otros jugadores apostando
            </p>
          )}
        </div>
      </div>
    );
  };

  // Renderizar resumen de apuestas para escritorio
  const renderDesktopBetSummary = () => {
    return (
      <div className="bg-gray-800/80 rounded-lg p-4 text-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold table-label">
            RESUMEN DE APUESTAS
          </h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-amber-400">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tabla de Pagos</DialogTitle>
                <DialogDescription>
                  Información sobre los pagos de la ruleta
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Número directo:</span>
                  <span className="font-medium">35:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Rojo/Negro:</span>
                  <span className="font-medium">1:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Par/Impar:</span>
                  <span className="font-medium">1:1</span>
                </div>
                <div className="flex justify-between">
                  <span>1-18/19-36:</span>
                  <span className="font-medium">1:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Docenas:</span>
                  <span className="font-medium">2:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Columnas:</span>
                  <span className="font-medium">2:1</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {existingBets.length > 0 || pendingBets.length > 0 ? (
          <div className="space-y-4">
            {existingBets.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-amber-400">
                  Apuestas Realizadas
                </h4>
                <div className="space-y-2">
                  {existingBets.map((bet, index) => {
                    const betDescription = getBetDescription(bet);
                    return (
                      <div
                        key={`existing-${index}`}
                        className="flex justify-between items-center p-2 bg-gray-800 rounded"
                      >
                        <span>{betDescription}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-gray-700">
                            {bet.amount} monedas
                          </Badge>
                          <span className="text-xs text-green-400">
                            +
                            {calculatePotentialWinnings(
                              bet.betType,
                              bet.amount
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {pendingBets.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-yellow-400">
                  Apuestas Pendientes
                </h4>
                <div className="space-y-2">
                  {pendingBets.map((bet, index) => {
                    const betDescription = getBetDescription(bet);
                    return (
                      <div
                        key={`pending-${index}`}
                        className="flex justify-between items-center p-2 bg-gray-700 rounded border border-yellow-500/30"
                      >
                        <span>{betDescription}</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-yellow-900/50"
                          >
                            {bet.amount} monedas
                          </Badge>
                          <span className="text-xs text-green-400">
                            +
                            {calculatePotentialWinnings(
                              bet.betType,
                              bet.amount
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span>Total apostado:</span>
                <span>{totalExistingAmount + totalPendingAmount} monedas</span>
              </div>
              <div className="flex justify-between items-center text-green-400">
                <span>Ganancia potencial:</span>
                <span>+{totalPotentialWinnings} monedas</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span>Tu saldo:</span>
                <span>{userData?.balance || 0} monedas</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No hay apuestas pendientes</p>
        )}
        {/* Other Players */}
        <div className="bet-summary p-4 text-white mt-4">
          <h3 className="text-lg font-semibold mb-4 table-label">
            OTROS JUGADORES
          </h3>

          {allUserBets.length > 0 ? (
            <div className="space-y-2">
              {allUserBets.map((userBet) => (
                <div key={userBet.userId} className="p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: userBet.color }}
                    ></div>
                    <span>{userBet.username}</span>
                    <span className="text-gray-400 text-sm ml-auto">
                      {userBet.bets.reduce((sum, bet) => sum + bet.amount, 0)}{" "}
                      monedas
                    </span>
                  </div>
                  {userBet.bets.length > 0 && (
                    <div className="pl-6 text-sm text-gray-300 space-y-1">
                      {userBet.bets.map((bet, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{getBetDescription(bet)}</span>
                          <span>{bet.amount} monedas</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              No hay otros jugadores apostando
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Vista para móvil */}
      <div className="mobile-view">
        {renderMobileRouletteTable()}
        {renderBettingControls()}
        {renderMobileBetSummary()}
      </div>

      {/* Vista para escritorio */}
      <div className="desktop-view">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {renderDesktopRouletteTable()}
            {renderBettingControls()}
          </div>
          <div className="lg:col-span-1">{renderDesktopBetSummary()}</div>
        </div>
      </div>
    </div>
  );
}
