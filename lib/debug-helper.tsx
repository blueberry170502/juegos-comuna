"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/firebase-hooks";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-config";
import { useToast } from "@/hooks/use-toast";

export default function DebugHelper() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const resetUserData = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "No hay usuario autenticado",
        variant: "destructive",
      });
      return;
    }

    try {
      // Crear o sobrescribir el documento del usuario con datos iniciales
      await setDoc(doc(db, "users", user.uid), {
        username: userData?.username || "Usuario",
        email: user.email,
        balance: 100,
        isAdmin: userData?.isAdmin || false,
        createdAt: new Date(),
        purchases: [],
        challenges: [],
      });

      toast({
        title: "Datos restablecidos",
        description:
          "Los datos del usuario han sido restablecidos correctamente",
      });
    } catch (error) {
      console.error("Error al restablecer datos:", error);
      toast({
        title: "Error",
        description: "No se pudieron restablecer los datos",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="text-lg flex justify-between">
              Herramientas de depuración
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                X
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm mb-2">ID de usuario: {user.uid}</p>
              <p className="text-sm mb-2">Email: {user.email}</p>
              <p className="text-sm mb-2">
                Datos cargados: {userData ? "Sí" : "No"}
              </p>
            </div>
            <Button
              onClick={resetUserData}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              Restablecer datos de usuario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
          Debug
        </Button>
      )}
    </div>
  );
}
