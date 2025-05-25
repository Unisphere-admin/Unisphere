"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, User, LogOut, MessageSquare, Home, BookOpen, Users, LayoutDashboard, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { BadgeIndicator } from "@/components/ui/badge-indicator";

const Navbar = () => {
  const { user, signOut, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const unreadCount = useUnreadCount();

  // Don't show login button while loading to prevent flashing UI
  const showLoginButton = !loading && !user;
  
  // Check if user has premium access
  const hasAccess = user?.role === 'tutor' || user?.has_access;
  const isTutor = user?.role === 'tutor';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur h-[var(--navbar-height)]">
      <div className="w-full h-full px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">TutorMatch</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="transition-colors hover:text-primary">
              Home
            </Link>
            <Link href="/about" className="transition-colors hover:text-primary">
              About
            </Link>
            {user && (
              <Link href={hasAccess ? "/tutors" : "/paywall"} className="transition-colors hover:text-primary group relative">
                Find Tutors
                {user && !hasAccess && (
                  <Lock className="h-3 w-3 inline-block ml-1 text-muted-foreground group-hover:text-primary" />
                )}
              </Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden md:flex items-center gap-2 mr-2">
              <Button variant="outline" asChild>
                <Link href={hasAccess ? "/dashboard" : "/paywall"} className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                  {!hasAccess && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={hasAccess ? "/dashboard/messages" : "/paywall"} className="flex items-center gap-2 relative">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                  {!hasAccess ? (
                    <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                  ) : unreadCount > 0 ? (
                    <span className="absolute -top-2 -right-2">
                      <BadgeIndicator count={unreadCount} size="sm" />
                    </span>
                  ) : null}
                </Link>
              </Button>
            </div>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || user.profilePic || "/placeholder.svg"} alt={user.name || ''} />
                    <AvatarFallback>
                      {user.name && user.name.includes(' ') ? 
                        `${user.name.split(' ')[0][0]}${user.name.split(' ')[1][0]}` : 
                        user.name ? user.name.charAt(0) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <p>{user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {!hasAccess && !isTutor && (
                      <div className="mt-1 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-sm inline-flex items-center">
                        <Lock className="h-3 w-3 mr-1" /> Free account
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <Link href={hasAccess ? "/dashboard" : "/paywall"}>Dashboard</Link>
                  {!hasAccess && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center relative">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <Link href={hasAccess ? "/dashboard/messages" : "/paywall"}>Messages</Link>
                  {!hasAccess ? (
                    <Lock className="ml-auto h-3 w-3 text-muted-foreground" />
                  ) : unreadCount > 0 ? (
                    <BadgeIndicator count={unreadCount} size="sm" className="ml-2" />
                  ) : null}
                </DropdownMenuItem>
                {!hasAccess && !isTutor && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex items-center text-primary">
                      <Link href="/paywall" className="flex items-center w-full">
                        <Lock className="mr-2 h-4 w-4" />
                        Upgrade to Premium
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : showLoginButton ? (
            <Button asChild>
              <Link href="/login">
                <User className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
          ) : null}
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80%] sm:w-[350px]">
              <nav className="flex flex-col gap-4 text-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <span className="font-bold">TutorMatch</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                <Link 
                  href="/" 
                  className="flex items-center gap-2 p-2 hover:bg-muted rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home className="h-5 w-5" /> Home
                </Link>
                <Link 
                  href="/about" 
                  className="flex items-center gap-2 p-2 hover:bg-muted rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <BookOpen className="h-5 w-5" /> About
                </Link>
                {user && (
                  <Link 
                    href={hasAccess ? "/tutors" : "/paywall"}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Users className="h-5 w-5" /> Find Tutors
                    {user && !hasAccess && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
                  </Link>
                )}
                
                {user && (
                  <>
                    <Link 
                      href={hasAccess ? "/dashboard" : "/paywall"}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded-md mt-4"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-5 w-5" /> Dashboard
                      {!hasAccess && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
                    </Link>
                    <Link 
                      href={hasAccess ? "/dashboard/messages" : "/paywall"}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded-md relative"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <MessageSquare className="h-5 w-5" /> Messages
                      {!hasAccess ? (
                        <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                      ) : unreadCount > 0 ? (
                        <BadgeIndicator count={unreadCount} size="sm" className="ml-2" />
                      ) : null}
                    </Link>
                  </>
                )}
                
                {user && !hasAccess && !isTutor && (
                  <Link 
                    href="/paywall"
                    className="flex items-center gap-2 p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md mt-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Lock className="h-5 w-5" /> Upgrade to Premium
                  </Link>
                )}
                
                {showLoginButton && (
                  <Button 
                    asChild
                    className="mt-4"
                  >
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <User className="mr-2 h-4 w-4" />
                      Login
                    </Link>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
