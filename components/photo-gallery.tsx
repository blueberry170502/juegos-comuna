"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase-config";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import LoadingSpinner from "@/components/loading-spinner";

interface Photo {
  id: string;
  userId: string;
  username: string;
  photoURL: string;
  timestamp: any;
  challengeTime: string;
}

export default function PhotoGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "today" | "week">("all");

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        const photosRef = collection(db, "photos");
        const q = query(photosRef, orderBy("timestamp", "desc"), limit(100));
        const querySnapshot = await getDocs(q);

        const fetchedPhotos: Photo[] = [];
        querySnapshot.forEach((doc) => {
          fetchedPhotos.push({
            id: doc.id,
            ...doc.data(),
          } as Photo);
        });

        setPhotos(fetchedPhotos);
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  // Filter photos based on active tab
  const filteredPhotos = photos.filter((photo) => {
    if (activeTab === "all") return true;

    const photoDate = photo.timestamp
      ? new Date(photo.timestamp.seconds * 1000)
      : new Date();
    const now = new Date();

    if (activeTab === "today") {
      return (
        photoDate.getDate() === now.getDate() &&
        photoDate.getMonth() === now.getMonth() &&
        photoDate.getFullYear() === now.getFullYear()
      );
    }

    if (activeTab === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return photoDate >= oneWeekAgo;
    }

    return true;
  });

  // Group photos by date
  const groupedPhotos: Record<string, Photo[]> = {};
  filteredPhotos.forEach((photo) => {
    const date = photo.timestamp
      ? new Date(photo.timestamp.seconds * 1000).toLocaleDateString()
      : "Sin fecha";

    if (!groupedPhotos[date]) {
      groupedPhotos[date] = [];
    }

    groupedPhotos[date].push(photo);
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (photos.length === 0) {
    return (
      <div className="text-center p-8 bg-card rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">No hay fotos todavía</h2>
        <p className="text-muted-foreground">
          Las fotos aparecerán aquí cuando los usuarios completen los desafíos
          de fotos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="week">Esta Semana</TabsTrigger>
        </TabsList>
      </Tabs>

      {Object.keys(groupedPhotos).length === 0 ? (
        <div className="text-center p-8 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            No hay fotos en este período
          </h2>
          <p className="text-muted-foreground">
            No se encontraron fotos para el período de tiempo seleccionado.
          </p>
        </div>
      ) : (
        Object.entries(groupedPhotos)
          .sort(
            ([dateA], [dateB]) =>
              new Date(dateB).getTime() - new Date(dateA).getTime()
          )
          .map(([date, datePhotos]) => (
            <div key={date} className="space-y-4">
              <h2 className="text-xl font-semibold">{date}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {datePhotos.map((photo) => (
                  <Card key={photo.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative aspect-square">
                        <Image
                          src={photo.photoURL || "/placeholder.svg"}
                          alt={`Foto de ${photo.username}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="p-3">
                      <div className="w-full">
                        <p className="font-medium truncate">{photo.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {photo.timestamp
                            ? new Date(
                                photo.timestamp.seconds * 1000
                              ).toLocaleTimeString()
                            : ""}
                        </p>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
