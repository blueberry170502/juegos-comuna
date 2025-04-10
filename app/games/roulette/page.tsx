import { Suspense } from "react";
import AuthCheck from "@/components/auth-check";
import RouletteBetting from "@/components/games/roulette-betting";
import LoadingSpinner from "@/components/loading-spinner";

export default function RoulettePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Ruleta</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <RouletteBetting />
        </Suspense>
      </AuthCheck>
    </main>
  );
}
