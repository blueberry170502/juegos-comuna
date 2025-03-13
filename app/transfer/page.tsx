import { Suspense } from "react"
import AuthCheck from "@/components/auth-check"
import TransferMoney from "@/components/transfer-money"
import LoadingSpinner from "@/components/loading-spinner"

export default function TransferPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Transfer Money</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <TransferMoney />
        </Suspense>
      </AuthCheck>
    </main>
  )
}

