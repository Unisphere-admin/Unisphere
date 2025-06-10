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

export default function HomePage() {
  return (
    <div className="flex flex-col w-full with-navbar">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-[#c2dac2]/30 via-background/95 to-[#c2d8d2]/20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 right-[20%] w-72 h-72 bg-[#84bc9c]/10 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-[#84b7bd]/10 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
        </div>
        <div className="container relative z-10 mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <Badge variant="outline" className="px-3 py-1 mb-2 text-sm bg-background/80 backdrop-blur-sm border-[#4ba896]/20">
                <span className="text-[#129490] font-medium">New</span> - Global knowledge exchange now available
              </Badge>
              <h1 className="font-bold tracking-tight text-4xl md:text-5xl lg:text-6xl">
              Your all-in-one UK & US preparation platform
              </h1>
              <p className="text-xl text-muted-foreground md:text-2xl max-w-[600px]">
                Build your sphere of mentors to help with Personal Statements/Essays/Entrance Tests/Interviews
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button size="lg" className="shadow-md bg-[#129490] hover:bg-[#126d94] transition-all hover:shadow-lg hover:translate-y-[-2px] group">
                  <Link href="/tutors" className="flex items-center gap-2">
                    Explore Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-[#c2d8d2]/60 hover:border-[#84bc9c]/60 hover:bg-[#c2dac2]/10 transition-all">
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex -space-x-3">
                  <Avatar className="border-2 border-background h-9 w-9 ring-2 ring-background">
                    <AvatarImage src="https://randomuser.me/api/portraits/women/32.jpg" alt="User" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <Avatar className="border-2 border-background h-9 w-9 ring-2 ring-background">
                    <AvatarImage src="https://randomuser.me/api/portraits/men/42.jpg" alt="User" />
                    <AvatarFallback>MR</AvatarFallback>
                  </Avatar>
                  <Avatar className="border-2 border-background h-9 w-9 ring-2 ring-background">
                    <AvatarImage src="https://randomuser.me/api/portraits/women/22.jpg" alt="User" />
                    <AvatarFallback>KL</AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">1,000+</span> students already learning
                </p>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-[#84bc9c]/20 via-[#c2d8d2]/20 to-[#84b7bd]/20 rounded-2xl blur-xl transform -translate-y-4 translate-x-4 animate-pulse" style={{animationDuration: '10s'}}></div>
                <div className="relative z-10 bg-card/95 border border-border/40 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:translate-y-[-3px] group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#c2dac2]/10 via-transparent to-[#c2d8d2]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <img
                    src="https://images.unsplash.com/photo-1546521343-4eb2c01aa44b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1035&q=80"
                    alt="Online Learning"
                    className="w-full rounded-t-xl object-cover h-64 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className="px-3 py-1 bg-[#4ba896]/10 text-[#129490] hover:bg-[#4ba896]/20 transition-colors border-[#4ba896]/20">
                          Featured
                        </Badge>
                        <Badge className="px-3 py-1 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 transition-colors border-[#4b92a9]/20">
                          Popular
                        </Badge>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold">Mathematics & Sciences</h3>
                    <p className="text-sm text-muted-foreground">Master complex concepts with our interactive learning platform</p>
                    <Separator className="bg-[#c2d8d2]/50" />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#4ba896]" />
                        <span>Flexible scheduling</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-[#4ba896]" />
                        <span>Personalized support</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-5 -right-10 bg-card/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-border/40 animate-in slide-in-from-right-5 duration-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#129490]" />
                    <span className="text-sm font-medium">Interactive Learning</span>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-8 bg-card/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-border/40 animate-in slide-in-from-left-5 duration-500">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#129490]" />
                    <span className="text-sm font-medium">Top-Rated Platform</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Section with Connected Circles - Enhanced Roadmap Style */}
      <section className="py-20 md:py-32 w-full bg-card/80 backdrop-blur-sm border-y border-[#c2d8d2]/30">
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="mb-4 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 border-none">How It Works</Badge>
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
                  <div className="h-28 w-28 bg-[#e3f0e6] rounded-full flex items-center justify-center mb-6">
                    <PanelsTopLeft className="h-12 w-12 text-[#129490]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-8 w-8 text-white text-xs font-bold bg-[#129490]">
                    1
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Join Our Platform</h3>
                <p className="text-muted-foreground">
                  For as low as a RM2,000 one-time fee, gain full access to our exclusive platform, where you can connect with the best tutors for the cheapest rates on the market.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-28 w-28 bg-[#e3f0e6] rounded-full flex items-center justify-center mb-6">
                    <School className="h-12 w-12 text-[#129490]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-8 w-8 text-white text-xs font-bold bg-[#129490]">
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
                  <div className="h-28 w-28 bg-[#e3f0e6] rounded-full flex items-center justify-center mb-6">
                    <FileEdit className="h-12 w-12 text-[#129490]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-8 w-8 text-white text-xs font-bold bg-[#129490]">
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
                  <div className="h-28 w-28 bg-[#e3f0e6] rounded-full flex items-center justify-center mb-6">
                    <Award className="h-12 w-12 text-[#129490]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-8 w-8 text-white text-xs font-bold bg-[#129490]">
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
            <div className="hidden md:block absolute top-[4.1rem] left-[12%] right-[12%] h-[1px] bg-[#84bc9c] z-0"></div>
            
            {/* Add connection dots at the edges of each circle */}
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(25%-4em)] w-[4px] h-[4px] rounded-full bg-[#84bc9c] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(25%+4em)] w-[4px] h-[4px] rounded-full bg-[#84bc9c] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(50%-4em)] w-[4px] h-[4px] rounded-full bg-[#84bc9c] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(50%+4em)] w-[4px] h-[4px] rounded-full bg-[#84bc9c] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(75%-4em)] w-[4px] h-[4px] rounded-full bg-[#84bc9c] transform translate-y-[-1.5px] z-0"></div>
            <div className="hidden md:block absolute top-[4.1rem] left-[calc(75%+4em)] w-[4px] h-[4px] rounded-full bg-[#84bc9c] transform translate-y-[-1.5px] z-0"></div>
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" className="bg-[#129490] hover:bg-[#126d94] shadow-md hover:shadow-lg transition-all hover:translate-y-[-2px] group">
              <Link href="/tutors" className="flex items-center gap-2">
                Start Your Journey <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-32 w-full bg-gradient-to-b from-[#c2dac2]/10 via-background/95 to-[#c2d8d2]/20 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-40 right-[30%] w-72 h-72 bg-[#84bc9c]/10 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '10s'}}></div>
          <div className="absolute bottom-20 left-[20%] w-80 h-80 bg-[#84b7bd]/10 rounded-full blur-3xl opacity-50 animate-pulse" style={{animationDuration: '15s'}}></div>
        </div>
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="mb-4 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 border-none">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What our students say
            </h2>
            <p className="text-lg text-muted-foreground">
            Hear from students who've reached their goals with the help of UniSphere tutors.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
            <Card className="bg-card/50 backdrop-blur-sm border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardHeader className="pb-2">
                <div className="flex text-[#4ba896] mb-1">
                  
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-foreground/90 leading-relaxed">
                  "This platform helped me raise my calculus grade from a C to an A. 
                  The personalized approach made all the difference."
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-[#4ba896]/20">
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
                <div className="flex text-[#4ba896] mb-1">
                  
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-foreground/90 leading-relaxed">
                  "I needed help with my Spanish course, and this platform was amazing. 
                  I can now confidently hold conversations in Spanish!"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-[#4ba896]/20">
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
                <div className="flex text-[#4ba896] mb-1">
                 
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-foreground/90 leading-relaxed">
                  "The flexible scheduling options made it possible for me to fit learning
                  around my busy work schedule. Highly recommend!"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-[#4ba896]/20">
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
            <Button size="lg" className="bg-[#4ba896]/10 text-[#129490] hover:bg-[#4ba896]/20 hover:shadow-md transition-all border-[#c2d8d2]/40 hover:translate-y-[-2px] group">
              <Link href="/tutors" className="flex items-center gap-2">
                Begin Your Global Journey <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 