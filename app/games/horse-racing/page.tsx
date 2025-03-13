import { Suspense } from "react"
import AuthCheck from "@/components/auth-check"
import HorseRacingBetting from "@/components/games/horse-racing-betting"
import LoadingSpinner from "@/components/loading-spinner"

export default function HorseRacingPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Horse Racing</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <HorseRacingBetting />
        </Suspense>
      </AuthCheck>
    </main>
  )
}

