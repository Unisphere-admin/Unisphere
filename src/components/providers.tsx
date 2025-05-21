"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
} 