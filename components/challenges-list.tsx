"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase-hooks";
import { db } from "@/lib/firebase-config";
import { doc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";
import LoadingSpinner from "@/components/loading-spinner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// TODO: HACER QUE SOLO SE MUESTREN LOS RETOS RECIBIDOS

export default function ChallengesList() {
  const { userData, user, loading } = useAuth();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});
  const [selectedFilter, setSelectedFilter] = useState<string>("Recieved");

  useEffect(() => {
    if (!userData?.challenges) return;

    // Set up timers for pending challenges
    const pendingChallenges = userData.challenges.filter(
      (c) => c.status === "pending" && c.isReceived
    );

    const timers: Record<string, NodeJS.Timeout> = {};

    pendingChallenges.forEach((challenge) => {
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
    });

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
        (c) => c.challengeId === challengeId
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
        (c) => c.challengeId === challengeId
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

  if (loading || !userData) {
    return <LoadingSpinner />;
  }

  const pendingChallenges =
    userData.challenges?.filter((c) => {
      if (selectedFilter === "Recieved") {
        return c.status === "pending" && c.isReceived === true;
      } else if (selectedFilter === "Sent") {
        return c.status === "pending" && c.isReceived === false;
      }
      return false;
    }) || [];

  const completedChallenges =
    userData.challenges?.filter((c) => {
      if (selectedFilter === "Recieved") {
        return c.status === "completed" && c.isReceived === true;
      } else if (selectedFilter === "Sent") {
        return c.status === "completed" && c.isReceived === false;
      }
      return false;
    }) || [];

  const failedChallenges =
    userData.challenges?.filter((c) => {
      if (selectedFilter === "Recieved") {
        return c.status === "failed" && c.isReceived === true;
      } else if (selectedFilter === "Sent") {
        return c.status === "failed" && c.isReceived === false;
      }
      return false;
    }) || [];

  return (
    <div className="space-y-8">
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
        <h2 className="text-xl font-semibold mb-4">Desafíos Pendientes</h2>
        {pendingChallenges.length > 0 ? (
          <div className="space-y-4">
            {pendingChallenges.map((challenge) => (
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
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay desafíos pendientes</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Desafíos Completados</h2>
        {completedChallenges.length > 0 ? (
          <div className="space-y-4">
            {completedChallenges.map((challenge) => (
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
            {failedChallenges.map((challenge) => (
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
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay desafíos fallidos</p>
        )}
      </div>
    </div>
  );
}
