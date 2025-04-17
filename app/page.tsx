import type { Metadata } from "next";
import GameEmbed from "@/components/game-embed";
import AuthCheck from "@/components/auth-check";
import { Suspense } from "react";
import LoginForm from "@/components/login-form";
import LoadingSpinner from "@/components/loading-spinner";
import { Coins } from "lucide-react";

export const metadata: Metadata = {
  title: "Juegos Comuna",
  description: "Plataforma de juegos para eventos",
};

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        La Casa de la Comuna
      </h1>

      <AuthCheck fallback={<LoginForm />}>
        <Suspense fallback={<LoadingSpinner />}>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-card rounded-lg p-6 shadow-md">
              <h2 className="text-2xl font-semibold mb-4">
                Bienvenidos a la Casa de la Comuna!
              </h2>
              <p className="text-muted-foreground mb-4">
                Podeis usar esta aplicación para jugar a juegos del casino y
                comprar retos para otros jugadores!
              </p>
              <p className="text-sm text-muted-foreground">
                Navega usando el menú para explorar los diferentes juegos,
                tienda de retos, tu balance actual y retos asignados.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-md">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Coins className="mr-2 h-6 w-6 text-primary" />
                Tragaperras
              </h2>
              <p className="text-muted-foreground mb-4">
                Apuesta en la máquina tragamonedas y gana premios increíbles!
              </p>
              <a
                href="/games/slots"
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Apostar ya
              </a>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mt-12 mb-6">
            Juegos de Casino
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GameEmbed
              title="Ruleta"
              description="Haz tus apuestas en números, colores o secciones"
              image="/casino-foto.png"
              href="/games/roulette"
              totalBets={0}
            />

            <GameEmbed
              title="Blackjack"
              description="Intenta vencer al crupier sin pasarte de 21"
              image="/blackjack-foto.png"
              href="/games/blackjack"
              totalBets={0}
            />

            <GameEmbed
              title="Póker"
              description="Pon a prueba tus habilidades en este clásico juego de cartas"
              image="/poker-foto.png"
              href="/games/poker"
              totalBets={0}
            />

            <GameEmbed
              title="Carreras de Caballos"
              description="Apuesta por tu caballo favorito para ganar la carrera"
              image="/caballos-foto.png"
              href="/games/horse-racing"
              totalBets={0}
            />

            <GameEmbed
              title="Higher or Lower"
              description="Adivina si algo es más famoso que otra cosa"
              image="/casino-foto.png"
              href="/games/higher-lower"
              totalBets={0}
            />
          </div>
        </Suspense>
      </AuthCheck>
    </main>
  );
}
