"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Sparkles, 
  GraduationCap,
  Users,
  Calendar,
  MessageCircle,
  ArrowRight,
  Star,
  PanelsTopLeft,
  School,
  FileEdit,
  Award
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [textFading, setTextFading] = useState(false);
  const animatedTexts = ["Personal Statements", "Essays", "Entrance Tests", "Interviews"];
  
  useEffect(() => {
    // Create a fade-in, fade-out cycle
    const fadeOutTimer = setInterval(() => {
      // Start fade out
      setTextFading(true);
      
      // After fade out completes, change text and fade in
      setTimeout(() => {
        setCurrentTextIndex(prevIndex => (prevIndex + 1) % animatedTexts.length);
        setTextFading(false);
      }, 700); // Match the fadeOut animation duration
      
    }, 3000); // Total time for each text to be displayed
    
    return () => {
      clearInterval(fadeOutTimer);
    };
  }, []);

  return (
    <div className="flex flex-col w-full with-navbar">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-[#c7e4e3]/30 via-background/95 to-[#c2d8d2]/20">
        
        <div className="container relative z-10 mx-auto px-4 md:px-6 max-w-screen-xl h-full">
          <div className="flex flex-col md:flex-row gap-12 items-center h-full">
            <div className="flex-1 space-y-6">
              
              <h1 className="font-bold tracking-tight text-4xl md:text-5xl lg:text-6xl">
              Your all-in-one UK & US preparation platform
              </h1>
              <p className="text-xl text-muted-foreground md:text-2xl max-w-[600px]">
                Build your sphere of mentors to help with 
                <br />
                <span 
                  className={`inline-block ${textFading ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                >
                  {" " + animatedTexts[currentTextIndex]}
                </span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button size="lg" className="shadow-md bg-[#128ca0] hover:bg-[#126d94] transition-all hover:shadow-lg hover:translate-y-[-2px] group">
                  <Link href="/tutors" className="flex items-center gap-2">
                    Explore Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-[#c2d8d2]/60 hover:border-[#84b4cc]/60 hover:bg-[#c7e4e3]/10 transition-all">
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
              
            </div>
            <div className="flex-1 relative ">
              <div className="relative w-full justify-center items-center mx-auto" style={{maxWidth: '40rem'}}>
                
                  <img
                    src="/uniandlogo.png"
                    alt="Online Learning"
                    className="w-full rounded-t-xl object-cover group-hover:scale-105 transition-transform duration-700"
                    style={{height: '31rem'}}
                  />
        
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Section with Connected Circles - Enhanced Roadmap Style */}
      <section className="py-20 md:py-32 w-full bg-card/80 backdrop-blur-sm border-y border-[#c2d8d2]/30">
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="mb-4 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 border-none">How We Work</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Path to Success</h2>
            <p className="text-lg text-muted-foreground">
              Follow our proven roadmap to maximize your university admission chances
            </p>
          </div>

          {/* Enhanced Roadmap with Connected Circles */}
          <div className="relative mt-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8 mt-12 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-28 w-28 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-6">
                    <PanelsTopLeft className="h-12 w-12 text-[#128ca0]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-8 w-8 text-white text-xs font-bold bg-[#128ca0]">
                    1
                </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Join Our Platform</h3>
                <p className="text-muted-foreground">
                For a one-time fee, gain full access to our exclusive platform, where you can connect with the best tutors for the cheapest rates on the market.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-28 w-28 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-6">
                    <School className="h-12 w-12 text-[#128ca0]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-8 w-8 text-white text-xs font-bold bg-[#128ca0]">
                    2
                </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Connect with Tutors</h3>
                <p className="text-muted-foreground">
                  Create your own sphere of mentors from your dream universities and courses. Whether you need help with entrance tests or interviews, you'll find a tutor who can do it.
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-28 w-28 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-6">
                    <FileEdit className="h-12 w-12 text-[#128ca0]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-8 w-8 text-white text-xs font-bold bg-[#128ca0]">
                    3
                </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Personalised Guidance</h3>
                <p className="text-muted-foreground">
                  Learn directly from current students who've recently succeeded in the exact process you're about to go through. Get insider tips and tailored advice every step of the way.
                </p>
              </div>
              
              {/* Step 4 */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-28 w-28 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-6">
                    <Award className="h-12 w-12 text-[#128ca0]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-8 w-8 text-white text-xs font-bold bg-[#128ca0]">
                    4
                </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Maximise Admission Chances</h3>
                <p className="text-muted-foreground">
                  With relevant, affordable, and flexible support from students who've been in your shoes, you'll undeniably craft a stronger application and give yourself the best shot at success.
                </p>
              </div>
            </div>
            
            {/* Create one continuous horizontal line through all circles */}
            <div className="hidden md:block absolute top-[4.1rem] left-[12%] right-[12%] h-[1px] bg-[#84b4cc] z-0"></div>
            
            {/* Add connection dots at the edges of each circle */}
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(25%-4em)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(25%+4em)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(50%-4em)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(50%+4em)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(75%-4em)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(75%+4em)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] transform translate-y-[-1.5px] z-0"></div>
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" className="bg-[#128ca0] hover:bg-[#126d94] shadow-md hover:shadow-lg transition-all hover:translate-y-[-2px] group">
              <Link href="/tutors" className="flex items-center gap-2">
                Start Your Journey <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/* <section className="py-20 md:py-32 w-full bg-gradient-to-b from-[#c7e4e3]/10 via-background/95 to-[#c2d8d2]/20 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-40 right-[30%] w-72 h-72 bg-[#84b4cc]/10 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '10s'}}></div>
          <div className="absolute bottom-20 left-[20%] w-80 h-80 bg-[#84b7bd]/10 rounded-full blur-3xl opacity-50 animate-pulse" style={{animationDuration: '15s'}}></div>
        </div>
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="mb-4 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 border-none">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Students Say
            </h2>
            <p className="text-lg text-muted-foreground">
            Hear from students who've reached their goals with the help of UniSphere tutors
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
            <Card className="bg-card/50 backdrop-blur-sm border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardHeader className="pb-2">
                <div className="flex text-[#3e5461] mb-1">
                  
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-foreground/90 leading-relaxed">
                  "This platform helped me raise my calculus grade from a C to an A. 
                  The personalized approach made all the difference."
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-[#3e5461]/20">
                    <AvatarImage src="https://randomuser.me/api/portraits/women/32.jpg" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">University</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardHeader className="pb-2">
                <div className="flex text-[#3e5461] mb-1">
                  
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-foreground/90 leading-relaxed">
                  "I needed help with my Spanish course, and this platform was amazing. 
                  I can now confidently hold conversations in Spanish!"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-[#3e5461]/20">
                    <AvatarImage src="https://randomuser.me/api/portraits/men/42.jpg" />
                    <AvatarFallback>AP</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">University</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardHeader className="pb-2">
                <div className="flex text-[#3e5461] mb-1">
                 
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-foreground/90 leading-relaxed">
                  "The flexible scheduling options made it possible for me to fit learning
                  around my busy work schedule. Highly recommend!"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-[#3e5461]/20">
                    <AvatarImage src="https://randomuser.me/api/portraits/women/22.jpg" />
                    <AvatarFallback>MJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">University</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" className="bg-[#3e5461]/10 text-[#128ca0] hover:bg-[#3e5461]/20 hover:shadow-md transition-all border-[#c2d8d2]/40 hover:translate-y-[-2px] group">
              <Link href="/tutors" className="flex items-center gap-2">
                Begin Your Journey <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>
        </div>
      </section> */}
    </div>
  );
} 