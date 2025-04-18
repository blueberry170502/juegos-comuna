import { Suspense } from "react";
import AuthCheck from "@/components/auth-check";
import PhotoGallery from "@/components/photo-gallery";
import LoadingSpinner from "@/components/loading-spinner";

export default function PhotosPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Galería de Fotos</h1>

      <AuthCheck>
        <Suspense fallback={<LoadingSpinner />}>
          <PhotoGallery />
        </Suspense>
      </AuthCheck>
    </main>
  );
}
