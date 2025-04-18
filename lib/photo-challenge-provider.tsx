"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "./firebase-hooks";
import { db, storage } from "./firebase-config";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

interface PhotoChallengeContextType {
  isPhotoChallenge: boolean;
  timeRemaining: number;
  takePhoto: (photoData: string) => Promise<void>;
  photoTaken: boolean;
}

const PhotoChallengeContext = createContext<PhotoChallengeContextType>({
  isPhotoChallenge: false,
  timeRemaining: 0,
  takePhoto: async () => {},
  photoTaken: false,
});

export const usePhotoChallenge = () => useContext(PhotoChallengeContext);

export function PhotoChallengeProvider({ children }: { children: ReactNode }) {
  const [isPhotoChallenge, setIsPhotoChallenge] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const [photoTaken, setPhotoTaken] = useState(false);
  const [nextChallengeTime, setNextChallengeTime] = useState<Date | null>(null);
  const { user, userData } = useAuth();
  const { toast } = useToast();

  // Function to schedule the next photo challenge
  const scheduleNextChallenge = async () => {
    if (!user) return;

    const now = new Date();
    const nextChallenge = new Date(now.getTime() + 5000); // 5 segundos desde ahora

    console.log(
      `Next photo challenge scheduled for: ${nextChallenge.toLocaleTimeString()}`
    );
    setNextChallengeTime(nextChallenge);

    try {
      // Save the next challenge time to Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        nextPhotoChallenge: nextChallenge.toISOString(),
      });
    } catch (error) {
      console.error("Error saving next challenge time to Firestore:", error);
    }
  };

  // Initialize or load the next challenge time
  useEffect(() => {
    const fetchNextChallengeTime = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const storedTime = userDoc.data().nextPhotoChallenge;
          console.log("Stored time from Firestore:", storedTime);

          if (storedTime) {
            const parsedTime = new Date(storedTime);
            console.log("Parsed time:", parsedTime);

            // If the stored time is in the past, schedule a new one
            if (parsedTime <= new Date()) {
              console.log(
                "Stored time is in the past. Scheduling a new challenge..."
              );
              scheduleNextChallenge();
            } else {
              console.log(
                "Stored time is in the future. Setting next challenge time..."
              );
              setNextChallengeTime(parsedTime);
            }
          } else {
            console.log("No stored time found. Scheduling a new challenge...");
            scheduleNextChallenge();
          }
        }
      } catch (error) {
        console.error(
          "Error fetching next challenge time from Firestore:",
          error
        );
      }
    };

    fetchNextChallengeTime();
  }, [user]);

  // Check if it's time for a photo challenge
  useEffect(() => {
    if (!nextChallengeTime) return;

    const checkTime = () => {
      const now = new Date();

      // If it's time for the challenge
      if (nextChallengeTime <= now && !isPhotoChallenge && !photoTaken) {
        setIsPhotoChallenge(true);
        setTimeRemaining(180); // Reset to 3 minutes

        toast({
          title: "¡Desafío de foto!",
          description:
            "Tienes 3 minutos para tomar una foto. ¡Gana 50 monedas!",
        });

        // Schedule the next challenge
        scheduleNextChallenge();
      }
    };

    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [nextChallengeTime, isPhotoChallenge, photoTaken, toast]);

  // Countdown timer for the challenge
  useEffect(() => {
    if (!isPhotoChallenge) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsPhotoChallenge(false);

          if (!photoTaken) {
            toast({
              title: "Tiempo agotado",
              description:
                "No tomaste la foto a tiempo. ¡Inténtalo en el próximo desafío!",
              variant: "destructive",
            });
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPhotoChallenge, photoTaken, toast]);

  // Reset photoTaken state after the challenge ends
  useEffect(() => {
    if (!isPhotoChallenge && photoTaken) {
      const timer = setTimeout(() => {
        setPhotoTaken(false);
      }, 5000); // Reset 5 seconds after challenge ends

      return () => clearTimeout(timer);
    }
  }, [isPhotoChallenge, photoTaken]);

  // Function to handle taking a photo
  const takePhoto = async (photoData: string) => {
    if (!user || !userData) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para participar en el desafío",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate a unique ID for the photo
      const photoId = uuidv4();

      // Upload photo to Firebase Storage
      const storageRef = ref(storage, `photos/${user.uid}/${photoId}`);
      await uploadString(storageRef, photoData, "data_url");

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Save photo metadata to Firestore
      await addDoc(collection(db, "photos"), {
        userId: user.uid,
        username: userData.username,
        photoURL: downloadURL,
        timestamp: serverTimestamp(),
        challengeTime: new Date().toISOString(),
      });

      // Update user's balance
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const currentBalance = userDoc.data().balance || 0;
        await updateDoc(userRef, {
          balance: currentBalance + 50, // Award 50 coins
        });
      }

      setPhotoTaken(true);
      setIsPhotoChallenge(false);

      toast({
        title: "¡Foto tomada con éxito!",
        description: "Has ganado 50 monedas por completar el desafío",
      });
    } catch (error) {
      console.error("Error taking photo:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la foto. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <PhotoChallengeContext.Provider
      value={{
        isPhotoChallenge,
        timeRemaining,
        takePhoto,
        photoTaken,
      }}
    >
      {children}
    </PhotoChallengeContext.Provider>
  );
}
