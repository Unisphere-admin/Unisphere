"use client";
import React, { useState } from "react";
import Image from "next/image";
import AuthLoadingScreen from "@/components/layout/AuthLoadingScreen";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  ArrowRight,
  Mail,
  LockKeyhole,
  User,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  sanitizeInput,
  checkForMaliciousContent,
} from "@/lib/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const regionOptions = [
  { value: "UK", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "BOTH", label: "Both UK & US" },
  { value: "UNSURE", label: "Not sure yet" },
];

const cycleOptions = [
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" },
  { value: "2028", label: "2028" },
  { value: "2029", label: "2029" },
];

const usUniOptions = [
  { value: "Brown", label: "Brown" },
  { value: "Caltech", label: "Caltech" },
  { value: "Columbia", label: "Columbia" },
  { value: "Cornell", label: "Cornell" },
  { value: "Harvard", label: "Harvard" },
  { value: "MIT", label: "MIT" },
  { value: "NYU", label: "NYU" },
  { value: "Princeton", label: "Princeton" },
  { value: "Stanford", label: "Stanford" },
  { value: "UCBerkeley", label: "UCBerkeley" },
  { value: "UCDavis", label: "UCDavis" },
  { value: "UChicago", label: "UChicago" },
  { value: "UCLA", label: "UCLA" },
  { value: "UPenn", label: "UPenn" },
  { value: "Yale", label: "Yale" },
];

const ukUniOptions = [
  { value: "Cambridge", label: "Cambridge" },
  { value: "Durham", label: "Durham" },
  { value: "Imperial", label: "Imperial" },
  { value: "KCL", label: "KCL" },
  { value: "LSE", label: "LSE" },
  { value: "Oxford", label: "Oxford" },
  { value: "UCL", label: "UCL" },
  { value: "Warwick", label: "Warwick" },
];

const serviceOptions = [
  {
    value: "US",
    label:
      "US Admissions (Essays, Activities List, Choosing Universities/Courses)",
  },
  {
    value: "UK",
    label: "UK Admissions (Personal Statement, Choosing Universities/Courses)",
  },
  { value: "UK_entrance", label: "UK Entrance Tests" },
  { value: "extracurricular", label: "Extracurricular Building" },
  { value: "SAT", label: "SAT/ACT" },
  { value: "A_level", label: "A-Level Tutoring" },
  { value: "IB", label: "IB Tutoring" },
];

const steps = [
  "region",
  "University",
  "applicationCycle",
  "services",
  "school",
  "course",
];

type Answers = {
  region: string;
  applicationCycle: string;
  universities: string[];
  services: string[];
  school: string;
  course: string;
};

