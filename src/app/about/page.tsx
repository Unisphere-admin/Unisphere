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
          <div className="absolute top-20 right-[20%] w-72 h-72 bg-[#84b4cc]/10 rounded-full blur-3xl opacity-70 animate-pulse" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-10 left-[10%] w-80 h-80 bg-[#84b7bd]/10 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '12s'}}></div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-8">
              
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About Us</h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
            UniSphere was founded with a simple vision: to connect students with mentors from top global universities, making world-class admissions support more personalised and affordable than ever.

            </p>
            <Button asChild size="lg" className="bg-[#128ca0] hover:bg-[#126d94] shadow-md hover:shadow-lg transition-all hover:translate-y-[-2px]">
              <Link href="/tutors">Learn More</Link>
            </Button>
          </div>
          <div className="relative">
            <div className="absolute -z-10 top-1/4 left-1/4 w-1/2 h-1/2 bg-[#84b4cc]/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#84b4cc]/10 via-transparent to-[#84b7bd]/10 rounded-xl blur-xl transform -translate-y-4 translate-x-4 opacity-60"></div>
            <img 
              src="/placeholder.svg" 
              alt="Students Learning"
              className="rounded-lg shadow-xl relative z-10"
            />
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="py-12 bg-[#c7e4e3]/20 backdrop-blur-sm border border-[#c2d8d2]/30 rounded-2xl shadow-sm">
        <div className="px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-[#128ca0] mb-2">20+</div>
              <div className="text-muted-foreground">Tutors</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-[#128ca0] mb-2">10+</div>
              <div className="text-muted-foreground">Services offered</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-[#128ca0] mb-2">50+</div>
              <div className="text-muted-foreground">Courses/Majors</div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-40 right-[30%] w-72 h-72 bg-[#84b7bd]/10 rounded-full blur-3xl opacity-60 animate-pulse" style={{animationDuration: '10s'}}></div>
        </div>
        
        <div className="max-w-3xl mx-auto text-center mb-12 relative z-10">
        
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How our platform works</h2>
          {/* <p className="text-xl text-muted-foreground">
            How Unisphere came to be and our journey so far
          </p> */}
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="order-2 md:order-1">
            <div className="space-y-6">
              <div className="hover:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl font-semibold mb-3">1. Join with a One-Time Fee</h3>
                <p className="text-muted-foreground">
                Pay a one-time access fee, unlock everything you need to begin your journey, from finding tutors to using our exclusive guides, resources and communities
                </p>
              </div>
              
              <div className="hover:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl font-semibold mb-3">2. Build Your Own Tutor Network</h3>
                <p className="text-muted-foreground">
                Browse a wide network of current students from top UK, US, and global universities. Choose your tutors based on their background, experience, or shared interests. Need help with a maths entrance test? A co-curricular essay? A specific college application? You can pick different tutors for each step of the process—on your own terms.
                </p>
              </div>
              
              <div className="hover:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl font-semibold mb-3">3. Book Sessions from as Short as 30 Minutes</h3>
                <p className="text-muted-foreground mb-2">
                Tutors on UniSphere set their own rates and availability, giving you full control over your schedule and budget. Whether you're stuck on a personal statement paragraph, need last-minute interview prep, or just want to ask a few key questions—there's no need to commit to an hour-long session.
                </p>
                <h4 className="text-xl font-semibold mb-3">• Minimum session length: 30 minutes</h4>
                <p className="text-muted-foreground mb-2">
                This makes it easier to fit into your day and your budget. You only pay for what you need.
                </p>
                <h4 className="text-xl font-semibold mb-3">• Great for focused support</h4>
                <p className="text-muted-foreground mb-2">
                Use short sessions to get targeted feedback on a specific essay, understand a tricky test question, or clarify application strategies.
                </p>
                <h4 className="text-xl font-semibold mb-3">• Flexible</h4>
                <p className="text-muted-foreground mb-2">
                Trying a new tutor? Start with a 30-minute session to see if they're the right fit. Want to follow up later? Just book another one on your terms.
                </p>
              </div>
              <div className="hover:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl font-semibold mb-3">4. Access Free Tools and a Vibrant Community
                </h3>
                <p className="text-muted-foreground">
                Alongside personalised tutoring, you'll gain access to: <br />
 • Application guides and timelines <br />
 • Recorded workshops and live Q&As <br />
 • A student-led community where you can share tips, ask questions, and initiate co-curricular projects together <br />
                </p>
              </div>
              <div className="hover:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl font-semibold mb-3">Why We Work
                </h3>
                <p className="text-muted-foreground">
                The best guidance comes from those who've just gone through the process. Unlike many traditional agencies that assign you expensive graduates, UniSphere empowers you to choose affordable, up-to-date support—delivered by students who truly understand what it takes to succeed. Begin your journey with us. 
                </p>
              </div>
            </div>
          </div>
          
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute -z-10 -bottom-6 -right-6 w-32 h-32 bg-[#84b7bd]/20 rounded-full blur-2xl animate-pulse" style={{animationDuration: '15s'}} />
              <div className="absolute inset-0 bg-gradient-to-r from-[#84b4cc]/10 via-transparent to-[#84b7bd]/10 rounded-xl blur-xl transform -translate-y-4 translate-x-4 opacity-60"></div>
              <img 
                src="/ourplatform.png" 
                alt="Our journey"
                className="rounded-lg max-w-md relative z-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-[#c7e4e3]/20 backdrop-blur-sm border border-[#c2d8d2]/30 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/10 via-[#84b4cc]/5 to-background/10"></div>
        
        <div className="max-w-3xl mx-auto text-center mb-16 relative z-10">
          <Badge className="mb-4 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 transition-colors">Simple Process</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How Unisphere Works</h2>
          <p className="text-xl text-muted-foreground">
            Our platform makes it easy to connect and start learning
          </p>
        </div>

        {/* Process Steps with Connected Line */}
        <div className="container mx-auto px-4 md:px-6">
          <div className="relative mt-12">
            {/* Grid for content - higher z-index */}
            <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-16 w-16 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-[#128ca0]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-6 w-6 text-white text-xs font-bold bg-[#128ca0]">
                    1
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Find Your Path</h3>
                <p className="text-muted-foreground">
                Browse our extensive database of learning paths based on subject, expertise, and availability.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-16 w-16 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-6">
                  <Clock className="h-8 w-8 text-[#128ca0]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-6 w-6 text-white text-xs font-bold bg-[#128ca0]">
                    2
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Schedule Sessions
                </h3>
                <p className="text-muted-foreground">
                Use our scheduling system to arrange sessions at times that work for you.
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-16 w-16 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-6">
                    <Award className="h-12 w-12 text-[#128ca0]" />
                  </div>
                  {/* Number badge positioned at the top of circle */}
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-6 w-6 text-white text-xs font-bold bg-[#128ca0]">
                    3
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Learn & Succeed</h3>
                <p className="text-muted-foreground">
                Meet virtually for personalized learning experiences tailored to your needs and goals.
                </p>
              </div>
            </div>
            
            {/* Horizontal line - lower z-index */}
            <div className="hidden md:block absolute top-[2rem] left-[17%] right-[17%] h-[1px] bg-[#84b4cc] z-[-1]"></div>
            
            {/* Connection dots - same z-index as line */}
            <div className="hidden md:block absolute top-[2rem] left-[calc(33.333%+8rem)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] translate-y-[-1.5px] z-[-1]"></div>
            <div className="hidden md:block absolute top-[2rem] left-[calc(33.333%-8rem)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] translate-y-[-1.5px] z-[-1]"></div>
            <div className="hidden md:block absolute top-[2rem] left-[calc(66.666%+8rem)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] translate-y-[-1.5px] z-[-1]"></div>
            <div className="hidden md:block absolute top-[2rem] left-[calc(66.666%-8rem)] w-[4px] h-[4px] rounded-full bg-[#84b4cc] translate-y-[-1.5px] z-[-1]"></div>
          </div>
        </div>
      </section>

      {/* Team section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute bottom-20 left-[20%] w-80 h-80 bg-[#84b4cc]/10 rounded-full blur-3xl opacity-50 animate-pulse" style={{animationDuration: '15s'}}></div>
        </div>
        
        <div className="max-w-3xl mx-auto text-center mb-16 relative z-10">
          <Badge className="mb-4 bg-[#3e5461]/10 text-[#128ca0] hover:bg-[#3e5461]/20 transition-colors">Our People</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Team</h2>
          <p className="text-xl text-muted-foreground">
          The dedicated co-founders behind UniSphere

          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
          {[
            {
              name: "Joshua Ooi",
              role: "Columbia University",
              image: "/placeholder.svg"
            },
            {
              name: "Justin Lee",
              role: "Oxford University",
              image: "/placeholder.svg"
            },
            {
              name: "Bryan Lim",
              role: "Harvard University",
              image: "/placeholder.svg"
            },
            {
              name: "Matthew Tang",
              role: "Yale University",
              image: "/placeholder.svg"
            }
          ].map((member) => (
            <div key={member.name} className="flex flex-col items-center text-center group">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-[#84b4cc]/20 to-[#84b7bd]/20 rounded-full blur-md transform scale-90 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
      <section className="py-16 md:py-24 bg-[#c7e4e3]/20 backdrop-blur-sm border border-[#c2d8d2]/30 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/10 via-[#84b4cc]/5 to-background/10"></div>
        
        <div className="max-w-3xl mx-auto text-center mb-16 relative z-10">
          <Badge className="mb-4 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 transition-colors">What We Stand For</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Core Values</h2>
          <p className="text-xl text-muted-foreground">
            The principles that guide everything we do
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 px-4 md:px-8 relative z-10">
          <Card className="bg-background/80 backdrop-blur-sm border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#84b4cc]/30 to-[#c7e4e3]/30 flex items-center justify-center shadow-sm">
                <Globe className="h-6 w-6 text-[#128ca0]" />
              </div>
              <CardTitle>Educational Excellence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
              We're committed to providing the highest quality admissions support through thoroughly vetted student mentors, curated resources, and proven strategies tailored to top global universities.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-background/80 backdrop-blur-sm border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#84b4cc]/30 to-[#c7e4e3]/30 flex items-center justify-center shadow-sm">
                <CheckCircle className="h-6 w-6 text-[#128ca0]" />
              </div>
              <CardTitle>Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
              We believe expert guidance should be affordable and within reach for every student. Our platform lowers barriers of cost and location, offering flexible, budget-friendly services for all.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-background/80 backdrop-blur-sm border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#84b4cc]/30 to-[#c7e4e3]/30 flex items-center justify-center shadow-sm">
                <Star className="h-6 w-6 text-[#128ca0]" />
              </div>
              <CardTitle>Innovation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
              We continuously develop smarter ways to connect students with peer mentors and create new resources, using our platform to personalise the admissions journey and streamline every step. 


              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 md:py-24 relative">
        <div className="bg-gradient-to-br from-[#84b4cc]/10 via-[#c7e4e3]/10 to-[#84b7bd]/10 backdrop-blur-sm border border-[#c2d8d2]/30 rounded-2xl p-8 md:p-12 text-center shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#84b4cc]/10 rounded-full blur-3xl opacity-70"></div>
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#84b7bd]/10 rounded-full blur-3xl opacity-70"></div>
          </div>
          
          <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to start your application journey?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Unlock access to our exclusive community of tutors and students 


          </p>
            <Button asChild size="lg" className="bg-[#128ca0] hover:bg-[#126d94] shadow-md hover:shadow-lg transition-all hover:translate-y-[-2px]">
            <Link href="/tutors">
                Begin Your Journey
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 