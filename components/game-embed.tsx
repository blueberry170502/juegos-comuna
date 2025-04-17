"use client";

import { useAuth } from "@/lib/firebase-hooks";
import { db } from "@/lib/firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Coins } from "lucide-react";

// Mover gameNameMap fuera del componente para evitar que cambie en cada renderizado
const gameNameMap = {
  Ruleta: "roulette",
  Blackjack: "blackjack",
  Póker: "poker",
  "Carreras de Caballos": "horse-racing",
  "Higher or Lower": "higher-lower",
};

interface GameEmbedProps {
  title: string;
  description: string;
  image: string;
  href: string;
  totalBets: number; // Este valor solo se usa como fallback inicial
}

export default function GameEmbed({
  title,
  description,
  image,
  href,
  totalBets,
}: GameEmbedProps) {
  const { user } = useAuth();
  const [userBet, setUserBet] = useState(0);
  const [actualTotalBets, setActualTotalBets] = useState(0); // Inicializamos en 0 en lugar de usar totalBets
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchBets = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Normalizar el nombre del juego para la consulta
        const gameName =
          gameNameMap[title as keyof typeof gameNameMap] || title.toLowerCase();

        console.log(`Consultando apuestas para: ${gameName}`);

        // Obtener SOLO apuestas PENDIENTES del juego actual
        const betsRef = collection(db, "bets");
        const q = query(
          betsRef,
          where("game", "==", gameName),
          where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);

        let total = 0;
        let userBetAmount = 0;

        console.log(`Número de apuestas encontradas: ${querySnapshot.size}`);

        querySnapshot.forEach((doc) => {
          const betData = doc.data();
          const betAmount =
            typeof betData.amount === "number"
              ? betData.amount
              : Number(betData.amount) || 0;

          console.log(
            `Apuesta ID: ${doc.id}, Monto: ${betAmount}, Usuario: ${betData.userId}`
          );

          total += betAmount;

          if (betData.userId === user.uid) {
            userBetAmount += betAmount;
          }
        });

        setActualTotalBets(total);
        setUserBet(userBetAmount);

        console.log(
          `Juego: ${title}, Total apuestas: ${total}, Apuesta usuario: ${userBetAmount}`
        );
      } catch (error) {
        console.error(`Error fetching bets for ${title}:`, error);
        setActualTotalBets(totalBets);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();

    // Configurar el intervalo para actualizar las apuestas cada 30 segundos
    intervalId = setInterval(fetchBets, 30000);

    // Limpiar el intervalo cuando el componente se desmonte o cambien las dependencias
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, title, totalBets]);

  // Calcular el porcentaje de la apuesta del usuario
  const userBetPercentage =
    actualTotalBets > 0 ? Math.min((userBet / actualTotalBets) * 100, 100) : 0;

  return (
    <Link href={href}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-64 w-full">
          <Image
            src={image || "/placeholder.svg"}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm font-medium">
              <Coins className="h-4 w-4 mr-1 text-primary" />
              <span className="text-black dark:text-white">
                {loading
                  ? "Cargando..."
                  : `Bote actual: ${actualTotalBets} monedas`}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start w-full">
          <div className="w-full bg-muted h-3 rounded-full overflow-hidden mb-2">
            <div
              className="bg-primary h-full transition-all duration-500 ease-in-out"
              style={{ width: `${userBetPercentage}%` }}
            ></div>
          </div>
          <p
            className={`text-sm ${
              userBet > 0 ? "text-primary font-medium" : "text-muted-foreground"
            }`}
          >
            {userBet > 0
              ? `Tu apuesta: ${userBet} monedas (${userBetPercentage.toFixed(
                  1
                )}%)`
              : "Aún no has realizado una apuesta"}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}
