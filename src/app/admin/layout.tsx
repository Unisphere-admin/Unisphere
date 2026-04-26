"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  Video,
  Star,
  Mail,
  Loader2,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Trophy,
  FolderOpen,
} from "lucide-react";

// Note: this layout is a client component, so it cannot export `metadata`.
// /admin is already disallowed in src/app/robots.ts, which is the more
// effective signal — crawlers respect robots.txt before fetching the page.

const ADMIN_EMAILS = ["joshuaooi105@gmail.com", "ghayuan.ng@gmail.com", "jjzlee018@gmail.com"];

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/credits", label: "Credits", icon: CreditCard },
  { href: "/admin/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/admin/sessions", label: "Sessions", icon: Video },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/deadlines", label: "Deadlines", icon: CalendarDays },
  { href: "/admin/opportunities", label: "Opportunities", icon: Trophy },
  { href: "/admin/resources", label: "Resources", icon: FolderOpen },
  { href: "/admin/emails", label: "Emails", icon: Mail },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !ADMIN_EMAILS.includes(user.email || ""))) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-gray-500">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          {!collapsed && (
            <span className="text-sm font-semibold text-gray-800 tracking-tight">
              Unisphere Admin
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1 rounded hover:bg-gray-100 text-gray-400 ${
              collapsed ? "mx-auto" : "ml-auto"
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    isActive ? "text-gray-900" : "text-gray-400"
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {!collapsed && "Back to site"}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-200 ${
          collapsed ? "ml-16" : "ml-56"
        }`}
      >
        <div className="p-6 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
