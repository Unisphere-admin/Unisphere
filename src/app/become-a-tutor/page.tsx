"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, ArrowLeft } from "lucide-react";

export default function BecomeATutorPage() {
  const whatsappNumber = "+60 14-360 8123";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\s+/g, '')}`;

  return (
    <div className="container max-w-4xl mx-auto my-8 px-4 h-screen justify-center items-center">
      
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold text-center mb-6">Become a Tutor</h1>
      
      <div className="text-center mb-12">
        <p className="text-xl text-muted-foreground">
          Join our platform and make a difference in students' lives while earning income.
        </p>
      </div>

      <Card className="shadow-lg border-border/40">
        <CardHeader className="bg-gradient-to-r from-[#3e5461]/10 to-[#126d94]/10">
          <CardTitle className="text-2xl text-center">Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <p className="text-lg mb-6">
            Interested in becoming a tutor on our platform? We'd love to hear from you!
          </p>
          
          <p className="text-muted-foreground mb-10">
            Send us a WhatsApp message to start your application process.
          </p>

          <Button 
            asChild
            size="lg" 
            className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all"
          >
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              WhatsApp Us at {whatsappNumber}
            </a>
          </Button>

        
        </CardContent>
      </Card>
      </div>
    </div>
  );
} 