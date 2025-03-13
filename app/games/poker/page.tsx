import { Suspense } from "react"
import AuthCheck from "@/components/auth-check"
import PokerBetting from "@/components/games/poker-betting"
import LoadingSpinner from "@/components/loading-spinner"

export default function PokerPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Poker</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <PokerBetting />
        </Suspense>
      </AuthCheck>
    </main>
  )
}

