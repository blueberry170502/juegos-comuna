"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingCart,
  Users,
  User,
  LogOut,
  Gamepad,
  Coins,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/firebase-hooks";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function Navbar() {
  const pathname = usePathname();
  const { user, userData, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: <Home className="h-4 w-4 mr-2" /> },
    {
      href: "/store",
      label: "Store",
      icon: <ShoppingCart className="h-4 w-4 mr-2" />,
    },
    {
      href: "/transfer",
      label: "Transfer",
      icon: <Coins className="h-4 w-4 mr-2" />,
    },
    {
      href: "/users",
      label: "Users",
      icon: <Users className="h-4 w-4 mr-2" />,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="h-4 w-4 mr-2" />,
    },
    {
      href: "/challenges",
      label: "Challenges",
      icon: <User className="h-4 w-4 mr-2" />,
    },
  ];

  // Juegos
  const gameItems = [
    {
      href: "/games/roulette",
      label: "Roulette",
      icon: <Gamepad className="h-4 w-4 mr-2" />,
    },
    {
      href: "/games/blackjack",
      label: "Blackjack",
      icon: <Gamepad className="h-4 w-4 mr-2" />,
    },
    {
      href: "/games/poker",
      label: "Poker",
      icon: <Gamepad className="h-4 w-4 mr-2" />,
    },
    {
      href: "/games/horse-racing",
      label: "Horse Racing",
      icon: <Gamepad className="h-4 w-4 mr-2" />,
    },
    {
      href: "/games/slots",
      label: "Slot Machine",
      icon: <Gamepad className="h-4 w-4 mr-2" />,
    },
  ];

  // Admin-only nav items
  const adminItems = [
    {
      href: "/admin/games",
      label: "Game Admin",
      icon: <Gamepad className="h-4 w-4 mr-2" />,
    },
  ];

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <nav className="bg-background border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="font-bold text-xl">
              Party Game
            </Link>
          </div>

          {user && (
            <>
              {/* Desktop Navigation */}
              <div className="hidden md:flex space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}

                {/* Games Dropdown - Desktop */}
                <div className="relative group">
                  <button className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted">
                    <Gamepad className="h-4 w-4 mr-2" />
                    Games
                  </button>
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-background border border-border hidden group-hover:block z-50">
                    <div className="py-1">
                      {gameItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center px-4 py-2 text-sm",
                            pathname === item.href
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {userData?.isAdmin &&
                  adminItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                        pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[80%] sm:w-[350px]">
                    <SheetHeader>
                      <SheetTitle>Navigation Menu</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col space-y-4 py-4">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleLinkClick}
                          className={cn(
                            "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                            pathname === item.href
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}

                      {/* Games Section - Mobile */}
                      <div className="px-3 py-2">
                        <h3 className="text-sm font-medium mb-2">Games</h3>
                        <div className="pl-2 border-l-2 border-muted space-y-1">
                          {gameItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={handleLinkClick}
                              className={cn(
                                "flex items-center px-3 py-2 rounded-md text-sm",
                                pathname === item.href
                                  ? "bg-primary text-primary-foreground"
                                  : "text-foreground hover:bg-muted"
                              )}
                            >
                              {item.icon}
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {userData?.isAdmin && (
                        <div className="px-3 py-2">
                          <h3 className="text-sm font-medium mb-2">Admin</h3>
                          <div className="pl-2 border-l-2 border-muted space-y-1">
                            {adminItems.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={handleLinkClick}
                                className={cn(
                                  "flex items-center px-3 py-2 rounded-md text-sm",
                                  pathname === item.href
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground hover:bg-muted"
                                )}
                              >
                                {item.icon}
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => signOut()}
                        className="flex items-center justify-start px-3"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
