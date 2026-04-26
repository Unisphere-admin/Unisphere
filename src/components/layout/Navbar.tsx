"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { Menu, X, User, LogOut, MessageSquare, Home, Globe, Users, LayoutDashboard, Lock, Bell, Settings, ChevronDown, CalendarPlus, GraduationCap, FileText, CreditCard, UserCircle, ListTodo, Calendar } from "lucide-react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Don't show login button while loading to prevent flashing UI
  const showLoginButton = !loading && !user;

  // Check if user has premium access
  const hasAccess = user?.role === 'tutor' || user?.has_access;
  const isTutor = user?.role === 'tutor';

  // Show consultation button only for non-logged in users or non-premium students
  const showConsultationButton = !loading && (!user || (!hasAccess && !isTutor));
  const showTopUpButton = !loading && user && !isTutor;

  // Defer pathname-dependent classes to after mount to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isDarkNav = false; // was pathname === "/credits" when credits had dark Vanta background
  const isTransparentNav = mounted && (pathname === "/about" || pathname === "/testimonials");
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 w-full h-[var(--navbar-height)] ${
      isTransparentNav
        ? "bg-transparent border-transparent"
        : isDarkNav
          ? "bg-black/70 border-white/10 border-b shadow-sm backdrop-blur-sm"
          : "bg-background/95 border-border/40 border-b shadow-sm backdrop-blur-sm"
    }`}>
      <div className="w-full h-full px-4 md:px-8 flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center space-x-2 group">
            <Image src="/logo-name.png" alt="Unisphere" height={32} width={200} priority className={`h-8 w-auto max-w-[150px] md:max-w-[200px] ${isDarkNav || isTransparentNav ? "brightness-0 invert" : ""}`} />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm ml-6">
            {[
              { href: "/", label: "Home" },
            ].map(({ href, label }) => {
              const isActive = mounted && pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`font-medium transition-colors duration-200 nav-link-hover ${
                    isDarkNav || isTransparentNav
                      ? isActive ? "text-white" : "text-white/70 hover:text-white"
                      : isActive ? "nav-link-active text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            {/* About Us with hover dropdown. Uses group-hover so a CSS-only
                menu appears; the pt-2 "bridge" keeps the dropdown open while
                the cursor moves from the link down into the menu. */}
            {(() => {
              const isActive = mounted && (pathname === "/about" || pathname === "/testimonials");
              return (
                <div className="relative group">
                  <Link
                    href="/about"
                    aria-current={isActive ? "page" : undefined}
                    className={`font-medium transition-colors duration-200 nav-link-hover inline-flex items-center gap-1 ${
                      isDarkNav || isTransparentNav
                        ? isActive ? "text-white" : "text-white/70 hover:text-white"
                        : isActive ? "nav-link-active text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    About Us
                    <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-hover:rotate-180" strokeWidth={2} />
                  </Link>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 invisible opacity-0 translate-y-[-4px] group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
                    <div className="min-w-[180px] rounded-xl bg-white shadow-[0_10px_40px_-10px_rgba(18,140,160,0.25)] border border-slate-100 py-2 overflow-hidden">
                      <Link
                        href="/about"
                        className="block px-5 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-slate-50 transition-colors"
                      >
                        About Us
                      </Link>
                      <Link
                        href="/testimonials"
                        className="block px-5 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-slate-50 transition-colors"
                      >
                        Testimonials
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}

            {[
              { href: "/tutors", label: "Browse Tutors" },
            ].map(({ href, label }) => {
              const isActive = mounted && pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`font-medium transition-colors duration-200 nav-link-hover ${
                    isDarkNav || isTransparentNav
                      ? isActive ? "text-white" : "text-white/70 hover:text-white"
                      : isActive ? "nav-link-active text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/summer-studio"
              aria-current={mounted && pathname === "/summer-studio" ? "page" : undefined}
              className={`font-medium transition-colors duration-200 relative nav-link-hover ${
                isDarkNav || isTransparentNav
                  ? mounted && pathname === "/summer-studio" ? "text-white" : "text-white/70 hover:text-white"
                  : mounted && pathname === "/summer-studio" ? "nav-link-active text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Summer Studio
              <span className="absolute -top-1.5 -right-5 px-1 py-px text-[7px] font-bold uppercase tracking-wide rounded bg-[#128ca0] text-white leading-none">New</span>
            </Link>

          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:flex items-center gap-3 mr-1">
              <Button variant="ghost" size="sm" asChild className={`hover:bg-muted ${isDarkNav || isTransparentNav ? "text-white/70 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground"}`}>
                <Link href="/dashboard" className="flex items-center gap-1.5 font-medium">
                  <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className={`relative ${isDarkNav || isTransparentNav ? "text-white/70 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Link href={hasAccess ? "/dashboard/messages" : "/credits"} className="flex items-center gap-1.5 font-medium">
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

              <Button variant="ghost" size="sm" asChild className={`${isDarkNav || isTransparentNav ? "text-white/70 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Link href="/resources" className="flex items-center gap-1.5 font-medium">
                  <FileText className="h-4 w-4" strokeWidth={2} />
                  Resources
                </Link>
              </Button>
            </div>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={`rounded-full h-9 pl-2 pr-2.5 gap-1 text-sm group ${isDarkNav || isTransparentNav ? "hover:bg-white/10" : ""}`}>
                  <Avatar className={`h-7 w-7 border transition-all duration-200 group-hover:ring-2 group-hover:ring-[#128ca0]/30 ${isDarkNav || isTransparentNav ? "border-white/30" : "border-border/40"}`}>
                    <AvatarImage src={user.avatar_url || user.profilePic || undefined} alt={user.name || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-[#84b4cc]/80 to-[#3e5461]/50 text-white font-medium text-xs">
                      {getInitials(user) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`font-medium ml-1 hidden sm:inline-block max-w-[100px] truncate ${isDarkNav || isTransparentNav ? "text-white/90" : ""}`}>
                    {user.name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180 ${isDarkNav || isTransparentNav ? "text-white/50" : "opacity-50"}`} strokeWidth={2} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 shadow-md border-border/40">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <p className="font-medium">{user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem className="focus:bg-muted">
                  <Link href="/dashboard/profile" className="flex items-center w-full">
                    <UserCircle className="mr-2 h-4 w-4 text-[#3e5461]" strokeWidth={2} />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted">
                  <Link href="/dashboard" className="flex items-center w-full">
                    <LayoutDashboard className="mr-2 h-4 w-4 text-[#3e5461]" strokeWidth={2} />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted">
                  <Link href={hasAccess ? "/dashboard/messages" : "/credits"} className="flex items-center w-full">
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
                  <Link href="/dashboard/timeline" className="flex items-center w-full">
                    <ListTodo className="mr-2 h-4 w-4 text-[#3e5461]" strokeWidth={2} />
                    Timeline
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted">
                  <Link href="/dashboard/schedule" className="flex items-center w-full">
                    <Calendar className="mr-2 h-4 w-4 text-[#3e5461]" strokeWidth={2} />
                    Sessions
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem className="focus:bg-muted">
                  <Link href="/resources" className="flex items-center w-full">
                    <FileText className="mr-2 h-4 w-4 text-[#3e5461]" strokeWidth={2} />
                    Resources
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem className="focus:bg-muted">
                  <Link href="/dashboard/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4 text-[#3e5461]" strokeWidth={2} />
                    Settings
                  </Link>
                </DropdownMenuItem>
                
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

          {showTopUpButton && (
            <>
          <Button variant="outline" size="sm" asChild className={`hidden md:flex items-center gap-1.5 shadow-sm ${isDarkNav || isTransparentNav ? "bg-transparent border-white/30 text-white/80 hover:bg-white/10 hover:text-white" : "border-primary/30 text-primary hover:bg-primary/5"}`}>
            <Link href="/credits">
              <CreditCard className="h-4 w-4 mr-1" strokeWidth={2} />
              Top Up
            </Link>
          </Button>
          </>
          )}

          {/* Only show consultation button for non-logged in users or non-premium students
          {showConsultationButton && (
            <Button variant="outline" size="sm" asChild className="hidden md:flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shadow-sm">
              <Link href="/consultation">
                <CalendarPlus className="h-4 w-4 mr-1" strokeWidth={2} />
                Book A Free Consultation
              </Link>
            </Button>
          )} */}
          
          {/* Mobile menu button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden h-9 w-9 shadow-sm border-border/40 touch-manipulation">
                <Menu className="h-5 w-5" strokeWidth={1.5} />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80%] sm:w-[350px] border-l border-border/40 pr-0">
              <nav className="flex flex-col gap-4 text-base pr-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Image src="/logo-name.png" alt="Unisphere" height={32} width={200} className="h-8 w-auto" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="h-9 w-9 touch-manipulation"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </div>
                
                <Link 
                  href="/" 
                  className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Home
                </Link>
                <Link
                  href="/about"
                  className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Globe className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> About Us
                </Link>
                <Link
                  href="/testimonials"
                  className="flex items-center gap-3 p-3 pl-11 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation text-[0.925rem]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <GraduationCap className="h-4 w-4 text-[#3e5461]" strokeWidth={1.5} /> Testimonials
                </Link>
                <Link
                  href="/tutors"
                  className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Users className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Browse Tutors
                </Link>
                <Link
                  href="/summer-studio"
                  className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation relative"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <GraduationCap className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Summer Studio
                  <span className="ml-1 px-1 py-px text-[7px] font-bold uppercase tracking-wide rounded bg-[#128ca0] text-white leading-none">New</span>
                </Link>
                {/* Only show consultation button for non-logged in users or non-premium students in mobile menu */}
                {showConsultationButton && (
                  <Link 
                    href="/consultation"
                    className="flex items-center gap-3 p-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-md touch-manipulation"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <CalendarPlus className="h-5 w-5" strokeWidth={1.5} /> Book Free Consultation
                  </Link>
                )}
                
                {user && (
                  <>
                    <div className="h-px bg-border/40 my-2"></div>
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <UserCircle className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Profile
                    </Link>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Dashboard
                    </Link>
                    <Link
                      href={hasAccess ? "/dashboard/messages" : "/credits"}
                      className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors relative touch-manipulation"
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
                      href="/dashboard/timeline"
                      className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <ListTodo className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Timeline
                    </Link>
                    <Link
                      href="/dashboard/schedule"
                      className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Calendar className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Sessions
                    </Link>

                    <Link
                      href="/resources"
                      className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <FileText className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Resources
                    </Link>

                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-3 p-3 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5 text-[#3e5461]" strokeWidth={1.5} /> Settings
                    </Link>
                  </>
                )}
                
                {user && !hasAccess && !isTutor && (
                  <Link 
                    href="/credits"
                    className="flex items-center gap-3 p-3 bg-[#3e5461]/10 text-[#128ca0] hover:bg-[#3e5461]/20 rounded-md mt-2 touch-manipulation"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Lock className="h-5 w-5" strokeWidth={1.5} /> Upgrade to Premium
                  </Link>
                )}
                
                {showLoginButton && (
                  <Button 
                    asChild
                    className="mt-4 bg-[#128ca0] hover:bg-[#126d94] shadow-sm font-medium touch-manipulation"
                  >
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                      <User className="h-4 w-4" strokeWidth={2} />
                      Login
                    </Link>
                  </Button>
                )}
                
                {user && (
                  <LogoutButton
                    className="mt-4 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive touch-manipulation"
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
