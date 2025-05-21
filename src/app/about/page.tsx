"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  BookOpen, 
  Users, 
  Clock, 
  Award, 
  CheckCircle, 
  Star,
  ArrowRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="container max-w-screen-xl mx-auto px-4 md:px-6 pt-16 w-full">
      {/* Hero section */}
      <section className="py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Our Mission: <span className="text-primary">Connect</span> & <span className="text-primary">Empower</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              TutorMatch was founded with a simple vision: to make quality education accessible to everyone by connecting students with expert tutors.
            </p>
            <Button asChild size="lg">
              <Link href="/tutors">Find Your Tutor Today</Link>
            </Button>
          </div>
          <div className="relative">
            <div className="absolute -z-10 top-1/4 left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-3xl" />
            <img 
              src="/placeholder.svg" 
              alt="Students Learning"
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="py-12 bg-muted/40 rounded-2xl">
        <div className="px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Expert Tutors</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">15k+</div>
              <div className="text-muted-foreground">Students Helped</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">30k+</div>
              <div className="text-muted-foreground">Sessions Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Subject Areas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Story</h2>
          <p className="text-xl text-muted-foreground">
            How TutorMatch came to be and our journey so far
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold mb-3">The Beginning</h3>
                <p className="text-muted-foreground">
                  TutorMatch was founded in 2020 by a group of educators and technologists who believed that personalized learning should be accessible to everyone, regardless of location or background.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold mb-3">Our Growth</h3>
                <p className="text-muted-foreground">
                  What started as a small platform with just 50 tutors has grown into a global community of educators and learners, with thousands of tutoring sessions happening every day.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold mb-3">Looking Forward</h3>
                <p className="text-muted-foreground">
                  Today, we're continuing to innovate and expand our offerings, with new subjects, features, and ways to learn being added all the time.
                </p>
              </div>
            </div>
          </div>
          
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute -z-10 -bottom-6 -right-6 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />
              <img 
                src="/placeholder.svg" 
                alt="Our journey"
                className="rounded-lg shadow-xl max-w-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-muted/30 rounded-2xl">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How TutorMatch Works</h2>
          <p className="text-xl text-muted-foreground">
            Our platform makes it easy to connect with expert tutors and start learning
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 px-4 md:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">1. Find Your Perfect Tutor</h3>
            <p className="text-muted-foreground">
              Browse our extensive database of qualified tutors based on subject, expertise, and availability.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">2. Schedule Sessions</h3>
            <p className="text-muted-foreground">
              Use our messaging system to connect with tutors and arrange sessions at times that work for you.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
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
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Our Team</h2>
          <p className="text-xl text-muted-foreground">
            The passionate educators and technologists behind TutorMatch
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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
              role: "Director of Tutor Relations",
              image: "/placeholder.svg"
            }
          ].map((member) => (
            <div key={member.name} className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={member.image} />
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values section */}
      <section className="py-16 md:py-24 bg-muted/30 rounded-2xl">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Core Values</h2>
          <p className="text-xl text-muted-foreground">
            The principles that guide everything we do
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 px-4 md:px-8">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <CardTitle>Educational Excellence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We're committed to providing the highest quality educational experience, with rigorous standards for our tutors and content.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <CheckCircle className="h-8 w-8 text-primary" />
              <CardTitle>Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We believe education should be accessible to all, and work to remove barriers of geography, schedule, and background.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <Star className="h-8 w-8 text-primary" />
              <CardTitle>Innovation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We continuously seek better ways to connect students with tutors and enhance the learning experience through technology.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 md:py-24">
        <div className="bg-primary/10 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who have already found their perfect tutor match and started their learning journey.
          </p>
          <Button asChild size="lg">
            <Link href="/tutors">
              Find a Tutor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
} 