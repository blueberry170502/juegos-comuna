"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase-config";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  limit,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Minus,
  XCircle,
  CheckCircle,
  Trophy,
  Coins,
  Package,
} from "lucide-react";
import LoadingSpinner from "@/components/loading-spinner";
import { useAuth } from "@/lib/firebase-hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  isAdmin: boolean;
  challenges: Challenge[];
  purchases?: Purchase[];
}

interface Challenge {
  challengeId: string;
  challengeName: string;
  createdAt: string;
  isReceived: boolean;
  otherUserId: string;
  otherUsername: string;
  status: string;
  value: number;
}

interface Purchase {
  itemId: string;
  itemName: string;
  price: number;
  purchasedAt: string;
  type?: string;
}

interface UserScore {
  userId: string;
  username: string;
  totalScore: number;
  coinScore: number;
  challengeScore: number;
  itemScore: number;
  coins: number;
  completedChallenges: number;
  regularItems: number;
}

export default function ListaDeUsuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  const [retosDeUsuarios, setRetosDeUsuarios] = useState<
    Record<string, Challenge[]>
  >({});
  const [userScores, setUserScores] = useState<UserScore[]>([]);
  const { toast } = useToast();
  const { userData } = useAuth();

  // Multiplicadores para el ranking global
  const COIN_MULTIPLIER = 0.5;
  const ITEM_MULTIPLIER = 1;
  const CHALLENGE_MULTIPLIER = 4;

  useEffect(() => {
    const obtenerUsuarios = async () => {
      try {
        console.log("Obteniendo usuarios...");
        setCargando(true);
        setError(null);

        const coleccionUsuarios = collection(db, "users");
        const consultaUsuarios = query(coleccionUsuarios, limit(50)); // Limitar a 50 usuarios para evitar problemas de rendimiento
        const snapshotUsuarios = await getDocs(consultaUsuarios);

        if (snapshotUsuarios.empty) {
          console.log("No se encontraron usuarios");
          setUsuarios([]);
          setCargando(false);
          return;
        }

        console.log(`Se encontraron ${snapshotUsuarios.docs.length} usuarios`);

        const listaUsuarios = snapshotUsuarios.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            username: data.username || "Desconocido",
            email: data.email || "Sin correo",
            balance: data.balance || 0,
            isAdmin: data.isAdmin || false,
            challenges: data.challenges || [],
            purchases: data.purchases || [],
          };
        });

        setSaldos(
          listaUsuarios.reduce((acc, usuario) => {
            acc[usuario.id] = usuario.balance;
            return acc;
          }, {} as Record<string, number>)
        );

        setUsuarios(listaUsuarios);
        setRetosDeUsuarios(
          listaUsuarios.reduce((acc, usuario) => {
            acc[usuario.id] = usuario.challenges;
            return acc;
          }, {} as Record<string, Challenge[]>)
        );

        // Calcular puntuaciones para el ranking global
        const scores = listaUsuarios.map((usuario) => {
          const completedChallenges =
            usuario.challenges?.filter(
              (reto: { status: string; isReceived: boolean }) =>
                reto.status === "completed" && reto.isReceived === true
            ).length || 0;

          const regularItems =
            usuario.purchases?.filter(
              (purchase: { type: string }) =>
                !purchase.type || purchase.type === "regular"
            ).length || 0;

          const coinScore = usuario.balance * COIN_MULTIPLIER;
          const challengeScore = completedChallenges * CHALLENGE_MULTIPLIER;
          const itemScore = regularItems * ITEM_MULTIPLIER;

          return {
            userId: usuario.id,
            username: usuario.username,
            totalScore: coinScore + challengeScore + itemScore,
            coinScore,
            challengeScore,
            itemScore,
            coins: usuario.balance,
            completedChallenges,
            regularItems,
          };
        });

        setUserScores(scores);

        // Inicializar objeto de cantidades
        const cantidadesIniciales: Record<string, number> = {};
        listaUsuarios.forEach((usuario) => {
          cantidadesIniciales[usuario.id] = 0;
        });
        setCantidades(cantidadesIniciales);
      } catch (error) {
        console.error("Error al obtener usuarios:", error);
        setError(
          "No se pudieron cargar los usuarios. Por favor, inténtalo de nuevo más tarde."
        );
      } finally {
        setCargando(false);
      }
    };

    obtenerUsuarios();
  }, []);

  const manejarCompletarReto = async (idReto: string, idUsuario: string) => {
    console.log("Completando reto:", idReto, "para el usuario:", idUsuario);
    try {
      const referenciaUsuario = doc(db, "users", idUsuario);

      const usuario = usuarios.find((u) => u.id === idUsuario);
      if (!usuario) return;
      console.log("Usuario encontrado:", usuario);

      const reto = usuario.challenges?.find((c) => c.challengeId === idReto);
      if (!reto) return;
      console.log("Reto encontrado:", reto);

      setRetosDeUsuarios((prev) => ({
        ...prev,
        [idUsuario]: prev[idUsuario].filter((c) => c.challengeId !== idReto),
      }));

      // Eliminar el reto pendiente
      await updateDoc(referenciaUsuario, {
        challenges: arrayRemove(reto),
      });

      // Agregar el reto completado
      await updateDoc(referenciaUsuario, {
        challenges: arrayUnion({
          ...reto,
          status: "completed",
        }),
      });

      // Actualizar el reto del otro usuario también
      const referenciaOtroUsuario = doc(db, "users", reto.otherUserId);
      const otroReto = {
        challengeId: reto.challengeId,
        challengeName: reto.challengeName,
        otherUserId: idUsuario,
        otherUsername: usuario.username,
        status: "pending",
        isReceived: false,
      };

      await updateDoc(referenciaOtroUsuario, {
        challenges: arrayRemove(otroReto),
      });

      await updateDoc(referenciaOtroUsuario, {
        challenges: arrayUnion({
          ...otroReto,
          status: "completed",
        }),
      });

      // Actualizar puntuaciones
      setUserScores((prevScores) => {
        return prevScores.map((score) => {
          if (score.userId === idUsuario) {
            const newCompletedChallenges = score.completedChallenges + 1;
            const newChallengeScore =
              newCompletedChallenges * CHALLENGE_MULTIPLIER;
            return {
              ...score,
              completedChallenges: newCompletedChallenges,
              challengeScore: newChallengeScore,
              totalScore: score.coinScore + newChallengeScore + score.itemScore,
            };
          }
          return score;
        });
      });

      toast({
        title: "¡Reto completado!",
        description: "Has completado el reto exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar el reto",
        variant: "destructive",
      });
    }
  };

  const manejarRetoFallido = async (idReto: string, idUsuario: string) => {
    console.log("Fallando reto:", idReto, "para el usuario:", idUsuario);
    try {
      const referenciaUsuario = doc(db, "users", idUsuario);

      const usuario = usuarios.find((u) => u.id === idUsuario);
      if (!usuario) return;
      console.log("Usuario encontrado:", usuario);

      const reto = usuario.challenges?.find((c) => c.challengeId === idReto);
      if (!reto) return;
      console.log("Reto encontrado:", reto);

      setRetosDeUsuarios((prev) => ({
        ...prev,
        [idUsuario]: prev[idUsuario].filter((c) => c.challengeId !== idReto),
      }));

      if (usuario.balance >= reto.value) {
        setSaldos((prev) => ({
          ...prev,
          [idUsuario]: prev[idUsuario] - reto.value,
        }));

        await updateDoc(referenciaUsuario, {
          balance: usuario.balance - reto.value,
        });

        // Actualizar puntuaciones
        setUserScores((prevScores) => {
          return prevScores.map((score) => {
            if (score.userId === idUsuario) {
              const newCoins = score.coins - reto.value;
              const newCoinScore = newCoins * COIN_MULTIPLIER;
              return {
                ...score,
                coins: newCoins,
                coinScore: newCoinScore,
                totalScore:
                  newCoinScore + score.challengeScore + score.itemScore,
              };
            }
            return score;
          });
        });
      }

      // Eliminar el reto pendiente
      await updateDoc(referenciaUsuario, {
        challenges: arrayRemove(reto),
      });

      // Agregar el reto fallido
      await updateDoc(referenciaUsuario, {
        challenges: arrayUnion({
          ...reto,
          status: "failed",
        }),
      });

      // Actualizar el reto del otro usuario también
      const referenciaOtroUsuario = doc(db, "users", reto.otherUserId);
      const otroReto = {
        challengeId: reto.challengeId,
        challengeName: reto.challengeName,
        otherUserId: idUsuario,
        otherUsername: usuario.username,
        status: "pending",
        isReceived: false,
      };

      await updateDoc(referenciaOtroUsuario, {
        challenges: arrayRemove(otroReto),
      });

      await updateDoc(referenciaOtroUsuario, {
        challenges: arrayUnion({
          ...otroReto,
          status: "failed",
        }),
      });

      toast({
        title: "Reto fallido",
        description: "Has fallado el reto y perdido 10 monedas.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar el reto",
        variant: "destructive",
      });
    }
  };

  const manejarCambioCantidad = (idUsuario: string, valor: string) => {
    const valorNumerico = Number.parseInt(valor) || 0;
    setCantidades({
      ...cantidades,
      [idUsuario]: valorNumerico,
    });
  };

  const manejarAgregarFondos = async (idUsuario: string) => {
    if (!cantidades[idUsuario]) {
      toast({
        title: "Cantidad inválida",
        description: "Por favor, introduce una cantidad válida",
        variant: "destructive",
      });
      return;
    }

    try {
      const referenciaUsuario = doc(db, "users", idUsuario);
      const usuario = usuarios.find((u) => u.id === idUsuario);

      if (!usuario) return;

      await updateDoc(referenciaUsuario, {
        balance: usuario.balance + cantidades[idUsuario],
      });

      // Actualizar estado local
      setUsuarios(
        usuarios.map((u) =>
          u.id === idUsuario
            ? { ...u, balance: u.balance + cantidades[idUsuario] }
            : u
        )
      );

      setCantidades({
        ...cantidades,
        [idUsuario]: 0,
      });

      setSaldos((prev) => ({
        ...prev,
        [idUsuario]: prev[idUsuario] + cantidades[idUsuario],
      }));

      // Actualizar puntuaciones
      setUserScores((prevScores) => {
        return prevScores.map((score) => {
          if (score.userId === idUsuario) {
            const newCoins = score.coins + cantidades[idUsuario];
            const newCoinScore = newCoins * COIN_MULTIPLIER;
            return {
              ...score,
              coins: newCoins,
              coinScore: newCoinScore,
              totalScore: newCoinScore + score.challengeScore + score.itemScore,
            };
          }
          return score;
        });
      });

      toast({
        title: "Fondos agregados",
        description: `Se agregaron ${cantidades[idUsuario]} monedas al saldo de ${usuario.username}`,
      });
    } catch (error) {
      console.error("Error al agregar fondos:", error);
      toast({
        title: "Error",
        description:
          "No se pudieron agregar fondos. Consulta la consola para más detalles.",
        variant: "destructive",
      });
    }
  };

  const manejarRemoverFondos = async (idUsuario: string) => {
    if (!cantidades[idUsuario]) {
      toast({
        title: "Cantidad inválida",
        description: "Por favor, introduce una cantidad válida",
        variant: "destructive",
      });
      return;
    }

    try {
      const referenciaUsuario = doc(db, "users", idUsuario);
      const usuario = usuarios.find((u) => u.id === idUsuario);

      if (!usuario) return;

      if (usuario.balance < cantidades[idUsuario]) {
        toast({
          title: "Saldo insuficiente",
          description: `El usuario solo tiene ${usuario.balance} monedas`,
          variant: "destructive",
        });
        return;
      }

      await updateDoc(referenciaUsuario, {
        balance: usuario.balance - cantidades[idUsuario],
      });

      // Actualizar estado local
      setUsuarios(
        usuarios.map((u) =>
          u.id === idUsuario
            ? { ...u, balance: u.balance - cantidades[idUsuario] }
            : u
        )
      );

      setCantidades({
        ...cantidades,
        [idUsuario]: 0,
      });

      setSaldos((prev) => ({
        ...prev,
        [idUsuario]: prev[idUsuario] - cantidades[idUsuario],
      }));

      // Actualizar puntuaciones
      setUserScores((prevScores) => {
        return prevScores.map((score) => {
          if (score.userId === idUsuario) {
            const newCoins = score.coins - cantidades[idUsuario];
            const newCoinScore = newCoins * COIN_MULTIPLIER;
            return {
              ...score,
              coins: newCoins,
              coinScore: newCoinScore,
              totalScore: newCoinScore + score.challengeScore + score.itemScore,
            };
          }
          return score;
        });
      });

      toast({
        title: "Fondos removidos",
        description: `Se removieron ${cantidades[idUsuario]} monedas del saldo de ${usuario.username}`,
      });
    } catch (error) {
      console.error("Error al remover fondos:", error);
      toast({
        title: "Error",
        description:
          "No se pudieron remover fondos. Consulta la consola para más detalles.",
        variant: "destructive",
      });
    }
  };

  if (cargando) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-card rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Error</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div className="text-center p-8 bg-card rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          No se encontraron usuarios
        </h2>
        <p className="text-muted-foreground">
          Crea una cuenta primero para ver usuarios aquí.
        </p>
        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm">Información de depuración:</p>
          <p className="text-xs text-muted-foreground mt-1">
            Asegúrate de que las reglas de seguridad de Firestore permitan leer
            la colección de usuarios.
          </p>
        </div>
      </div>
    );
  }

  if (userData?.isAdmin === false) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Usuarios ({usuarios.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refrescar
          </Button>
        </div>
        <Tabs defaultValue="ranking">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ranking">Ranking Global</TabsTrigger>
            <TabsTrigger value="dinero">Dinero</TabsTrigger>
            <TabsTrigger value="retos">Retos</TabsTrigger>
          </TabsList>

          <TabsContent value="ranking" className="mt-4">
            {userScores
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((score, i) => (
                <Card key={score.userId} className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>
                        {i === 0 && "🏆 "}
                        {i === 1 && "🥈 "}
                        {i === 2 && "🥉 "}
                        {score.username}
                      </span>
                      <span className="text-primary font-bold">
                        {Math.round(score.totalScore)} pts
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                        <Coins className="h-5 w-5 mb-1 text-yellow-500" />
                        <p className="text-sm font-medium">
                          {Math.round(score.coinScore)} pts
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {score.coins} monedas
                        </p>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                        <Trophy className="h-5 w-5 mb-1 text-purple-500" />
                        <p className="text-sm font-medium">
                          {Math.round(score.challengeScore)} pts
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {score.completedChallenges} retos
                        </p>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                        <Package className="h-5 w-5 mb-1 text-blue-500" />
                        <p className="text-sm font-medium">
                          {Math.round(score.itemScore)} pts
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {score.regularItems} objetos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="dinero" className="mt-4">
            {usuarios
              .sort((a, b) => b.balance - a.balance)
              .map((usuario, i) => (
                <Card key={usuario.id} className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>
                        {i === 0 && "🥇 "}
                        {i === 1 && "🥈 "}
                        {i === 2 && "🥉 "}
                        {usuario.username}
                      </span>
                      <span className="text-primary">
                        {saldos[usuario.id]} 🪙
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">
                      Retos completados:{" "}
                      {usuario.challenges
                        ? usuario.challenges.filter(
                            (reto) =>
                              reto.status === "completed" &&
                              reto.isReceived === true
                          ).length
                        : 0}{" "}
                      🏆
                    </p>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
          <TabsContent value="retos" className="mt-4">
            {usuarios
              .sort(
                (a, b) =>
                  retosDeUsuarios[b.id].filter(
                    (reto) =>
                      reto.status === "completed" && reto.isReceived === true
                  ).length -
                  retosDeUsuarios[a.id].filter(
                    (reto) =>
                      reto.status === "completed" && reto.isReceived === true
                  ).length
              )
              .map((usuario, i) => (
                <Card key={usuario.id} className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>
                        {i === 0 && "🥇 "}
                        {i === 1 && "🥈 "}
                        {i === 2 && "🥉 "}
                        {usuario.username}
                      </span>
                      <span className="text-primary">
                        {
                          retosDeUsuarios[usuario.id].filter(
                            (reto) =>
                              reto.status === "completed" &&
                              reto.isReceived === true
                          ).length
                        }{" "}
                        retos
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">
                      Dinero total: {saldos[usuario.id]} 🪙
                    </p>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Usuarios ({usuarios.length})</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Refrescar
        </Button>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="usuarios">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="ranking">Ranking Global</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="mt-4">
          {userScores
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((score, i) => (
              <Card key={score.userId} className="mb-4">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>
                      {i === 0 && "🏆 "}
                      {i === 1 && "🥈 "}
                      {i === 2 && "🥉 "}
                      {score.username}
                    </span>
                    <span className="text-primary font-bold">
                      {Math.round(score.totalScore)} pts
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                      <Coins className="h-5 w-5 mb-1 text-yellow-500" />
                      <p className="text-sm font-medium">
                        {Math.round(score.coinScore)} pts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {score.coins} monedas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        x{COIN_MULTIPLIER}
                      </p>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                      <Trophy className="h-5 w-5 mb-1 text-purple-500" />
                      <p className="text-sm font-medium">
                        {Math.round(score.challengeScore)} pts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {score.completedChallenges} retos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        x{CHALLENGE_MULTIPLIER}
                      </p>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-muted rounded-md">
                      <Package className="h-5 w-5 mb-1 text-blue-500" />
                      <p className="text-sm font-medium">
                        {Math.round(score.itemScore)} pts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {score.regularItems} objetos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        x{ITEM_MULTIPLIER}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          {usuarios.map((usuario) => (
            <Card key={usuario.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{usuario.username}</span>
                  <span className="text-primary">
                    {saldos[usuario.id]} monedas
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {usuario.email}
                </p>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Cantidad"
                      value={cantidades[usuario.id] || ""}
                      onChange={(e) =>
                        manejarCambioCantidad(usuario.id, e.target.value)
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => manejarAgregarFondos(usuario.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => manejarRemoverFondos(usuario.id)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 flex-col"></div>
              </CardContent>
              <CardFooter className="flex-col items-start space-y-4">
                <CardTitle>
                  <span>Retos pendientes</span>
                </CardTitle>
                {(() => {
                  const retosPendientes = retosDeUsuarios[usuario.id].filter(
                    (c) => c.isReceived === true && c.status === "pending"
                  );

                  if (retosPendientes.length === 0) {
                    return (
                      <p className="text-muted-foreground">
                        No hay retos pendientes
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {retosPendientes.map((reto) => (
                        <div
                          key={reto.challengeId}
                          className="flex justify-between items-center"
                        >
                          <span>{reto.challengeName}</span>
                          <div>
                            <Button
                              variant="outline"
                              onClick={() =>
                                manejarRetoFallido(reto.challengeId, usuario.id)
                              }
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Fallar
                            </Button>
                            <Button
                              onClick={() =>
                                manejarCompletarReto(
                                  reto.challengeId,
                                  usuario.id
                                )
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Completar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardFooter>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
