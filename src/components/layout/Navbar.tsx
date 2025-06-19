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
import { Menu, X, User, LogOut, MessageSquare, Home, Globe, Users, LayoutDashboard, Lock, Bell, Settings, ChevronDown, CalendarPlus, GraduationCap } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { BadgeIndicator } from "@/components/ui/badge-indicator";
import { getInitials, getAvatarUrl } from "@/utils/nameUtils";

// Create a separate LogoutButton component to encapsulate the signOut functionality
const LogoutButton = ({ 
  variant = "outline", 
  className = "", 
  onLogout = () => {}
}: { 
  variant?: "outline" | "default" | "destructive" | "ghost" | "link" | "secondary"; 
  className?: string;
  onLogout?: () => void;
}) => {
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
    if (onLogout) onLogout();
  };
  
  return (
    <Button 
      variant={variant}
      onClick={handleSignOut}
      className={className}
    >
      <LogOut className="mr-2 h-4 w-4" strokeWidth={2} />
      Logout
    </Button>
  );
};

const Navbar = () => {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const unreadCount = useUnreadCount();

  // Don't show login button while loading to prevent flashing UI
  const showLoginButton = !loading && !user;
  
  // Check if user has premium access
  const hasAccess = user?.role === 'tutor' || user?.has_access;
  const isTutor = user?.role === 'tutor';
  
  // Show consultation button only for non-logged in users or non-premium students
  const showConsultationButton = !loading && (!user || (!hasAccess && !isTutor));

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm shadow-sm h-[var(--navbar-height)]">
      <div className="w-full h-full px-4 md:px-8 flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center space-x-2 group">
            <img src="/logo-name.png" alt="Unisphere" className="h-8 w-auto" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm ml-6">
            <Link href="/" className="font-medium text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/about" className="font-medium text-muted-foreground hover:text-foreground transition-colors">
              About Us
            </Link>
            <Link 
              href="/tutors" 
              className="font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse Tutors
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:flex items-center gap-3 mr-1">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground hover:bg-muted">
                <Link href={hasAccess ? "/dashboard" : "/paywall"} className="flex items-center gap-1.5 font-medium">
                  <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                  Dashboard
                  {!hasAccess && <Lock className="h-3 w-3 ml-0.5 text-muted-foreground" strokeWidth={2.5} />}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground hover:bg-muted relative">
                <Link href={hasAccess ? "/dashboard/messages" : "/paywall"} className="flex items-center gap-1.5 font-medium">
                  <MessageSquare className="h-4 w-4" strokeWidth={2} />
                  Messages
                  {!hasAccess ? (
                    <Lock className="h-3 w-3 ml-0.5 text-muted-foreground" strokeWidth={2.5} />
                  ) : unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1">
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
                <Button variant="ghost" size="sm" className="rounded-full h-9 pl-2 pr-2.5 gap-1 text-sm">
                  <Avatar className="h-7 w-7 border border-border/40">
                    <AvatarImage src={user.avatar_url || user.profilePic || undefined} alt={user.name || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-[#84b4cc]/80 to-[#3e5461]/50 text-white font-medium text-xs">
                      {getInitials(user) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium ml-1 hidden sm:inline-block max-w-[100px] truncate">
                    {user.name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" strokeWidth={2} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 shadow-md border-border/40">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <p className="font-medium">{user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {!hasAccess && !isTutor && (
                      <div className="mt-1.5 text-xs px-1.5 py-0.5 bg-[#c7e4e3] text-[#126d94] dark:bg-[#3e5461]/20 dark:text-[#84b7bd] rounded-md inline-flex items-center w-fit">
                        <Lock className="h-3 w-3 mr-1" strokeWidth={2} /> Free account
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem className="focus:bg-muted">
                  <Link href={hasAccess ? "/dashboard" : "/paywall"} className="flex items-center w-full">
                    <LayoutDashboard className="mr-2 h-4 w-4 text-[#3e5461]" strokeWidth={2} />
                    Dashboard
                    {!hasAccess && <Lock className="ml-auto h-3 w-3 text-muted-foreground" strokeWidth={2} />}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted">
                  <Link href={hasAccess ? "/dashboard/messages" : "/paywall"} className="flex items-center w-full">
                    <MessageSquare className="mr-2 h-4 w-4 text-[#3e5461]" strokeWidth={2} />
                    Messages
                  {!hasAccess ? (
                      <Lock className="ml-auto h-3 w-3 text-muted-foreground" strokeWidth={2} />
                  ) : unreadCount > 0 ? (
                      <BadgeIndicator count={unreadCount} size="sm" className="ml-auto" />
                  ) : null}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted">
                  <Link href="/dashboard/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4 text-[#3e5461]" strokeWidth={2} />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {!hasAccess && !isTutor && (
                  <>
                    <DropdownMenuSeparator className="bg-border/40" />
                    <DropdownMenuItem className="focus:bg-[#3e5461]/10 text-[#128ca0]">
                      <Link href="/paywall" className="flex items-center w-full">
                        <Lock className="mr-2 h-4 w-4" strokeWidth={2} />
                        Upgrade to Premium
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem asChild className="focus:bg-destructive/10 text-destructive">
                  <div className="w-full">
                    <LogoutButton variant="ghost" className="w-full justify-start p-0 h-auto font-normal text-destructive bg-transparent" />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : showLoginButton ? (
            <Button asChild size="sm" className="bg-[#128ca0] hover:bg-[#126d94] shadow-sm font-medium">
              <Link href="/login" className="flex items-center gap-1.5">
                <User className="h-4 w-4" strokeWidth={2} />
                Login
              </Link>
            </Button>
          ) : null}

          {/* Only show consultation button for non-logged in users or non-premium students */}
          {showConsultationButton && (
            <Button variant="outline" size="sm" asChild className="hidden md:flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shadow-sm">
              <Link href="/consultation">
                <CalendarPlus className="h-4 w-4 mr-1" strokeWidth={2} />
                Book A Free Consultation
              </Link>
            </Button>
          )}
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden h-9 w-9 shadow-sm border-border/40">
                <Menu className="h-5 w-5" strokeWidth={1.5} />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80%] sm:w-[350px] border-l border-border/40 pr-0">
              <nav className="flex flex-col gap-4 text-base pr-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img src="/logo-name.png" alt="Unisphere" className="h-8 w-auto" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </div>
                
                <Link 
                  href="/" 
                  className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Home
                </Link>
                <Link 
                  href="/about" 
                  className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Globe className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> About Us
                </Link>
                <Link 
                  href="/tutors"
                  className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Users className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Browse Tutors
                </Link>

                {/* Only show consultation button for non-logged in users or non-premium students in mobile menu */}
                {showConsultationButton && (
                  <Link 
                    href="/consultation"
                    className="flex items-center gap-3 p-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <CalendarPlus className="h-5 w-5" strokeWidth={1.5} /> Book Free Consultation
                  </Link>
                )}
                
                {user && (
                  <>
                    <div className="h-px bg-border/40 my-2"></div>
                    <Link 
                      href={hasAccess ? "/dashboard" : "/paywall"}
                      className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Dashboard
                      {!hasAccess && <Lock className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" strokeWidth={2} />}
                    </Link>
                    <Link 
                      href={hasAccess ? "/dashboard/messages" : "/paywall"}
                      className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors relative"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <MessageSquare className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Messages
                      {!hasAccess ? (
                        <Lock className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" strokeWidth={2} />
                      ) : unreadCount > 0 ? (
                        <BadgeIndicator count={unreadCount} size="sm" className="ml-2" />
                      ) : null}
                    </Link>
                    <Link 
                      href="/dashboard/settings"
                      className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Settings
                    </Link>
                  </>
                )}
                
                {user && !hasAccess && !isTutor && (
                  <Link 
                    href="/paywall"
                    className="flex items-center gap-3 p-2.5 bg-[#3e5461]/10 text-[#128ca0] hover:bg-[#3e5461]/20 rounded-md mt-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Lock className="h-5 w-5" strokeWidth={1.5} /> Upgrade to Premium
                  </Link>
                )}
                
                {showLoginButton && (
                  <Button 
                    asChild
                    className="mt-4 bg-[#128ca0] hover:bg-[#126d94] shadow-sm font-medium"
                  >
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                      <User className="h-4 w-4" strokeWidth={2} />
                      Login
                    </Link>
                  </Button>
                )}
                
                {user && (
                  <LogoutButton
                    className="mt-4 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onLogout={() => setIsMobileMenuOpen(false)}
                  />
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
