import { Suspense } from "react"
import AuthCheck from "@/components/auth-check"
import StoreItems from "@/components/store-items"
import LoadingSpinner from "@/components/loading-spinner"

export default function StorePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Store</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <StoreItems />
        </Suspense>
      </AuthCheck>
    </main>
  )
}

