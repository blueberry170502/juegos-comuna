import { Suspense } from "react";
import AuthCheck from "@/components/auth-check";
import UsersList from "@/components/users-list";
import AdminCheck from "@/components/admin-check";
import LoadingSpinner from "@/components/loading-spinner";

export default function UsersPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Lista de Usuarios</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <UsersList />
        </Suspense>
      </AuthCheck>
    </main>
  );
}
