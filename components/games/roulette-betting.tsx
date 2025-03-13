"use client";

import { useState } from "react";
import { useAuth } from "@/lib/firebase-hooks";
import { db } from "@/lib/firebase-config";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Coins } from "lucide-react";
import { useEffect } from "react";

type BetType =
  | "number"
  | "color"
  | "section"
  | "dozen"
  | "column"
  | "evenOdd"
  | "highLow";

interface RouletteBet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  betType: BetType;
  betValue: string;
  timestamp: any;
  status: "pending" | "won" | "lost";
}

export default function RouletteBetting() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [betType, setBetType] = useState<BetType>("number");
  const [betValue, setBetValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [allBets, setAllBets] = useState<RouletteBet[]>([]);
  const [userBets, setUserBets] = useState<RouletteBet[]>([]);
  const [totalPot, setTotalPot] = useState(0);

  useEffect(() => {
    const fetchBets = async () => {
      if (!user) return;

      try {
        const betsRef = collection(db, "bets");
        const q = query(
          betsRef,
          where("game", "==", "roulette"),
          where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);

        const fetchedBets: RouletteBet[] = [];
        let total = 0;

        querySnapshot.forEach((doc) => {
          const betData = doc.data() as RouletteBet;
          betData.id = doc.id;
          fetchedBets.push(betData);
          total += betData.amount;
        });

        setAllBets(fetchedBets);
        setUserBets(fetchedBets.filter((bet) => bet.userId === user.uid));
        setTotalPot(total);
      } catch (error) {
        console.error("Error fetching bets:", error);
      }
    };

    fetchBets();
  }, [user]);

  // Añadir función para calcular el beneficio potencial
  const calculatePotentialWinnings = (bet: RouletteBet): number => {
    let multiplier = 1;
    switch (bet.betType) {
      case "number":
        multiplier = 36; // 35:1 plus original bet
        break;
      case "color":
      case "evenOdd":
      case "highLow":
        multiplier = 2; // 1:1 plus original bet
        break;
      case "dozen":
      case "section":
      case "column":
        multiplier = 3; // 2:1 plus original bet
        break;
    }
    return bet.amount * multiplier;
  };

  // Añadir el cálculo del beneficio total potencial
  const totalPotentialWinnings = userBets.reduce(
    (sum, bet) => sum + calculatePotentialWinnings(bet),
    0
  );

  const handleBet = async () => {
    if (!userData || !user) {
      toast({
        title: "Error",
        description: "You must be logged in to place a bet",
        variant: "destructive",
      });
      return;
    }

    const betAmount = Number.parseInt(amount);

    if (isNaN(betAmount) || betAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    if (betAmount > userData.balance) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough coins for this bet",
        variant: "destructive",
      });
      return;
    }

    if (!betValue) {
      toast({
        title: "Invalid bet",
        description: "Please select a valid bet option",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Update user balance
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: userData.balance - betAmount,
      });

      // Add bet to database
      await addDoc(collection(db, "bets"), {
        userId: user.uid,
        username: userData.username,
        game: "roulette",
        amount: betAmount,
        betType,
        betValue,
        timestamp: serverTimestamp(),
        status: "pending", // pending, won, lost
      });

      toast({
        title: "Bet placed!",
        description: `You bet ${betAmount} coins on ${betType} ${betValue}`,
      });

      // Reset form
      setAmount("");
      setBetValue("");

      // Refresh bets - CORREGIDO: Ahora filtramos por status: "pending"
      const betsRef = collection(db, "bets");
      const q = query(
        betsRef,
        where("game", "==", "roulette"),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(q);

      const fetchedBets: RouletteBet[] = [];
      let total = 0;

      querySnapshot.forEach((doc) => {
        const betData = doc.data() as RouletteBet;
        betData.id = doc.id;
        fetchedBets.push(betData);
        total += betData.amount;
      });

      setAllBets(fetchedBets);
      setUserBets(fetchedBets.filter((bet) => bet.userId === user.uid));
      setTotalPot(total);
    } catch (error) {
      console.error("Error placing bet:", error);
      toast({
        title: "Error",
        description: "Failed to place bet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderBetOptions = () => {
    switch (betType) {
      case "number":
        return (
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 37 }, (_, i) => (
              <Button
                key={i}
                variant={betValue === i.toString() ? "default" : "outline"}
                className={
                  i === 0 ? "bg-green-600 hover:bg-green-700 text-white" : ""
                }
                onClick={() => setBetValue(i.toString())}
              >
                {i}
              </Button>
            ))}
          </div>
        );
      case "color":
        return (
          <div className="flex gap-4">
            <Button
              variant={betValue === "red" ? "default" : "outline"}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setBetValue("red")}
            >
              Red
            </Button>
            <Button
              variant={betValue === "black" ? "default" : "outline"}
              className="bg-black hover:bg-gray-800 text-white"
              onClick={() => setBetValue("black")}
            >
              Black
            </Button>
          </div>
        );
      case "section":
        return (
          <div className="flex gap-4">
            <Button
              variant={betValue === "1-12" ? "default" : "outline"}
              onClick={() => setBetValue("1-12")}
            >
              1st 12 (1-12)
            </Button>
            <Button
              variant={betValue === "13-24" ? "default" : "outline"}
              onClick={() => setBetValue("13-24")}
            >
              2nd 12 (13-24)
            </Button>
            <Button
              variant={betValue === "25-36" ? "default" : "outline"}
              onClick={() => setBetValue("25-36")}
            >
              3rd 12 (25-36)
            </Button>
          </div>
        );
      case "dozen":
        return (
          <div className="flex gap-4">
            <Button
              variant={betValue === "1-12" ? "default" : "outline"}
              onClick={() => setBetValue("1-12")}
            >
              1st Dozen (1-12)
            </Button>
            <Button
              variant={betValue === "13-24" ? "default" : "outline"}
              onClick={() => setBetValue("13-24")}
            >
              2nd Dozen (13-24)
            </Button>
            <Button
              variant={betValue === "25-36" ? "default" : "outline"}
              onClick={() => setBetValue("25-36")}
            >
              3rd Dozen (25-36)
            </Button>
          </div>
        );
      case "column":
        return (
          <div className="flex gap-4">
            <Button
              variant={betValue === "1st" ? "default" : "outline"}
              onClick={() => setBetValue("1st")}
            >
              1st Column
            </Button>
            <Button
              variant={betValue === "2nd" ? "default" : "outline"}
              onClick={() => setBetValue("2nd")}
            >
              2nd Column
            </Button>
            <Button
              variant={betValue === "3rd" ? "default" : "outline"}
              onClick={() => setBetValue("3rd")}
            >
              3rd Column
            </Button>
          </div>
        );
      case "evenOdd":
        return (
          <div className="flex gap-4">
            <Button
              variant={betValue === "even" ? "default" : "outline"}
              onClick={() => setBetValue("even")}
            >
              Even
            </Button>
            <Button
              variant={betValue === "odd" ? "default" : "outline"}
              onClick={() => setBetValue("odd")}
            >
              Odd
            </Button>
          </div>
        );
      case "highLow":
        return (
          <div className="flex gap-4">
            <Button
              variant={betValue === "1-18" ? "default" : "outline"}
              onClick={() => setBetValue("1-18")}
            >
              Low (1-18)
            </Button>
            <Button
              variant={betValue === "19-36" ? "default" : "outline"}
              onClick={() => setBetValue("19-36")}
            >
              High (19-36)
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Place Your Bet</CardTitle>
              <CardDescription>
                Choose your bet type, amount, and value
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="betType">Bet Type</Label>
                <Select
                  value={betType}
                  onValueChange={(value) => {
                    setBetType(value as BetType);
                    setBetValue("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bet type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Straight Up (Number)</SelectItem>
                    <SelectItem value="color">Color (Red/Black)</SelectItem>
                    <SelectItem value="section">
                      Section (1-12, 13-24, 25-36)
                    </SelectItem>
                    <SelectItem value="dozen">
                      Dozen (1-12, 13-24, 25-36)
                    </SelectItem>
                    <SelectItem value="column">
                      Column (1st, 2nd, 3rd)
                    </SelectItem>
                    <SelectItem value="evenOdd">Even/Odd</SelectItem>
                    <SelectItem value="highLow">
                      High/Low (1-18, 19-36)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="betValue">Bet Value</Label>
                <div className="max-h-48 overflow-y-auto p-2 border rounded-md">
                  {renderBetOptions()}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Bet Amount</Label>
                <div className="flex space-x-2">
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <Button
                    onClick={handleBet}
                    disabled={loading || !betValue || !amount}
                  >
                    Place Bet
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Your balance:{" "}
                <span className="font-bold">{userData?.balance || 0}</span>{" "}
                coins
              </p>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Roulette Stats</CardTitle>
              <CardDescription>Current bets and pot size</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Pot:</span>
                <span className="font-bold flex items-center">
                  <Coins className="h-4 w-4 mr-1" />
                  {totalPot} coins
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Your Bets:</span>
                <span className="font-bold flex items-center">
                  <Coins className="h-4 w-4 mr-1" />
                  {userBets.reduce((sum, bet) => sum + bet.amount, 0)} coins
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Potential Winnings:</span>
                <span className="font-bold flex items-center text-green-600">
                  <Coins className="h-4 w-4 mr-1" />
                  {totalPotentialWinnings} coins
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Total Players:</span>
                <span className="font-bold">
                  {new Set(allBets.map((bet) => bet.userId)).size}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Your Bets</CardTitle>
            </CardHeader>
            <CardContent>
              {userBets.length > 0 ? (
                <ul className="space-y-2">
                  {userBets.map((bet) => (
                    <li key={bet.id} className="text-sm border-b pb-2">
                      <div className="flex justify-between">
                        <span>
                          {bet.betType}: {bet.betValue}
                        </span>
                        <span className="font-bold">{bet.amount} coins</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You haven't placed any bets yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
