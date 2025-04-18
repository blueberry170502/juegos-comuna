"use client";

import { useState, useRef, useCallback } from "react";
import { usePhotoChallenge } from "@/lib/photo-challenge-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Coins, Camera, X } from "lucide-react";
import Webcam from "react-webcam";
import { useRouter } from "next/navigation";

export default function PhotoChallengeModal() {
  const { isPhotoChallenge, timeRemaining, takePhoto, photoTaken } =
    usePhotoChallenge();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(true); // Estado para controlar la visibilidad del modal
  const webcamRef = useRef<Webcam>(null);
  const router = useRouter();

  // Format time remaining as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle taking a photo
  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        takePhoto(imageSrc);
        setIsCameraActive(false);
      }
    }
  }, [takePhoto]);

  // If there's no active challenge, photo already taken, or modal is hidden, don't show anything
  if (!isPhotoChallenge || photoTaken || !isModalVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">¡Desafío de Foto!</CardTitle>
            <div className="text-lg font-bold text-red-500">
              {formatTime(timeRemaining)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isCameraActive ? (
            <div className="relative aspect-video bg-black rounded-md overflow-hidden">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: "user",
                }}
                className="w-full h-full object-cover"
                onUserMediaError={(error) => {
                  console.error("Error accessing camera:", error);
                  alert(
                    "No se pudo acceder a la cámara. Por favor, verifica los permisos."
                  );
                }}
              />
            </div>
          ) : (
            <div className="text-center py-6">
              <Camera className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="mb-4">
                Toma una foto en los próximos{" "}
                <span className="font-bold text-primary">
                  {formatTime(timeRemaining)}
                </span>{" "}
                para ganar 50 monedas.
              </p>
              <div className="flex items-center justify-center">
                <Coins className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="font-bold">+50 monedas</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {isCameraActive ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsCameraActive(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleCapture}>
                <Camera className="h-4 w-4 mr-2" />
                Tomar Foto
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalVisible(false); // Ocultar el modal
                  router.push("/"); // Redirigir al menú principal
                }}
              >
                Ignorar
              </Button>
              <Button onClick={() => setIsCameraActive(true)}>
                <Camera className="h-4 w-4 mr-2" />
                Activar Cámara
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
