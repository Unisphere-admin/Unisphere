"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Users, 
  Clock, 
  Award, 
  CheckCircle, 
  Star,
  ArrowRight,
  Globe,
  MessageCircle,
  UserCheck,
  Sparkles
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AboutPage() {
  return (
    <div className="container max-w-screen-xl mx-auto px-4 md:px-6 with-navbar w-full">
      {/* Hero section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 right-[20%] w-72 h-72 bg-primary/5 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-primary/10 p-4 rounded-md">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About Us</h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              Unisphere was founded with a simple vision: to make quality education accessible to everyone through personalized learning experiences.
            </p>
            <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-all hover:translate-y-[-2px]">
              <Link href="/tutors">Start Learning Today</Link>
            </Button>
          </div>
          <div className="relative">
            <div className="absolute -z-10 top-1/4 left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 rounded-xl blur-xl transform -translate-y-4 translate-x-4 opacity-60"></div>
            <img 
              src="/placeholder.svg" 
              alt="Students Learning"
              className="rounded-lg shadow-xl relative z-10"
            />
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="py-12 bg-muted/40 backdrop-blur-sm border border-border/30 rounded-2xl shadow-sm">
        <div className="px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Learning Paths</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-primary mb-2">15k+</div>
              <div className="text-muted-foreground">Students Helped</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-primary mb-2">30k+</div>
              <div className="text-muted-foreground">Sessions Completed</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Subject Areas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-40 right-[30%] w-72 h-72 bg-secondary/5 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '10s'}}></div>
        </div>
        
        <div className="max-w-3xl mx-auto text-center mb-12 relative z-10">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Our Journey</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Story</h2>
          <p className="text-xl text-muted-foreground">
            How Unisphere came to be and our journey so far
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="order-2 md:order-1">
            <div className="space-y-6">
              <div className="hover:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl font-semibold mb-3">The Beginning</h3>
                <p className="text-muted-foreground">
                  Unisphere was founded in 2020 by a group of educators and technologists who believed that personalized learning should be accessible to everyone, regardless of location or background.
                </p>
              </div>
              
              <div className="hover:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl font-semibold mb-3">Our Growth</h3>
                <p className="text-muted-foreground">
                  What started as a small platform with just a few subjects has grown into a global community of learners, with thousands of learning sessions happening every day.
                </p>
              </div>
              
              <div className="hover:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl font-semibold mb-3">Looking Forward</h3>
                <p className="text-muted-foreground">
                  Today, we're continuing to innovate and expand our offerings, with new subjects, features, and ways to learn being added all the time.
                </p>
              </div>
            </div>
          </div>
          
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute -z-10 -bottom-6 -right-6 w-32 h-32 bg-secondary/20 rounded-full blur-2xl animate-pulse" style={{animationDuration: '15s'}} />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 rounded-xl blur-xl transform -translate-y-4 translate-x-4 opacity-60"></div>
              <img 
                src="/placeholder.svg" 
                alt="Our journey"
                className="rounded-lg shadow-xl max-w-md relative z-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-muted/30 backdrop-blur-sm border border-border/30 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/10 via-primary/5 to-background/10"></div>
        
        <div className="max-w-3xl mx-auto text-center mb-16 relative z-10">
          <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors">Simple Process</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How Unisphere Works</h2>
          <p className="text-xl text-muted-foreground">
            Our platform makes it easy to connect and start learning
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 px-4 md:px-8 relative z-10">
          <div className="flex flex-col items-center text-center hover:translate-y-[-5px] transition-transform duration-300">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-sm">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">1. Find Your Path</h3>
            <p className="text-muted-foreground">
              Browse our extensive database of learning paths based on subject, expertise, and availability.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center hover:translate-y-[-5px] transition-transform duration-300">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-sm">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">2. Schedule Sessions</h3>
            <p className="text-muted-foreground">
              Use our scheduling system to arrange sessions at times that work for you.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center hover:translate-y-[-5px] transition-transform duration-300">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-sm">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">3. Learn & Succeed</h3>
            <p className="text-muted-foreground">
              Meet virtually for personalized learning experiences tailored to your needs and goals.
            </p>
          </div>
        </div>
      </section>

      {/* Team section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute bottom-20 left-[20%] w-80 h-80 bg-primary/5 rounded-full blur-3xl opacity-50 animate-pulse" style={{animationDuration: '15s'}}></div>
        </div>
        
        <div className="max-w-3xl mx-auto text-center mb-16 relative z-10">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Our People</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">The Team</h2>
          <p className="text-xl text-muted-foreground">
            The passionate educators and technologists behind Unisphere
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
          {[
            {
              name: "Alex Chen",
              role: "Founder & CEO",
              image: "/placeholder.svg"
            },
            {
              name: "Sarah Johnson",
              role: "Head of Education",
              image: "/placeholder.svg"
            },
            {
              name: "Michael Kim",
              role: "CTO",
              image: "/placeholder.svg"
            },
            {
              name: "Jessica Patel",
              role: "Director of Learning",
              image: "/placeholder.svg"
            }
          ].map((member) => (
            <div key={member.name} className="flex flex-col items-center text-center group">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-md transform scale-90 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Avatar className="h-24 w-24 border-2 border-background shadow-md group-hover:scale-105 transition-transform">
                <AvatarImage src={member.image} />
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              </div>
              <h3 className="font-semibold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values section */}
      <section className="py-16 md:py-24 bg-muted/30 backdrop-blur-sm border border-border/30 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/10 via-primary/5 to-background/10"></div>
        
        <div className="max-w-3xl mx-auto text-center mb-16 relative z-10">
          <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors">What We Stand For</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Core Values</h2>
          <p className="text-xl text-muted-foreground">
            The principles that guide everything we do
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 px-4 md:px-8 relative z-10">
          <Card className="bg-background/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Educational Excellence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We're committed to providing the highest quality educational experience, with rigorous standards for our content and methodologies.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-background/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We believe education should be accessible to all, and work to remove barriers of geography, schedule, and background.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-background/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Innovation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We continuously seek better ways to connect students with educational resources and enhance the learning experience through technology.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 md:py-24 relative">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 backdrop-blur-sm border border-border/30 rounded-2xl p-8 md:p-12 text-center shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-70"></div>
            <div className="absolute top-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl opacity-70"></div>
          </div>
          
          <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of students who have already started their learning journey with us.
          </p>
            <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-all hover:translate-y-[-2px]">
            <Link href="/tutors">
                Start Learning
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 