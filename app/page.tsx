import { Suspense } from "react";
import AuthCheck from "@/components/auth-check";
import LoginForm from "@/components/login-form";
import LoadingSpinner from "@/components/loading-spinner";

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
          </div>
        </Suspense>
      </AuthCheck>
    </main>
  );
}
