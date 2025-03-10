"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "./firebase-hooks";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase-config";

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  isAdmin: boolean;
  purchases: Purchase[];
  challenges: Challenge[];
}

export interface Purchase {
  itemId: string;
  itemName: string;
  price: number;
  purchasedAt: string;
}

export interface Challenge {
  challengeId: string;
  challengeName: string;
  otherUserId: string;
  otherUsername: string;
  status: "pending" | "completed" | "failed"; // Tipo estricto como unión de literales
  isReceived: boolean;
  timeRemaining?: string;
}

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "regular" | "challenge";
  image?: string;
}

interface AppContextType {
  userData: User | null;
  allUsers: User[];
  storeItems: StoreItem[];
  loading: boolean;
  updateUserBalance: (userId: string, newBalance: number) => Promise<void>;
  purchaseItem: (item: StoreItem) => Promise<void>;
  sendChallenge: (item: StoreItem, targetUserId: string) => Promise<void>;
  completeChallenge: (challengeId: string) => Promise<void>;
  failChallenge: (challengeId: string) => Promise<void>;
}

// Mock data
const mockStoreItems: StoreItem[] = [
  {
    id: "1",
    name: "Party Hat",
    description: "A colorful hat for the party",
    price: 50,
    type: "regular",
  },
  {
    id: "2",
    name: "Confetti Cannon",
    description: "Blast confetti all over the place",
    price: 100,
    type: "regular",
  },
  {
    id: "3",
    name: "Dance Challenge",
    description: "Challenge someone to dance for 30 seconds",
    price: 150,
    type: "challenge",
  },
  {
    id: "4",
    name: "Sing Challenge",
    description: "Challenge someone to sing a song",
    price: 200,
    type: "challenge",
  },
  {
    id: "5",
    name: "Truth or Dare",
    description: "Challenge someone to answer a truth or perform a dare",
    price: 250,
    type: "challenge",
  },
  {
    id: "6",
    name: "Drink Ticket",
    description: "Redeem for a drink at the party",
    price: 75,
    type: "regular",
  },
];