export default function Survey() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    region: "",
    applicationCycle: "",
    universities: [],
    services: [],
    school: "",
    course: "",
  });
  const [error, setError] = useState("");
  const { toast } = useToast();
  const [otherService, setOtherService] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fade, setFade] = useState("in");

  const handleNext = () => {
    setFade("out");
    setTimeout(() => {
      setStep((prev) => Math.min(prev + 1, steps.length - 1));
      setFade("in");
    }, 250); // match your CSS duration
  };

  const handleBack = () => {
    setFade("out");
    setTimeout(() => {
      setStep((prev) => Math.max(prev - 1, 0));
      setFade("in");
    }, 250);
  };

  const redirect = async () => {
    setIsLoading(true);

    try {
      console.log("Starting survey completion...", answers);

      // Call the API to mark survey as completed
      const response = await fetch("/api/users/survey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answers),
        credentials: "include",
      });

      console.log("API response status:", response.status);

      const responseData = await response.json();
      console.log("API response data:", responseData);

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to complete survey");
      }

      // Show success message
      toast({
        title: "Survey completed!",
        description: "Thank you for completing your profile.",
      });

      // Redirect to dashboard or home
      console.log("Redirecting to dashboard...");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing survey:", error);
      toast({
        title: "Error",
        description: "Failed to complete survey. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step renderers
  const renderStep = () => {
    // Loading overlay
    if (isLoading) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Loader2 className="animate-spin w-12 h-12 text-primary" />
        </div>
      );
    }
    switch (steps[step]) {
      case "applicationCycle":
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background p-5">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader>
                <CardTitle>
                  Which university application cycle are you applying for?
                </CardTitle>
                <CardDescription>
                  Please select the year you plan to start university.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 mt-4">
                  {cycleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex items-center w-full px-6 py-4 rounded-lg border-2 transition-colors text-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-left
                        ${
                          answers.applicationCycle === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:border-primary/60"
                        }
                      `}
                      onClick={() =>
                        setAnswers((a) => ({
                          ...a,
                          applicationCycle: opt.value,
                        }))
                      }
                    >
                      <span className="flex-1">{opt.label}</span>
                      {answers.applicationCycle === opt.value && (
                        <span className="ml-4 text-base font-medium">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!answers.applicationCycle}
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      case "University": {
        let uniOptions: Array<{ value: string; label: string }> = [];
        if (answers.region === "US") {
          uniOptions = usUniOptions;
        } else if (answers.region === "UK") {
          uniOptions = ukUniOptions;
        } else if (answers.region === "BOTH" || answers.region === "UNSURE") {
          uniOptions = [...usUniOptions, ...ukUniOptions];
        }

        // Multi-select logic
        const toggleUniversity = (value: string) => {
          setAnswers((a) => {
            const selected = a.universities.includes(value)
              ? a.universities.filter((u) => u !== value)
              : [...a.universities, value];
            return { ...a, universities: selected };
          });
        };

        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background p-5">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader>
                <CardTitle>
                  Which of these universities would you be interested in
                  applying to?
                </CardTitle>
                <CardDescription>
                  Please select your preferred universities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6 mt-4">
                  {uniOptions.map((opt) => {
                    const logoFile = `/Unilogos/${opt.label} Logo.png`;
                    const selected = answers.universities.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`flex flex-col items-center justify-center aspect-square w-35 h-35 md:w-40 md:h-40 mx-auto rounded-2xl border-2 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 p-2 md:p-4
                          ${
                            selected
                              ? "bg-primary/10 border-primary scale-105"
                              : "bg-background border-border hover:border-primary/100"
                          }
                        `}
                        onClick={() => toggleUniversity(opt.value)}
                      >
                        <Image
                          src={logoFile}
                          alt={opt.label + " logo"}
                          width={100}
                          height={100}
                          className="object-contain h-full w-full bg-white rounded-xl"
                          sizes="(max-width: 767px) 100vw, 8rem"
                        />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={answers.universities.length === 0}
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      }

      case "school": {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background p-5">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader>
                <CardTitle>What is your current school?</CardTitle>
                <CardDescription>Enter your school name</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 mt-4">
                  <Label htmlFor="school">School Name</Label>
                  <Input
                    id="school"
                    type="text"
                    placeholder="e.g. Garden International School"
                    value={answers.school}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, school: e.target.value }))
                    }
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={answers.school.trim() === ""}
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      }

      case "course": {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background p-5">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader>
                <CardTitle>
                  What course/major are you planning to pursue at University?
                </CardTitle>
                <CardDescription>
                  Enter your preferred course/major
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 mt-4">
                  <Label htmlFor="school">Course/Major</Label>
                  <Input
                    id="course"
                    type="text"
                    placeholder="e.g. Economics"
                    value={answers.course}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, course: e.target.value }))
                    }
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={redirect}
                  disabled={answers.course.trim() === "" || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>Submit</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      }

      case "services": {
        const toggleServices = (value: string) => {
          setAnswers((a) => {
            const selected = a.services.includes(value)
              ? a.services.filter((u) => u !== value)
              : [...a.services, value];
            return { ...a, services: selected };
          });
        };
        const addOtherService = () => {
          const trimmed = otherService.trim();
          if (trimmed && !answers.services.includes(trimmed)) {
            setAnswers((a) => ({ ...a, services: [...a.services, trimmed] }));
          }
          setOtherService("");
        };
        const hasCustom = answers.services.some(
          (s) => !serviceOptions.some((opt) => opt.label === s)
        );
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background p-5">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader>
                <CardTitle>which services do you need help with?</CardTitle>
                <CardDescription>
                  Please select your preferred services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 mt-4">
                  {serviceOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex items-center w-full px-6 py-4 rounded-lg border-2 transition-colors text-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-left
                        ${
                          answers.services.includes(opt.label)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:border-primary/60"
                        }
                      `}
                      onClick={() => toggleServices(opt.label)}
                    >
                      <span className="flex-1">{opt.label}</span>
                      {answers.services.includes(opt.label) && (
                        <span className="ml-4 text-base font-medium">✓</span>
                      )}
                    </button>
                  ))}
                  {/* Render custom/other service as a toggle button, only one allowed */}
                  {hasCustom && (
                    <button
                      type="button"
                      className="flex items-center w-full px-6 py-4 rounded-lg border-2 bg-primary text-primary-foreground border-primary text-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
                      onClick={() =>
                        toggleServices(
                          answers.services.find(
                            (s) =>
                              !serviceOptions.some((opt) => opt.label === s)
                          )!
                        )
                      }
                    >
                      <span className="flex-1">
                        {answers.services.find(
                          (s) => !serviceOptions.some((opt) => opt.label === s)
                        )}
                      </span>
                      <span className="ml-4 text-base font-medium">✓</span>
                    </button>
                  )}
                  {/* Input for adding new custom service, only if not already present */}
                  {!hasCustom && (
                    <Input
                      className="flex items-center w-full px-6 py-4 rounded-lg border-2 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
                      placeholder="Other"
                      id="other-service"
                      value={otherService}
                      onChange={(e) => setOtherService(e.target.value)}
                      onBlur={addOtherService}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOtherService();
                        }
                      }}
                    />
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={answers.services.length === 0}
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      }
      case "region":
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background p-5">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader>
                <CardTitle>Where are you applying?</CardTitle>
                <CardDescription>UK, US, both, or not sure?</CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="region">Application Region</Label>
                <Select
                  value={answers.region}
                  onValueChange={(val) =>
                    setAnswers((a) => ({ ...a, region: val }))
                  }
                >
                  <SelectTrigger id="region" className="mt-2">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleNext} disabled={!answers.region}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      default:
        return <div />;
    }
  };

  if (isLoading) {
    return <AuthLoadingScreen />;
  }
  return (
    <div
      className={`survey-container ${fade === "in" ? "fade-in" : "fade-out"}`}
    >
      <style jsx>{`
        .survey-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          z-index: 9999;
        }
      `}</style>
      {renderStep()}
    </div>
  );
}
