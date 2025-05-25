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
  ArrowRight
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
import { useApiTutorProfiles } from "@/hooks/useApiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { TutorProfile } from "@/types/supabaseTypes";

export default function HomePage() {
  const { tutors: fetchedTutors, loading } = useApiTutorProfiles();
  
  // Take only the first 3 tutors for the featured section
  const displayTutors: TutorProfile[] = Array.isArray(fetchedTutors) ? fetchedTutors.slice(0, 3) : [];

  return (
    <div className="w-full with-navbar">
      {/* Hero Section */}
      <section className="hero-gradient py-16 md:py-24 w-full">
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <h1 className="font-bold tracking-tighter text-4xl md:text-5xl lg:text-6xl">
                Expert Tutoring,<br />
                <span className="text-primary">Anytime, Anywhere</span>
              </h1>
              <p className="text-xl text-muted-foreground md:text-2xl max-w-[600px]">
                Connect with top-rated tutors for personalized learning sessions in any subject
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button size="lg" className="button-glow">
                  <Link href="/tutors">Find a Tutor</Link>
                </Button>
                <Button size="lg" variant="outline">
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex -space-x-2">
                  <Avatar className="border-2 border-background h-8 w-8">
                    <AvatarImage src="/placeholder.svg" alt="User" />
                    <AvatarFallback>U1</AvatarFallback>
                  </Avatar>
                  <Avatar className="border-2 border-background h-8 w-8">
                    <AvatarImage src="/placeholder.svg" alt="User" />
                    <AvatarFallback>U2</AvatarFallback>
                  </Avatar>
                  <Avatar className="border-2 border-background h-8 w-8">
                    <AvatarImage src="/placeholder.svg" alt="User" />
                    <AvatarFallback>U3</AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">1000+</span> students already learning
                </p>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full max-w-md mx-auto">
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse-soft"></div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-pulse-soft"></div>
                <img
                  src="/placeholder.svg"
                  alt="Online Tutoring"
                  className="relative z-10 w-full rounded-2xl shadow-xl"
                />
                <div className="absolute top-5 -right-10 bg-white p-4 rounded-xl shadow-lg animate-float z-20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Instant Matching</span>
                  </div>
                </div>
                <div className="absolute -bottom-10 -left-8 bg-white p-4 rounded-xl shadow-lg animate-float z-20" style={{ animationDelay: "1s" }}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Expert Tutors</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 w-full">
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Our platform makes it easy to connect with tutors and start learning
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Find Your Tutor</h3>
              <p className="text-muted-foreground">
                Browse profiles of qualified tutors specialized in your subject
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Schedule a Session</h3>
              <p className="text-muted-foreground">
                Message tutors to arrange a time that works for your schedule
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Learn & Succeed</h3>
              <p className="text-muted-foreground">
                Connect for personalized learning sessions using our token system
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tutors Section */}
      <section className="py-16 md:py-24 bg-muted/30 w-full">
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Tutors</h2>
              <p className="text-xl text-muted-foreground">
                Meet our top-rated tutoring professionals
              </p>
            </div>
            <Button className="mt-4 md:mt-0" asChild>
              <Link href="/tutors">
                View All Tutors
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {loading ? (
              // Show skeletons while loading
              Array(3).fill(0).map((_, index) => (
                <Card key={index} className="card-hover">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-14 w-14 rounded-full" />
                      <Skeleton className="h-5 w-10" />
                    </div>
                    <Skeleton className="h-6 w-32 mt-4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))
            ) : displayTutors.length > 0 ? (
              displayTutors.map((tutor: TutorProfile) => (
                <Card key={tutor.id} className="card-hover">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={tutor.avatar_url || "/placeholder.svg"} alt={tutor.first_name} />
                        <AvatarFallback>
                          {tutor.first_name?.charAt(0) || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center">
                        <span className="text-amber-500 mr-1">★</span>
                        <span className="font-medium">4.8</span>
                      </div>
                    </div>
                    <CardTitle className="mt-4">
                      {tutor.first_name} {tutor.last_name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {tutor.description || 'Experienced tutor ready to help you succeed.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tutor.subjects && typeof tutor.subjects === 'string' ? 
                        tutor.subjects.split(',').map((subject: string, i: number) => (
                          <Badge key={i} variant="secondary" className="rounded-full">
                            {subject.trim()}
                          </Badge>
                        )) : 
                        <Badge variant="secondary" className="rounded-full">
                          General Tutoring
                        </Badge>
                      }
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant="outline" asChild>
                      <Link href={`/tutors/${tutor.search_id || tutor.id}`}>View Profile</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-center col-span-3 py-8">
                <p className="text-muted-foreground">No tutors found. Check back soon!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 w-full">
        <div className="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Students Say</h2>
            <p className="text-xl text-muted-foreground">
              Real stories from students who achieved their goals with TutorMatch
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex mb-4 text-amber-500">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="mb-6 italic">
                  "My tutor helped me raise my calculus grade from a C to an A. 
                  The personalized approach made all the difference."
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Jamie Smith</p>
                    <p className="text-sm text-muted-foreground">Math Student</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/5">
              <CardContent className="pt-6">
                <div className="flex mb-4 text-amber-500">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="mb-6 italic">
                  "I needed help with my Spanish course, and my tutor was amazing. 
                  I can now confidently hold conversations in Spanish!"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback>AP</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Alex Patel</p>
                    <p className="text-sm text-muted-foreground">Language Student</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex mb-4 text-amber-500">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="mb-6 italic">
                  "The flexible scheduling options made it possible for me to fit tutoring
                  around my busy work schedule. Highly recommend!"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg" />
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
        </div>
      </section>
    </div>
  );
} 