import { Suspense } from "react"
import AuthCheck from "@/components/auth-check"
import BlackjackBetting from "@/components/games/blackjack-betting"
import LoadingSpinner from "@/components/loading-spinner"

export default function BlackjackPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Blackjack</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <BlackjackBetting />
        </Suspense>
      </AuthCheck>
    </main>
  )
}

