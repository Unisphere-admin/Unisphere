"use client";

import Link from "next/link";
import { BookOpen, Mail, MapPin, Phone, ChevronRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="bg-primary/10 p-1.5 rounded-md group-hover:bg-primary/15 transition-colors">
                <BookOpen className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <span className="text-xl font-bold tracking-tight">TutorMatch</span>
            </Link>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              Connecting students with expert tutors for personalized learning experiences. Find the perfect match for your educational journey.
            </p>
            <div className="mt-5 flex space-x-3">
              <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shadow-sm border-border/40 hover:bg-primary/10 hover:text-primary hover:border-primary/20">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </Button>
              <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shadow-sm border-border/40 hover:bg-primary/10 hover:text-primary hover:border-primary/20">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Button>
              <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shadow-sm border-border/40 hover:bg-primary/10 hover:text-primary hover:border-primary/20">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-1.5">
              <span className="w-1 h-5 bg-primary/50 rounded-full"></span>
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Home</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">About Us</span>
                </Link>
              </li>
              <li>
                <Link href="/tutors" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Find Tutors</span>
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Become a Tutor</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">FAQs</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-1.5">
              <span className="w-1 h-5 bg-primary/50 rounded-full"></span>
              Subjects
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Mathematics</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Science</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Languages</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Humanities</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 group">
                  <ChevronRight className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                  <span className="transition-colors">Computer Science</span>
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
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 bg-primary/10 p-1.5 rounded-full">
                  <MapPin className="h-4 w-4 text-primary" strokeWidth={2} />
                </div>
                <span className="text-sm text-muted-foreground">
                  123 Education Street<br />Learning City, 54321
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-1.5 rounded-full">
                  <Phone className="h-4 w-4 text-primary" strokeWidth={2} />
                </div>
                <span className="text-sm text-muted-foreground">(555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-1.5 rounded-full">
                  <Mail className="h-4 w-4 text-primary" strokeWidth={2} />
                </div>
                <span className="text-sm text-muted-foreground">info@tutormatch.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border/40">
        <div className="container py-6 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-muted-foreground/80">
            © {new Date().getFullYear()} TutorMatch. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
      
      <div className="py-3 text-center text-xs text-muted-foreground/70 border-t border-border/40 bg-background/40 backdrop-blur-sm">
        Made with <Heart className="h-3 w-3 inline-block text-red-500 mx-0.5" fill="currentColor" /> by TutorMatch Team
      </div>
    </footer>
  );
};

export default Footer;
