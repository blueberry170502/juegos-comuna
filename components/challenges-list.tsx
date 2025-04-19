"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase-hooks";
import { db } from "@/lib/firebase-config";
import {
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, ShieldCheck } from "lucide-react";
import LoadingSpinner from "@/components/loading-spinner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Blocker {
  itemId: string;
  itemName: string;
  price: number;
  purchasedAt: any;
}

export default function ChallengesList() {
  const { userData, user, loading } = useAuth();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});
  const [selectedFilter, setSelectedFilter] = useState<string>("Recieved");
  const [selectedChallengeToBlock, setSelectedChallengeToBlock] = useState<
    string | null
  >(null);
  const [blockers, setBlockers] = useState<Blocker[]>([]);

  useEffect(() => {
    if (!userData) return;

    // Get blockers from user data
    setBlockers(userData.blockers || []);

    // Set up timers for pending challenges
    const pendingChallenges = userData.challenges?.filter(
      (c: { status: string; isReceived: any; blocked: any }) =>
        c.status === "pending" && c.isReceived && !c.blocked
    );

    const timers: Record<string, NodeJS.Timeout> = {};

    pendingChallenges?.forEach(
      (challenge: { createdAt: { seconds: number }; challengeId: string }) => {
        if (!challenge.createdAt) return;

        // Calcular el tiempo restante en segundos
        const createdAt = challenge.createdAt.seconds * 1000; // Convertir a milisegundos
        const now = Date.now();
        const timeElapsed = Math.floor((now - createdAt) / 1000); // Tiempo transcurrido en segundos
        const totalDuration = 300; // 5 minutos en segundos
        let secondsLeft = totalDuration - timeElapsed;

        if (secondsLeft <= 0) {
          // Si el tiempo ya ha expirado, manejar el fallo del desafío
          handleFailChallenge(challenge.challengeId);
          return;
        }

        const updateTime = () => {
          const minutes = Math.floor(secondsLeft / 60);
          const seconds = secondsLeft % 60;
          setTimeLeft((prev) => ({
            ...prev,
            [challenge.challengeId]: `${minutes}:${seconds
              .toString()
              .padStart(2, "0")}`,
          }));

          if (secondsLeft <= 0) {
            clearInterval(timers[challenge.challengeId]);
            handleFailChallenge(challenge.challengeId);
          }

          secondsLeft--;
        };

        updateTime(); // Initial call
        timers[challenge.challengeId] = setInterval(updateTime, 1000);
      }
    );

    return () => {
      // Clean up timers
      Object.values(timers).forEach((timer) => clearInterval(timer));
    };
  }, [userData]);

  const handleCompleteChallenge = async (challengeId: string) => {
    if (!userData || !user) return;

    try {
      const userRef = doc(db, "users", user.uid);

      // Find the challenge
      const challenge = userData.challenges?.find(
        (c: { challengeId: string }) => c.challengeId === challengeId
      );
      if (!challenge) return;

      // Remove the pending challenge
      await updateDoc(userRef, {
        challenges: arrayRemove(challenge),
      });

      // Add the completed challenge
      await updateDoc(userRef, {
        challenges: arrayUnion({
          ...challenge,
          status: "completed",
        }),
      });

      // Update the other user's challenge too
      const otherUserRef = doc(db, "users", challenge.otherUserId);
      const otherChallenge = {
        challengeId: challenge.challengeId,
        challengeName: challenge.challengeName,
        challengeDescription: challenge.challengeDescription,
        otherUserId: user.uid,
        otherUsername: userData.username,
        status: "pending",
        isReceived: false,
      };

      await updateDoc(otherUserRef, {
        challenges: arrayRemove(otherChallenge),
      });

      await updateDoc(otherUserRef, {
        challenges: arrayUnion({
          ...otherChallenge,
          status: "completed",
        }),
      });

      toast({
        title: "Challenge completed!",
        description: "You've successfully completed the challenge.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete challenge",
        variant: "destructive",
      });
    }
  };

  const handleFailChallenge = async (challengeId: string) => {
    if (!userData || !user) return;

    try {
      const userRef = doc(db, "users", user.uid);

      // Find the challenge
      const challenge = userData.challenges?.find(
        (c: { challengeId: string }) => c.challengeId === challengeId
      );
      if (!challenge) return;

      // Remove the pending challenge
      await updateDoc(userRef, {
        challenges: arrayRemove(challenge),
      });

      // Add the failed challenge and deduct balance
      await updateDoc(userRef, {
        challenges: arrayUnion({
          ...challenge,
          status: "failed",
        }),
        balance: userData.balance - 10, // Penalty
      });

      // Update the other user's challenge too
      const otherUserRef = doc(db, "users", challenge.otherUserId);
      const otherChallenge = {
        challengeId: challenge.challengeId,
        challengeName: challenge.challengeName,
        challengeDescription: challenge.challengeDescription,
        otherUserId: user.uid,
        otherUsername: userData.username,
        status: "pending",
        isReceived: false,
      };

      await updateDoc(otherUserRef, {
        challenges: arrayRemove(otherChallenge),
      });

      await updateDoc(otherUserRef, {
        challenges: arrayUnion({
          ...otherChallenge,
          status: "failed",
        }),
      });

      toast({
        title: "Challenge failed",
        description: "You've failed the challenge and lost 10 coins.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update challenge status",
        variant: "destructive",
      });
    }
  };

  const handleBlockChallenge = async () => {
    if (
      !userData ||
      !user ||
      !selectedChallengeToBlock ||
      blockers.length === 0
    )
      return;

    try {
      const userRef = doc(db, "users", user.uid);

      // Find the challenge
      const challenge = userData.challenges?.find(
        (c: { challengeId: string }) =>
          c.challengeId === selectedChallengeToBlock
      );
      if (!challenge) return;

      // Find the blocker to use (use the first one)
      const blockerToUse = blockers[0];

      // Remove the pending challenge
      await updateDoc(userRef, {
        challenges: arrayRemove(challenge),
      });

      // Add the blocked challenge
      await updateDoc(userRef, {
        challenges: arrayUnion({
          ...challenge,
          blocked: true,
        }),
      });

      // Remove the blocker from user's inventory
      await updateDoc(userRef, {
        blockers: arrayRemove(blockerToUse),
      });

      // Update the other user's challenge too
      const otherUserRef = doc(db, "users", challenge.otherUserId);
      const otherUserDoc = await getDoc(otherUserRef);

      if (otherUserDoc.exists()) {
        const otherUserData = otherUserDoc.data();
        const otherChallenge = otherUserData.challenges?.find(
          (c: any) =>
            c.challengeId === challenge.challengeId &&
            c.otherUserId === user.uid
        );

        if (otherChallenge) {
          await updateDoc(otherUserRef, {
            challenges: arrayRemove(otherChallenge),
          });

          await updateDoc(otherUserRef, {
            challenges: arrayUnion({
              ...otherChallenge,
              blocked: true,
            }),
          });
        }
      }

      toast({
        title: "Challenge blocked!",
        description: "You've successfully blocked the challenge.",
      });

      // Update local state
      setBlockers(blockers.filter((b) => b !== blockerToUse));
      setSelectedChallengeToBlock(null);
    } catch (error) {
      console.error("Error blocking challenge:", error);
      toast({
        title: "Error",
        description: "Failed to block challenge",
        variant: "destructive",
      });
    }
  };

  if (loading || !userData) {
    return <LoadingSpinner />;
  }

  const pendingChallenges =
    userData.challenges?.filter(
      (c: { status: string; isReceived: boolean; blocked: any }) => {
        if (selectedFilter === "Recieved") {
          return c.status === "pending" && c.isReceived === true && !c.blocked;
        } else if (selectedFilter === "Sent") {
          return c.status === "pending" && c.isReceived === false && !c.blocked;
        }
        return false;
      }
    ) || [];

  const blockedChallenges =
    userData.challenges?.filter(
      (c: { status: string; isReceived: boolean }) => {
        if (selectedFilter === "Recieved") {
          return c.status === "blocked" && c.isReceived === true;
        } else if (selectedFilter === "Sent") {
          return c.status === "blocked" && c.isReceived === false;
        }
        return false;
      }
    ) || [];

  const completedChallenges =
    userData.challenges?.filter(
      (c: { status: string; isReceived: boolean }) => {
        if (selectedFilter === "Recieved") {
          return c.status === "completed" && c.isReceived === true;
        } else if (selectedFilter === "Sent") {
          return c.status === "completed" && c.isReceived === false;
        }
        return false;
      }
    ) || [];

  const failedChallenges =
    userData.challenges?.filter(
      (c: { status: string; isReceived: boolean }) => {
        if (selectedFilter === "Recieved") {
          return c.status === "failed" && c.isReceived === true;
        } else if (selectedFilter === "Sent") {
          return c.status === "failed" && c.isReceived === false;
        }
        return false;
      }
    ) || [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Label htmlFor="Filter by">Filtrar por:</Label>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger>
              <SelectValue defaultValue="Recibidos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="Recieved" value="Recieved">
                Recibidos
              </SelectItem>
              <SelectItem key="Sent" value="Sent">
                Enviados
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            Bloqueadores disponibles: {blockers.length}
          </Badge>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Desafíos Pendientes</h2>
        {pendingChallenges.length > 0 ? (
          <div className="space-y-4">
            {pendingChallenges.map((challenge: any) => (
              <Card key={challenge.challengeId}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{challenge.challengeName}</CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    >
                      Pendiente
                    </Badge>
                  </div>
                  <CardDescription>
                    {challenge.isReceived ? "De" : "Para"}:{" "}
                    {challenge.otherUsername}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {challenge.challengeDescription && (
                    <p className="text-muted-foreground mb-4">
                      {challenge.challengeDescription}
                    </p>
                  )}
                  {challenge.isReceived && (
                    <div className="flex items-center text-yellow-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>
                        Tiempo restante:{" "}
                        {timeLeft[challenge.challengeId] || "5:00"}
                      </span>
                    </div>
                  )}
                </CardContent>
                {challenge.isReceived && blockers.length > 0 && (
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center"
                      onClick={() =>
                        setSelectedChallengeToBlock(challenge.challengeId)
                      }
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Bloquear este desafío
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay desafíos pendientes</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Desafíos Bloqueados</h2>
        {blockedChallenges.length > 0 ? (
          <div className="space-y-4">
            {blockedChallenges.map((challenge: any) => (
              <Card key={challenge.challengeId}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{challenge.challengeName}</CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                    >
                      Bloqueado
                    </Badge>
                  </div>
                  <CardDescription>
                    {challenge.isReceived ? "De" : "Para"}:{" "}
                    {challenge.otherUsername}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {challenge.challengeDescription && (
                    <p className="text-muted-foreground mb-4">
                      {challenge.challengeDescription}
                    </p>
                  )}
                  <div className="flex items-center text-blue-500">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    <span>Este desafío ha sido bloqueado</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay desafíos bloqueados</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Desafíos Completados</h2>
        {completedChallenges.length > 0 ? (
          <div className="space-y-4">
            {completedChallenges.map((challenge: any) => (
              <Card key={challenge.challengeId}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{challenge.challengeName}</CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-green-500/10 text-green-500 border-green-500/20"
                    >
                      Completado
                    </Badge>
                  </div>
                  <CardDescription>
                    {challenge.isReceived ? "De" : "Para"}:{" "}
                    {challenge.otherUsername}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {challenge.challengeDescription && (
                    <p className="text-muted-foreground">
                      {challenge.challengeDescription}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay desafíos completados</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Desafíos Fallidos</h2>
        {failedChallenges.length > 0 ? (
          <div className="space-y-4">
            {failedChallenges.map((challenge: any) => (
              <Card key={challenge.challengeId}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{challenge.challengeName}</CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-red-500/10 text-red-500 border-red-500/20"
                    >
                      Fallido
                    </Badge>
                  </div>
                  <CardDescription>
                    {challenge.isReceived ? "De" : "Para"}:{" "}
                    {challenge.otherUsername}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {challenge.challengeDescription && (
                    <p className="text-muted-foreground">
                      {challenge.challengeDescription}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay desafíos fallidos</p>
        )}
      </div>

      <Dialog
        open={!!selectedChallengeToBlock}
        onOpenChange={(open) => !open && setSelectedChallengeToBlock(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Desafío</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres usar un bloqueador para este desafío?
              Tienes {blockers.length} bloqueadores disponibles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedChallengeToBlock(null)}
            >
              Cancelar
            </Button>
            <Button onClick={handleBlockChallenge}>Bloquear Desafío</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
