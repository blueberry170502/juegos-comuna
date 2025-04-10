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
  const { user, userData } = useAuth();
  const [userBet, setUserBet] = useState(0);
  const [actualTotalBets, setActualTotalBets] = useState(0); // Inicializamos en 0 en lugar de usar totalBets
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Obtener SOLO apuestas PENDIENTES del juego actual
        const betsRef = collection(db, "bets");
        const q = query(
          betsRef,
          where("game", "==", title.toLowerCase()),
          where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);

        let total = 0;
        let userBetAmount = 0;

        querySnapshot.forEach((doc) => {
          const betData = doc.data();
          total += betData.amount;

          if (betData.userId === user.uid) {
            userBetAmount += betData.amount;
          }
        });

        // Actualizamos con el total real de apuestas pendientes
        setActualTotalBets(total);
        setUserBet(userBetAmount);
      } catch (error) {
        console.error("Error fetching bets:", error);
        // Si hay un error, usamos el valor de fallback
        setActualTotalBets(totalBets);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();

    // Configuramos un intervalo para actualizar las apuestas cada 30 segundos
    const intervalId = setInterval(fetchBets, 10000);

    return () => clearInterval(intervalId);
  }, [user, title, totalBets]);

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
            <div className="flex items-center text-sm text-muted-foreground">
              <Coins className="h-4 w-4 mr-1" />
              <span>
                {loading
                  ? "Cargando..."
                  : `Bote actual: ${actualTotalBets} monedas`}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full"
              style={{
                width:
                  userBet > 0 && actualTotalBets > 0
                    ? `${Math.min((userBet / actualTotalBets) * 100, 100)}%`
                    : "0%",
              }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {userBet > 0
              ? `Tu apuesta: ${userBet} monedas`
              : "Aún no has realizado una apuesta"}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}
