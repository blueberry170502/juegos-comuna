import { Suspense } from "react";
import AuthCheck from "@/components/auth-check";
import SlotMachineBetting from "@/components/games/slot-machine-betting";
import LoadingSpinner from "@/components/loading-spinner";

export default function SlotMachinePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Slot Machine</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <SlotMachineBetting />
        </Suspense>
      </AuthCheck>
    </main>
  );
}
