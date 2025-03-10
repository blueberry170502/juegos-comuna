import { Suspense } from "react"
import AuthCheck from "@/components/auth-check"
import ChallengesList from "@/components/challenges-list"
import LoadingSpinner from "@/components/loading-spinner"

export default function ChallengesPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Challenges</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <ChallengesList />
        </Suspense>
      </AuthCheck>
    </main>
  )
}

