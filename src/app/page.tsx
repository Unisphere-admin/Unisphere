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
  Star
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
      <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-background via-background/95 to-muted/20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 right-[20%] w-72 h-72 bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
        </div>
        <div className="container relative z-10 mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <Badge variant="outline" className="px-3 py-1 mb-2 text-sm bg-background/80 backdrop-blur-sm border-primary/20">
                <span className="text-primary font-medium">New</span> - Instant learning now available
              </Badge>
              <h1 className="font-bold tracking-tight text-4xl md:text-5xl lg:text-6xl">
                Quality Education,<br />
                <span className="text-primary">Anytime, Anywhere</span>
              </h1>
              <p className="text-xl text-muted-foreground md:text-2xl max-w-[600px]">
                Connect with personalized learning experiences to achieve your academic goals
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button size="lg" className="shadow-md bg-primary hover:bg-primary/90 transition-all hover:shadow-lg hover:translate-y-[-2px] group">
                  <Link href="/tutors" className="flex items-center gap-2">
                    Start Learning <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all">
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
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 rounded-2xl blur-xl transform -translate-y-4 translate-x-4 animate-pulse" style={{animationDuration: '10s'}}></div>
                <div className="relative z-10 bg-card/95 border border-border/40 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:translate-y-[-3px] group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <img
                    src="https://images.unsplash.com/photo-1546521343-4eb2c01aa44b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1035&q=80"
                    alt="Online Learning"
                    className="w-full rounded-t-xl object-cover h-64 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-primary/20">
                          Featured
                        </Badge>
                        <Badge className="px-3 py-1 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors border-secondary/20">
                          Popular
                        </Badge>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold">Mathematics & Sciences</h3>
                    <p className="text-sm text-muted-foreground">Master complex concepts with our interactive learning platform</p>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Flexible scheduling</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        <span>Personalized support</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-5 -right-10 bg-card/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-border/40 animate-in slide-in-from-right-5 duration-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Interactive Learning</span>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-8 bg-card/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-border/40 animate-in slide-in-from-left-5 duration-500">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Top-Rated Platform</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 w-full bg-card/80 backdrop-blur-sm border-y border-border/20">
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20 border-none">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Steps to Start Learning</h2>
            <p className="text-lg text-muted-foreground">
              Our platform makes it easy to transform your learning journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mt-12">
            <Card className="bg-background/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardContent className="pt-8 px-6">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-sm">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Find Your Path</h3>
                <p className="text-muted-foreground">
                  Browse subjects and learning resources tailored to your academic needs
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardContent className="pt-8 px-6">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-sm">
                  <MessageCircle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Schedule Sessions</h3>
                <p className="text-muted-foreground">
                  Arrange learning sessions at times that fit your schedule and learning goals
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardContent className="pt-8 px-6">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-sm">
                  <GraduationCap className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Learn & Succeed</h3>
                <p className="text-muted-foreground">
                  Engage in personalized learning experiences and track your progress
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-32 w-full bg-gradient-to-b from-background via-background/95 to-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-40 right-[30%] w-72 h-72 bg-primary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '10s'}}></div>
          <div className="absolute bottom-20 left-[20%] w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-50 animate-pulse" style={{animationDuration: '15s'}}></div>
        </div>
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20 border-none">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Students Say</h2>
            <p className="text-lg text-muted-foreground">
              Real stories from students who achieved their goals with our platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
            <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardHeader className="pb-2">
                <div className="flex text-amber-500 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-500" />
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-foreground/90 leading-relaxed">
                  "This platform helped me raise my calculus grade from a C to an A. 
                  The personalized approach made all the difference."
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src="https://randomuser.me/api/portraits/women/32.jpg" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Jamie Smith</p>
                    <p className="text-sm text-muted-foreground">Math Student</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardHeader className="pb-2">
                <div className="flex text-amber-500 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-500" />
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-foreground/90 leading-relaxed">
                  "I needed help with my Spanish course, and this platform was amazing. 
                  I can now confidently hold conversations in Spanish!"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src="https://randomuser.me/api/portraits/men/42.jpg" />
                    <AvatarFallback>AP</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Alex Patel</p>
                    <p className="text-sm text-muted-foreground">Language Student</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
              <CardHeader className="pb-2">
                <div className="flex text-amber-500 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-500" />
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-foreground/90 leading-relaxed">
                  "The flexible scheduling options made it possible for me to fit learning
                  around my busy work schedule. Highly recommend!"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src="https://randomuser.me/api/portraits/women/22.jpg" />
                    <AvatarFallback>MJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Maria Johnson</p>
                    <p className="text-sm text-muted-foreground">Working Professional</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" className="bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-md transition-all border-border/40 hover:translate-y-[-2px] group">
              <Link href="/tutors" className="flex items-center gap-2">
                Start Learning Today <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 