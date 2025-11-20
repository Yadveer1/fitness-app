"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { DumbbellIcon, HomeIcon, UserIcon, ZapIcon, MessageSquare, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const { isSignedIn } = useUser();
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/generate-program", label: "Generate", icon: DumbbellIcon },
    { href: "/calorie_counter", label: "Calories", icon: UtensilsCrossed },
    { href: "/chat_bot", label: "Chat", icon: MessageSquare },
    { href: "/profile", label: "Profile", icon: UserIcon },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 max-w-[1400px] mx-auto">
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative p-2 bg-gradient-to-br from-primary to-primary/60 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <ZapIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-mono whitespace-nowrap">
              Meta<span className="text-primary">Muscle</span>
              <span className="text-xs align-super text-primary/70">.ai</span>
            </span>
          </Link>

          {/* NAVIGATION */}
          <nav className="flex items-center gap-4 w-full justify-end">
            {isSignedIn ? (
              <>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-1 sm:gap-2 max-w-[70vw] justify-end overflow-x-auto md:overflow-visible pr-2">
                  {navItems.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        isActive(href)
                          ? "bg-primary/10 text-primary hover:bg-blue"
                          : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>

                <div className="w-px h-8 bg-border/50 hidden md:block flex-shrink-0" />
                
                <div className="flex-shrink-0">
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-9 h-9 ring-2 ring-border hover:ring-primary/50 transition-all duration-200",
                      },
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <SignInButton>
                  <Button
                    variant="ghost"
                    className="text-sm font-medium hover:bg-accent"
                  >
                    Sign In
                  </Button>
                </SignInButton>

                <SignUpButton>
                  <Button className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium">
                    Sign Up
                  </Button>
                </SignUpButton>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
