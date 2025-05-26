"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  Settings, 
  HomeIcon,
  Menu,
  X,
  CalendarCheck,
  LogOut,
  Wallet,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { BadgeIndicator } from "@/components/ui/badge-indicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getInitials, getAvatarUrl } from "@/utils/nameUtils";

const DashboardSidebar = () => {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const unreadCount = useUnreadCount();
  
  const isStudent = user?.role === "student";
  
  const navItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      title: "Messages",
      icon: <MessageSquare className="h-5 w-5" />,
      href: "/dashboard/messages",
      active: pathname === "/dashboard/messages",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      title: "Upcoming Sessions",
      icon: <Calendar className="h-5 w-5" />,
      href: "/dashboard/schedule",
      active: pathname === "/dashboard/schedule",
    },
    {
      title: "Session History",
      icon: <CalendarCheck className="h-5 w-5" />,
      href: "/dashboard/history",
      active: pathname === "/dashboard/history",
    },
    {
      title: isStudent ? "Find Tutors" : "Subjects",
      icon: <BookOpen className="h-5 w-5" />,
      href: isStudent ? "/tutors" : "/dashboard/subjects",
      active: pathname === (isStudent ? "/tutors" : "/dashboard/subjects"),
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/dashboard/settings",
      active: pathname === "/dashboard/settings",
    }
  ];

  // Desktop sidebar
  const SidebarContent = () => (
    <div className="h-full flex flex-col py-6">
      {/* Logo with home link */}
      <div className="px-6 mb-6">
        <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
          <BookOpen className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <span className="text-xl font-bold tracking-tight">TutorMatch</span>
        </Link>
      </div>
      
      <div className="px-4 py-2">
        <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden">
          <div className="p-4 flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-border/40 shadow-sm">
              <AvatarImage src={user?.avatar_url || undefined} alt={user?.name || 'User'} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-medium">
                {getInitials(user) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-none truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
            </div>
          </div>
          
          <Separator className="opacity-40" />
          
          <div className="flex justify-between items-center p-2 px-4 bg-muted/40">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span>{user?.tokens || 0} tokens</span>
            </div>
            
            <Badge variant="outline" className="text-xs bg-background/70 backdrop-blur-sm font-normal">
              {isStudent ? "Student" : "Tutor"}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="mt-8 px-3 flex-1">
        <div className="space-y-1.5">
          {navItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all relative group",
                item.active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted"
              )}
            >
              <span className={cn(
                "text-primary/80",
                item.active && "text-primary-foreground"
              )}>
                {item.icon}
              </span>
              
              {item.title}
              
              {item.badge !== undefined && (
                <BadgeIndicator 
                  count={item.badge} 
                  size="sm" 
                  className={cn(
                    "ml-auto",
                    item.active ? "bg-primary-foreground text-primary" : "bg-red-600"
                  )}
                />
              )}
              
              <ChevronRight className={cn(
                "h-4 w-4 ml-auto opacity-0 transition-opacity",
                item.active ? "opacity-100 text-primary-foreground" : "group-hover:opacity-50"
              )} />
            </Link>
          ))}
        </div>
      </div>
      
      {/* Home and Logout links at the bottom */}
      <div className="px-3 mt-auto pt-6 space-y-2 border-t border-border/40 mx-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all text-foreground/70 hover:text-foreground hover:bg-muted"
        >
          <HomeIcon className="h-5 w-5 text-primary/80" />
          Back to Home
        </Link>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start px-3 py-2.5 text-sm font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-72 h-screen sticky top-0 border-r border-border/40 bg-card/80 backdrop-blur-sm overflow-y-auto">
        <SidebarContent />
      </aside>
      
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full shadow-md border-border/40 bg-background/80 backdrop-blur-sm">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-card/80 backdrop-blur-sm">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default DashboardSidebar;
