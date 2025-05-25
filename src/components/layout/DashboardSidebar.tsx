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
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { BadgeIndicator } from "@/components/ui/badge-indicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <div className="space-y-4 py-4 h-full flex flex-col">
      {/* Logo with home link */}
      <div className="px-4 py-2 mb-6">
        <Link href="/" className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">TutorMatch</span>
        </Link>
      </div>
      
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            {isStudent ? "Student Dashboard" : "Tutor Dashboard"}
          </h2>
        </div>
        
        <div className="mt-4 rounded-md border p-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar_url || "/placeholder.svg"} alt={user?.name || 'User'} />
              <AvatarFallback>
                {user?.name && user.name.includes(' ') ? 
                  `${user.name.split(' ')[0][0]}${user.name.split(' ')[1][0]}` : 
                  user?.name ? user.name.charAt(0) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-none truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <Wallet className="h-3.5 w-3.5" />
                <span>{user?.tokens || 0} tokens</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-3 flex-1">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative",
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              {item.icon}
              {item.title}
              {item.badge !== undefined && (
                <BadgeIndicator 
                  count={item.badge} 
                  size="sm" 
                  className={cn(
                    "ml-auto",
                    item.active ? "bg-white text-sidebar-accent" : "bg-red-600"
                  )}
                />
              )}
            </Link>
          ))}
        </div>
      </div>
      
      {/* Home and Logout links at the bottom */}
      <div className="px-3 mt-auto pt-6 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <HomeIcon className="h-5 w-5" />
          Back to Home
        </Link>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start px-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
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
      <aside className="hidden md:block w-64 h-screen sticky top-0 border-r bg-sidebar overflow-y-auto">
        <SidebarContent />
      </aside>
      
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-2 left-2 z-50">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[270px] p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default DashboardSidebar;