// Create context
const AppContext = createContext<AppContextType>({
  userData: null,
  allUsers: [],
  storeItems: [],
  loading: true,
  updateUserBalance: async () => {},
  purchaseItem: async () => {},
  sendChallenge: async () => {},
  completeChallenge: async () => {},
  failChallenge: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const { userData: authUserData, user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>(mockStoreItems);
  const [loading, setLoading] = useState(true);

  // Sincronizar userData desde auth
  useEffect(() => {
    if (authUserData && user) {
      const formattedUserData: User = {
        id: user.uid,
        username: authUserData.username,
        email: authUserData.email,
        balance: authUserData.balance,
        isAdmin: authUserData.isAdmin,
        purchases: authUserData.purchases || [],
        challenges: authUserData.challenges || [],
      };
      setUserData(formattedUserData);

      // Actualizar allUsers si el usuario actual no está en la lista
      setAllUsers((prev) => {
        const exists = prev.some((u) => u.id === formattedUserData.id);
        if (!exists) {
          return [...prev, formattedUserData];
        }
        return prev.map((u) =>
          u.id === formattedUserData.id ? formattedUserData : u
        );
      });
    } else {
      setUserData(null);
    }

    setLoading(authLoading);
  }, [authUserData, user, authLoading]);

  const updateUserBalance = async (userId: string, newBalance: number) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        balance: newBalance,
      });

      // Actualizar estado local
      if (userData && userData.id === userId) {
        setUserData({
          ...userData,
          balance: newBalance,
        });
      }

      setAllUsers(
        allUsers.map((u) =>
          u.id === userId ? { ...u, balance: newBalance } : u
        )
      );
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  };

  const purchaseItem = async (item: StoreItem) => {
    if (!userData || !user) return;

    try {
      const userRef = doc(db, "users", user.uid);

      // Crear nueva compra
      const newPurchase: Purchase = {
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        purchasedAt: new Date().toISOString(),
      };

      // Actualizar en Firestore
      await updateDoc(userRef, {
        balance: userData.balance - item.price,
        purchases: arrayUnion(newPurchase),
      });

      // Actualizar estado local
      const updatedUserData = {
        ...userData,
        balance: userData.balance - item.price,
        purchases: [...userData.purchases, newPurchase],
      };

      setUserData(updatedUserData);

      setAllUsers(
        allUsers.map((u) => (u.id === userData.id ? updatedUserData : u))
      );
    } catch (error) {
      console.error("Error purchasing item:", error);
    }
  };

  const sendChallenge = async (item: StoreItem, targetUserId: string) => {
    if (!userData || !user) return;

    try {
      // Encontrar usuario objetivo
      const targetUser = allUsers.find((u) => u.id === targetUserId);
      if (!targetUser) return;

      // Crear ID de desafío
      const challengeId = uuidv4();

      // Crear desafío para el remitente
      const senderChallenge: Challenge = {
        challengeId,
        challengeName: item.name,
        otherUserId: targetUserId,
        otherUsername: targetUser.username,
        status: "pending", // Usar el literal específico
        isReceived: false,
      };

      // Crear desafío para el receptor
      const receiverChallenge: Challenge = {
        challengeId,
        challengeName: item.name,
        otherUserId: userData.id,
        otherUsername: userData.username,
        status: "pending", // Usar el literal específico
        isReceived: true,
      };

      // Actualizar en Firestore para el remitente
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - item.price,
        challenges: arrayUnion(senderChallenge),
      });

      // Actualizar en Firestore para el receptor
      const targetUserRef = doc(db, "users", targetUserId);
      await updateDoc(targetUserRef, {
        challenges: arrayUnion(receiverChallenge),
      });

      // Actualizar estado local
      const updatedUserData = {
        ...userData,
        balance: userData.balance - item.price,
        challenges: [...userData.challenges, senderChallenge],
      };

      setUserData(updatedUserData);

      setAllUsers(
        allUsers.map((u) => {
          if (u.id === userData.id) {
            return updatedUserData;
          } else if (u.id === targetUserId) {
            return {
              ...u,
              challenges: [...u.challenges, receiverChallenge],
            };
          }
          return u;
        })
      );
    } catch (error) {
      console.error("Error sending challenge:", error);
    }
  };

  const completeChallenge = async (challengeId: string) => {
    if (!userData || !user) return;

    try {
      // Encontrar el desafío
      const challenge = userData.challenges.find(
        (c) => c.challengeId === challengeId
      );
      if (!challenge) return;

      // Actualizar en Firestore
      const userRef = doc(db, "users", user.uid);

      // Actualizar estado local
      const updatedChallenges = userData.challenges.map((c) =>
        c.challengeId === challengeId
          ? { ...c, status: "completed" as const }
          : c
      );

      const updatedUserData = {
        ...userData,
        challenges: updatedChallenges,
      };

      setUserData(updatedUserData);

      // Actualizar allUsers
      setAllUsers(
        allUsers.map((u) => {
          if (u.id === userData.id) {
            return updatedUserData;
          } else if (u.id === challenge.otherUserId) {
            return {
              ...u,
              challenges: u.challenges.map((c) =>
                c.challengeId === challengeId
                  ? { ...c, status: "completed" as const }
                  : c
              ),
            };
          }
          return u;
        })
      );
    } catch (error) {
      console.error("Error completing challenge:", error);
    }
  };

  const failChallenge = async (challengeId: string) => {
    if (!userData || !user) return;

    try {
      // Encontrar el desafío
      const challenge = userData.challenges.find(
        (c) => c.challengeId === challengeId
      );
      if (!challenge) return;

      // Actualizar en Firestore
      const userRef = doc(db, "users", user.uid);

      // Actualizar estado local
      const updatedChallenges = userData.challenges.map((c) =>
        c.challengeId === challengeId ? { ...c, status: "failed" as const } : c
      );

      const updatedUserData = {
        ...userData,
        balance: userData.balance - 10, // Penalización
        challenges: updatedChallenges,
      };

      setUserData(updatedUserData);

      // Actualizar allUsers
      setAllUsers(
        allUsers.map((u) => {
          if (u.id === userData.id) {
            return updatedUserData;
          } else if (u.id === challenge.otherUserId) {
            return {
              ...u,
              challenges: u.challenges.map((c) =>
                c.challengeId === challengeId
                  ? { ...c, status: "failed" as const }
                  : c
              ),
            };
          }
          return u;
        })
      );
    } catch (error) {
      console.error("Error failing challenge:", error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        userData,
        allUsers,
        storeItems,
        loading,
        updateUserBalance,
        purchaseItem,
        sendChallenge,
        completeChallenge,
        failChallenge,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
