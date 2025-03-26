"use client";

import type React from "react";

import { useState } from "react";
import { useAuth } from "@/lib/firebase-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FcGoogle } from "react-icons/fc";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState({ form: "" });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signUp, loading, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
    } catch (error) {
      toast({
        title: "Error signing in",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password, username);
      toast({
        title: "Account created!",
        description: "Your account has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error creating account",
        description: "Please try again with a different email or username.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      console.log(
        "Login page - Usuario de Google autenticado con ID:",
        user.uid
      );
    } catch (error) {
      console.error("Error de inicio de sesión con Google:", error);
      setErrors({
        form: "El inicio de sesión con Google falló. Por favor, inténtelo de nuevo.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          Welcome to Party Game
        </CardTitle>
        <CardDescription className="text-center">
          Sign in or create an account to join the party
        </CardDescription>
      </CardHeader>
      <Tabs defaultValue="signin">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-gray-500">or</span>
              </div>
              <Button
                onClick={handleGoogleSignIn}
                className="w-full"
                disabled={isGoogleLoading}
                variant="outline"
              >
                <FcGoogle className="mr-2 h-4 w-4" />
                <span>
                  {isGoogleLoading
                    ? "Signing in with Google..."
                    : "Sign In with Google"}
                </span>
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Your party name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-gray-500">or</span>
              </div>
              <Button
                onClick={handleGoogleSignIn}
                className="w-full"
                disabled={isGoogleLoading}
                variant="outline"
              >
                <FcGoogle className="mr-2 h-4 w-4" />
                <span>
                  {isGoogleLoading
                    ? "Signing in with Google..."
                    : "Sign In with Google"}
                </span>
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
