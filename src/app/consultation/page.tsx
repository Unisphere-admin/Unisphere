"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, School, GraduationCap, Clock, ArrowRight, Star, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Consultant {
  id: string;
  name: string;
  university: string;
  initials: string;
}

const consultants: Consultant[] = [
  {
    id: "joshua",
    name: "Joshua",
    university: "Columbia University",
    initials: "JC"
  },
  {
    id: "justin",
    name: "Justin",
    university: "Oxford University",
    initials: "JO"
  },
  {
    id: "matthew",
    name: "Matthew",
    university: "Yale University",
    initials: "MY"
  }
];

export default function ConsultationPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Consultation request submitted!",
        description: "We'll be in touch with you shortly to schedule your free consultation.",
      });
      setIsSubmitting(false);
      setFormData({
        name: "",
        email: "",
        message: ""
      });
    }, 1500);
  };

  const isFormValid = formData.name && formData.email;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-12 md:py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Book Your Free Consultation</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Get personalized guidance on your educational journey from our expert advisors
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        <div>
          <h2 className="text-2xl font-semibold mb-6">What You Can Ask in Your Free Consultation</h2>
          <p className="text-muted-foreground mb-8">
            Not sure where to start? Your free consultation is the perfect place to get expert advice from one of our founders on:
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="mt-1 bg-primary/10 p-2 rounded-full h-10 w-10 flex items-center justify-center">
                <School className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Choosing the Right Course or University</h3>
                <p className="text-muted-foreground">
                  Get honest guidance on which degrees or universities best fit your goals, background, and strengths.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-primary/10 p-2 rounded-full h-10 w-10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Subject Selection Strategy</h3>
                <p className="text-muted-foreground">
                  Ask about which IGCSE, A-Level, or IB subjects can give you a stronger edge in competitive applications.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-primary/10 p-2 rounded-full h-10 w-10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Understanding the Admissions Timeline</h3>
                <p className="text-muted-foreground">
                  We'll walk you through key deadlines for UK and US universities—including Early Decision, Oxbridge, and Medicine.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-primary/10 p-2 rounded-full h-10 w-10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Improving Your Admission Chances</h3>
                <p className="text-muted-foreground">
                  Learn what top universities are really looking for, and what you can do now to boost your chances.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-primary/10 p-2 rounded-full h-10 w-10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">How UniSphere Can Help</h3>
                <p className="text-muted-foreground">
                  We'll explain how our tutors and other services can support every part of your application, from personal statements and essays to entrance tests and interviews. We'll guide you through how to complete your one-time sign-up and start connecting with tutors.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-8 border border-border/40 shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">Our Consultants</h2>
          <p className="text-muted-foreground mb-4">
            Our team of expert consultants is ready to help you with your educational journey:
          </p>

          <div className="space-y-4 mb-8">
            {consultants.map((consultant) => (
              <Card key={consultant.id} className="border border-border/40">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-12 w-12 border border-border/40">
                    <AvatarFallback className="bg-primary/10 text-primary">{consultant.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{consultant.name}</CardTitle>
                    <CardDescription>{consultant.university}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-full h-10 w-10 flex-shrink-0 flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Contact us to book a session</h3>
              <p className="text-sm text-muted-foreground">
                Send a whatapp message to <span className="font-medium text-primary">+60 14-360 8123</span>
              </p>
            </div>
          </div>
          
          
        </div>
      </div>

      {/* Contact Form */}
      
    </div>
  );
} 