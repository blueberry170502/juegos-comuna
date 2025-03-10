import { Suspense } from "react";
import AuthCheck from "@/components/auth-check";
import UserProfile from "@/components/user-profile";
import LoadingSpinner from "@/components/loading-spinner";

export default function ProfilePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <UserProfile />
        </Suspense>
      </AuthCheck>
    </main>
  );
}
