"use client";

import Link from "next/link";
import { BookOpen, Mail, MapPin, Phone, ChevronRight, Heart, Globe, Linkedin, Instagram, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const Footer = () => {
  return (
    <footer className="relative bg-gradient-to-b from-muted/50 to-muted border-t border-border/40">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-40 -left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl opacity-50"></div>
      </div>
      
      <div className="container relative z-10 py-12 md:py-16 px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div>
            <Link href="/" className="flex items-center gap-2 transition hover:opacity-80 mb-6">
              <img src="/logo-name.png" alt="Unisphere" className="h-8 w-auto" />
            </Link>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
            Your all-in-one UK & US University preparation platform
            </p>
            <div className="mt-5 flex space-x-3">
              <a href="https://www.instagram.com/unisphere.my/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shadow-sm border-border/40 hover:bg-[#E1306C]/10 hover:text-[#E1306C] hover:border-[#E1306C]/20">
                  <Instagram className="h-4 w-4" />
                </Button>
              </a>
              <a href="https://www.linkedin.com/company/unispheremy" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shadow-sm border-border/40 hover:bg-[#0077B5]/10 hover:text-[#0077B5] hover:border-[#0077B5]/20">
                  <Linkedin className="h-4 w-4" />
                </Button>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shadow-sm border-border/40 hover:bg-[#FF0000]/10 hover:text-[#FF0000] hover:border-[#FF0000]/20">
                  <Youtube className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-1.5">
              <span className="w-1 h-5 bg-primary/50 rounded-full"></span>
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">About Us</span>
                </Link>
              </li>
              <li>
                <Link href="/tutors" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Browse Tutors</span>
                </Link>
              </li>
              <li>
                <Link href="/become-a-tutor" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Become a Tutor</span>
                </Link>
              </li>
              
            </ul>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-1.5">
              <span className="w-1 h-5 bg-primary/50 rounded-full"></span>
              Services
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">UK University Admissions</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">US University Admissions</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">SAT/ACT</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Extracurricular Building</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">UK Admissions Tests</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Subject Tutoring</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-1.5">
              <span className="w-1 h-5 bg-primary/50 rounded-full"></span>
              Contact Us
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-1.5 rounded-full">
                  <Phone className="h-4 w-4 text-primary" strokeWidth={2} />
                </div>
                <span className="text-sm text-muted-foreground">+60 14-360 8123</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-1.5 rounded-full">
                  <Mail className="h-4 w-4 text-primary" strokeWidth={2} />
                </div>
                <span className="text-sm text-muted-foreground">admin@unisphere.my</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border/40">
        <div className="container py-6 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-muted-foreground/80">
            © {new Date().getFullYear()} Unisphere. All rights reserved.
          </p>
    
        </div>
      </div>
      
      <div className="py-3 text-center text-xs text-muted-foreground/70 border-t border-border/40 bg-background/40 backdrop-blur-sm">
        Made with <Heart className="h-3 w-3 inline-block text-red-500 mx-0.5" fill="currentColor" /> by Unisphere Team
      </div>
    </footer>
  );
};

export default Footer;
