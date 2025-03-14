import { Suspense } from "react";
import AuthCheck from "@/components/auth-check";
import LoginForm from "@/components/login-form";
import LoadingSpinner from "@/components/loading-spinner";
import GameEmbed from "@/components/game-embed";
import { Coins } from "lucide-react";

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Party Game Store</h1>

      <AuthCheck fallback={<LoginForm />}>
        <Suspense fallback={<LoadingSpinner />}>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-card rounded-lg p-6 shadow-md">
              <h2 className="text-2xl font-semibold mb-4">
                Welcome to the Party!
              </h2>
              <p className="text-muted-foreground mb-4">
                Use this app to manage your party currency and challenges.
              </p>
              <p className="text-sm text-muted-foreground">
                Navigate using the menu to view the store, your balance, and
                challenges.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-md">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Coins className="mr-2 h-6 w-6 text-primary" />
                Transfer Money
              </h2>
              <p className="text-muted-foreground mb-4">
                Send coins to other players.
              </p>
              <a
                href="/transfer"
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Transfer Coins
              </a>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mt-12 mb-6">Casino Games</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <GameEmbed
              title="Roulette"
              description="Place your bets on numbers, colors, or sections"
              image="/casino-foto.png"
              href="/games/roulette"
              totalBets={0}
            />

            <GameEmbed
              title="Blackjack"
              description="Try to beat the dealer without going over 21"
              image="/blackjack-foto.png"
              href="/games/blackjack"
              totalBets={0}
            />

            <GameEmbed
              title="Poker"
              description="Test your skills in this classic card game"
              image="/poker-foto.png"
              href="/games/poker"
              totalBets={0}
            />

            <GameEmbed
              title="Horse Racing"
              description="Bet on your favorite horse to win the race"
              image="/caballos-foto.png"
              href="/games/horse-racing"
              totalBets={0}
            />
            <GameEmbed
              title="Slots"
              description="Spin the reels and try your luck"
              image="/placeholder.svg?height=400&width=400"
              href="/games/slots"
              totalBets={0}
            />
          </div>
        </Suspense>
      </AuthCheck>
    </main>
  );
}
