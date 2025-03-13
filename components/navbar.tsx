"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ShoppingCart, Users, User, LogOut, Gamepad, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/firebase-hooks"
import { cn } from "@/lib/utils"

export default function Navbar() {
  const pathname = usePathname()
  const { user, userData, signOut } = useAuth()

  const navItems = [
    { href: "/", label: "Home", icon: <Home className="h-4 w-4 mr-2" /> },
    { href: "/store", label: "Store", icon: <ShoppingCart className="h-4 w-4 mr-2" /> },
    { href: "/transfer", label: "Transfer", icon: <Coins className="h-4 w-4 mr-2" /> },
    { href: "/users", label: "Users", icon: <Users className="h-4 w-4 mr-2" /> },
    { href: "/profile", label: "Profile", icon: <User className="h-4 w-4 mr-2" /> },
    { href: "/challenges", label: "Challenges", icon: <User className="h-4 w-4 mr-2" /> },
  ]

  // Admin-only nav items
  const adminItems = [{ href: "/admin/games", label: "Game Admin", icon: <Gamepad className="h-4 w-4 mr-2" /> }]

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
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                    pathname === item.href ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}

              {userData?.isAdmin &&
                adminItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                      pathname === item.href ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}

              <Button variant="ghost" size="sm" onClick={() => signOut()} className="flex items-center">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">{/* Mobile menu implementation would go here */}</div>
        </div>
      </div>
    </nav>
  )
}

