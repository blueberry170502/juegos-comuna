import type { Metadata } from "next";
import { Suspense } from "react";
import AuthCheck from "@/components/auth-check";
import HigherLowerBetting from "@/components/games/higher-lower-betting";
import LoadingSpinner from "@/components/loading-spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Higher or Lower | Juegos Comuna",
  description: "Adivina si algo es más famoso que otra cosa y gana monedas",
};

export default function HigherLowerPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Higher or Lower</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Cómo jugar</CardTitle>
                <CardDescription>Instrucciones del juego</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">Reglas:</h3>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Elige una dificultad y realiza tu apuesta inicial</li>
                    <li>
                      Se te presentarán dos cosas y deberás adivinar cuál es más
                      famosa
                    </li>
                    <li>
                      Si aciertas, puedes seguir jugando y acumular tu botín o
                      retirarte
                    </li>
                    <li>Si te equivocas, pierdes toda tu apuesta</li>
                    <li>
                      Cuanto más difícil sea el modo, mayor será el
                      multiplicador
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold">Multiplicadores:</h3>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Fácil: x1.5 por cada ronda ganada</li>
                    <li>Normal: x2 por cada ronda ganada</li>
                    <li>Difícil: x3 por cada ronda ganada</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <HigherLowerBetting />
          </div>
        </Suspense>
      </AuthCheck>
    </main>
  );
}
