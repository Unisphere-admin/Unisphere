"use client";

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
  Users, 
  Clock,
  Wallet
} from "lucide-react";

const DashboardSidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  
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
    },
    {
      title: "Schedule",
      icon: <Calendar className="h-5 w-5" />,
      href: "/dashboard/schedule",
      active: pathname === "/dashboard/schedule",
    },
    {
      title: isStudent ? "My Tutors" : "My Students",
      icon: <Users className="h-5 w-5" />,
      href: "/dashboard/connections",
      active: pathname === "/dashboard/connections",
    },
    {
      title: "Sessions History",
      icon: <Clock className="h-5 w-5" />,
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
      title: "Tokens",
      icon: <Wallet className="h-5 w-5" />,
      href: "/dashboard/tokens",
      active: pathname === "/dashboard/tokens",
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/dashboard/settings",
      active: pathname === "/dashboard/settings",
    }
  ];

  return (
    <aside className="hidden sm:block w-64 h-[calc(100vh-4rem)] sticky top-16 border-r bg-sidebar overflow-y-auto">
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {isStudent ? "Student Dashboard" : "Tutor Dashboard"}
            </h2>
          </div>
          
          <div className="mt-4 flex items-center gap-2 rounded-md border p-2">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {user?.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 mt-1">
                    <Wallet className="h-3 w-3" />
                    {user?.tokens} tokens
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
