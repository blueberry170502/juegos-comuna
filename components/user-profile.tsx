"use client";

import { useAuth } from "@/lib/firebase-hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingSpinner from "@/components/loading-spinner";
import { ShieldCheck } from "lucide-react";

export default function UserProfile() {
  const { userData, loading, user } = useAuth();

  // Mostrar un spinner mientras se carga
  if (loading) {
    return <LoadingSpinner />;
  }

  // Mostrar un mensaje de error si no hay datos de usuario
  if (!userData) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="text-xl">Error al cargar el perfil</CardTitle>
          <CardDescription>
            No se pudieron cargar los datos del usuario. Por favor, intenta
            cerrar sesión y volver a iniciar sesión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ID de usuario: {user?.uid || "No disponible"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{userData.username}</CardTitle>
            {userData.isAdmin && (
              <Badge
                variant="outline"
                className="bg-primary text-primary-foreground"
              >
                Admin
              </Badge>
            )}
          </div>
          <CardDescription>{userData.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Actual</p>
              <p className="text-3xl font-bold text-primary">
                {userData.balance} monedas
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bloqueadores</p>
              <p className="text-xl font-bold flex items-center">
                <ShieldCheck className="h-4 w-4 mr-1 text-blue-500" />
                {userData.blockers?.length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="purchases">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="challenges">Desafíos</TabsTrigger>
          <TabsTrigger value="blockers">Bloqueadores</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tus Compras</CardTitle>
              <CardDescription>
                Historial de los artículos que has comprado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData.purchases && userData.purchases.length > 0 ? (
                <ul className="space-y-2">
                  {userData.purchases.map((purchase: any, index: any) => (
                    <li
                      key={index}
                      className="flex justify-between items-center border-b pb-2"
                    >
                      <span>{purchase.itemName}</span>
                      <span className="text-muted-foreground">
                        {purchase.price} monedas
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  Aún no tienes historial de compras
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="challenges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tus Desafíos</CardTitle>
              <CardDescription>
                Desafíos que has recibido o enviado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData.challenges && userData.challenges.length > 0 ? (
                <ul className="space-y-4">
                  {userData.challenges.map((challenge: any, index: any) => (
                    <li key={index} className="border rounded-md p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">
                          {challenge.challengeName}
                        </span>
                        <Badge
                          variant={
                            challenge.status === "pending"
                              ? "outline"
                              : "default"
                          }
                          className={
                            challenge.blocked
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : challenge.status === "completed"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : challenge.status === "failed"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                          }
                        >
                          {challenge.blocked ? "bloqueado" : challenge.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {challenge.isReceived ? "De" : "Para"}:{" "}
                        {challenge.otherUsername}
                      </p>
                      {challenge.challengeDescription && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {challenge.challengeDescription}
                        </p>
                      )}
                      {challenge.timeRemaining && !challenge.blocked && (
                        <p className="text-sm font-medium mt-2">
                          Tiempo restante: {challenge.timeRemaining}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Aún no tienes desafíos</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="blockers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tus Bloqueadores</CardTitle>
              <CardDescription>
                Bloqueadores de desafíos que has adquirido
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData.blockers && userData.blockers.length > 0 ? (
                <ul className="space-y-2">
                  {userData.blockers.map((blocker: any, index: any) => (
                    <li
                      key={index}
                      className="flex justify-between items-center border-b pb-2"
                    >
                      <div className="flex items-center">
                        <ShieldCheck className="h-4 w-4 mr-2 text-blue-500" />
                        <span>{blocker.itemName}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {blocker.price} monedas
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  No tienes bloqueadores disponibles
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
