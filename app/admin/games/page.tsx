import { Suspense } from "react";
import AuthCheck from "@/components/auth-check";
import AdminCheck from "@/components/admin-check";
import GameManagement from "@/components/admin/game-management";
import LoadingSpinner from "@/components/loading-spinner";

export default function AdminGamesPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Administrar Juegos</h1>

      <AuthCheck>
        <AdminCheck>
          <Suspense fallback={<LoadingSpinner />}>
            <GameManagement />
          </Suspense>
        </AdminCheck>
      </AuthCheck>
    </main>
  );
}
