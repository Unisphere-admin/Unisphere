"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, ArrowLeft, Mail, LockKeyhole, User, Check, Globe } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { useToast } from "@/hooks/use-toast";
import { emailSchema, passwordSchema, nameSchema, sanitizeInput, checkForMaliciousContent } from "@/lib/validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface University {
  name: string;
  shortName: string;
  logoFile: string;
  color: string;
}

const UK_UNIVERSITIES: University[] = [
  { name: "University of Oxford", shortName: "Oxford", logoFile: "/Unilogos/Oxford Logo.png", color: "#002147" },
  { name: "University of Cambridge", shortName: "Cambridge", logoFile: "/Unilogos/Cambridge Logo.png", color: "#A3C1AD" },
  { name: "Imperial College London", shortName: "Imperial", logoFile: "/Unilogos/Imperial Logo.png", color: "#003E74" },
  { name: "University College London", shortName: "UCL", logoFile: "/Unilogos/UCL Logo.png", color: "#500778" },
  { name: "London School of Economics", shortName: "LSE", logoFile: "/Unilogos/LSE Logo.png", color: "#B4122B" },
  { name: "King's College London", shortName: "KCL", logoFile: "/Unilogos/KCL Logo.png", color: "#CF0072" },
  { name: "Durham University", shortName: "Durham", logoFile: "/Unilogos/Durham Logo.png", color: "#7B2C2C" },
  { name: "University of Warwick", shortName: "Warwick", logoFile: "/Unilogos/Warwick Logo.png", color: "#4B0082" },
];

const US_UNIVERSITIES: University[] = [
  { name: "Harvard University", shortName: "Harvard", logoFile: "/Unilogos/Harvard Logo.png", color: "#A51C30" },
  { name: "MIT", shortName: "MIT", logoFile: "/Unilogos/MIT Logo.png", color: "#A31F34" },
  { name: "Stanford University", shortName: "Stanford", logoFile: "/Unilogos/Stanford Logo.png", color: "#8C1515" },
  { name: "Yale University", shortName: "Yale", logoFile: "/Unilogos/Yale Logo.png", color: "#00356B" },
  { name: "Princeton University", shortName: "Princeton", logoFile: "/Unilogos/Princeton Logo.png", color: "#FF6600" },
  { name: "Columbia University", shortName: "Columbia", logoFile: "/Unilogos/Columbia Logo.png", color: "#B9D9EB" },
  { name: "University of Pennsylvania", shortName: "UPenn", logoFile: "/Unilogos/UPenn Logo.png", color: "#011F5B" },
  { name: "Cornell University", shortName: "Cornell", logoFile: "/Unilogos/Cornell Logo.png", color: "#B31B1B" },
  { name: "Brown University", shortName: "Brown", logoFile: "/Unilogos/Brown Logo.png", color: "#4E3629" },
  { name: "New York University", shortName: "NYU", logoFile: "/Unilogos/NYU Logo.png", color: "#57068C" },
  { name: "University of Chicago", shortName: "UChicago", logoFile: "/Unilogos/UChicago Logo.png", color: "#800000" },
  { name: "California Institute of Technology", shortName: "Caltech", logoFile: "/Unilogos/Caltech Logo.png", color: "#FF6C0C" },
  { name: "UC Berkeley", shortName: "UC Berkeley", logoFile: "/Unilogos/UCBerkeley Logo.png", color: "#003262" },
  { name: "UCLA", shortName: "UCLA", logoFile: "/Unilogos/UCLA Logo.png", color: "#2D68C4" },
  { name: "UC Davis", shortName: "UC Davis", logoFile: "/Unilogos/UCDavis Logo.png", color: "#022851" },
];

const TOTAL_STEPS = 6;

const destinationOptions: { value: string; icon: React.ReactNode; label: string; desc: string }[] = [
  { value: "UK", icon: <ReactCountryFlag countryCode="GB" svg style={{ width: "1.75em", height: "1.4em" }} />, label: "United Kingdom", desc: "Oxford, Cambridge, LSE & more" },
  { value: "US", icon: <ReactCountryFlag countryCode="US" svg style={{ width: "1.75em", height: "1.4em" }} />, label: "United States", desc: "Harvard, MIT, Stanford & more" },
  { value: "Both", icon: <Globe className="h-7 w-7" />, label: "Both", desc: "Applying to UK & US universities" },
  { value: "Other", icon: <Globe className="h-7 w-7" />, label: "Other", desc: "Other destinations" },
];

const APPLICATION_CYCLES = ["2027", "2028", "2029", "2030", "2031"];

const EXAM_OPTIONS = [
  { value: "A-Levels", label: "A-Levels" },
  { value: "IB", label: "International Baccalaureate (IB)" },
  { value: "AP", label: "Advanced Placement (AP)" },
  { value: "SAT", label: "SAT" },
  { value: "ACT", label: "ACT" },
  { value: "Pre-U", label: "Cambridge Pre-U" },
  { value: "BTEC", label: "BTEC" },
  { value: "Scottish Highers", label: "Scottish Highers / Advanced Highers" },
  { value: "French Bac", label: "French Baccalaureate" },
  { value: "Abitur", label: "German Abitur" },
  { value: "CBSE/ISC", label: "Indian Board (CBSE / ISC)" },
  { value: "Singapore A-Levels", label: "Singapore A-Levels" },
  { value: "STPM", label: "Malaysian STPM" },
  { value: "Australian", label: "Australian HSC / VCE / QCE" },
  { value: "Other", label: "Other" },
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Azerbaijan",
  "Bahrain", "Bangladesh", "Belgium", "Bolivia", "Bosnia", "Brazil", "Brunei", "Bulgaria",
  "Cambodia", "Cameroon", "Canada", "Chile", "China", "Colombia", "Croatia", "Cyprus",
  "Czech Republic", "Denmark", "Ecuador", "Egypt", "Estonia", "Ethiopia", "Finland", "France",
  "Georgia", "Germany", "Ghana", "Greece", "Hong Kong", "Hungary", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kuwait", "Latvia", "Lebanon", "Lithuania", "Luxembourg", "Macau", "Malaysia", "Mexico",
  "Morocco", "Netherlands", "New Zealand", "Nigeria", "Norway", "Oman", "Pakistan",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia",
  "Serbia", "Singapore", "Slovakia", "South Africa", "South Korea", "Spain", "Sri Lanka",
  "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "UAE", "Uganda", "Ukraine",
  "United Kingdom", "United States", "Venezuela", "Vietnam", "Zimbabwe",
];

function getTransitionMessage(step: number, data: {
  destination: string;
  firstName: string;
  selectedUniversities: string[];
}): string {
  if (step === 1) {
    if (data.destination === "UK") return "Nice! Now tell us which UK universities you're interested in applying to.";
    if (data.destination === "US") return "Great choice! Now, which US schools are on your list?";
    if (data.destination === "Both") return "Ambitious - we love it! Let's build out your full university list.";
    return "Got it! Let's keep going.";
  }
  if (step === 2) {
    const count = data.selectedUniversities.length;
    if (count === 0) return "No worries, you can always add universities later. Let's get to know you.";
    if (count === 1) return "Solid target. Now let's get to know you a little better.";
    return `${count} universities - great spread. Now let's get to know you a little better.`;
  }
  if (step === 3) {
    return `Great to meet you, ${data.firstName}! Now tell us a bit about where you're studying.`;
  }
  if (step === 4) {
    return "Perfect. Almost there - just need a way to reach you.";
  }
  return "";
}

function UniLogoCard({
  uni,
  selected,
  onClick,
  compact = false,
}: {
  uni: University;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const logoSize = compact ? "w-12 h-12" : "w-16 h-16";
  const cardPad = compact ? "p-3" : "p-4";
  const textSize = compact ? "text-[10px]" : "text-xs";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center ${cardPad} rounded-2xl border-2 transition-all duration-150 group ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-white hover:border-primary/50 hover:shadow-sm hover:bg-muted/20"
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div
        className={`${logoSize} rounded-xl flex items-center justify-center overflow-hidden mb-2 shadow-sm`}
        style={{ backgroundColor: imgLoaded ? "white" : uni.color }}
      >
        {!imgError ? (
          <img
            src={uni.logoFile}
            alt={uni.shortName}
            className={`w-full h-full object-contain transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0 absolute"}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : null}
        {(!imgLoaded || imgError) && (
          <span className="text-white font-bold text-sm text-center leading-tight px-1">
            {uni.shortName.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>
      <span className={`${textSize} text-center font-semibold leading-tight text-foreground line-clamp-2 w-full`}>
        {uni.shortName}
      </span>
    </button>
  );
}

function ProgressHeader({ step, total }: { step: number; total: number }) {
  return (
    <div className="text-center mb-6">
      <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
      <div className="w-full bg-muted rounded-full h-1.5 mt-4">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function TransitionScreen({ message, onComplete }: { message: string; onComplete: () => void }) {
  const [phase, setPhase] = useState<"entering" | "visible" | "leaving">("entering");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("visible"), 50);
    const t2 = setTimeout(() => setPhase("leaving"), 2000);
    const t3 = setTimeout(onComplete, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div
      className="min-h-screen with-navbar flex items-center justify-center bg-white px-10 md:px-20"
      style={{
        opacity: phase === "visible" ? 1 : 0,
        transform: phase === "leaving" ? "scale(1.08)" : phase === "visible" ? "scale(1)" : "scale(0.88)",
        transition: phase === "entering" ? "none" : "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <p
        className="text-3xl md:text-4xl lg:text-5xl leading-snug text-center max-w-4xl text-foreground"
        style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", fontWeight: 400 }}
      >
        {message}
      </p>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [transitionMsg, setTransitionMsg] = useState("");
  const [showTransition, setShowTransition] = useState(false);

  const [destination, setDestination] = useState("");
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [school, setSchool] = useState("");
  const [applicationCycle, setApplicationCycle] = useState("");
  const [country, setCountry] = useState("");
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [customUniversity, setCustomUniversity] = useState("");
  const [intendedMajor, setIntendedMajor] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const showExams = applicationCycle === "2027" || applicationCycle === "2028";

  const toggleUniversity = (name: string) => {
    setSelectedUniversities(prev =>
      prev.includes(name) ? prev.filter(u => u !== name) : [...prev, name]
    );
  };

  const addCustomUniversity = () => {
    const trimmed = customUniversity.trim();
    if (trimmed && !selectedUniversities.includes(trimmed)) {
      setSelectedUniversities(prev => [...prev, trimmed]);
      setCustomUniversity("");
    }
  };

  const toggleExam = (value: string) => {
    setSelectedExams(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]
    );
  };

  const advanceWithMessage = (currentStep: number) => {
    const msg = getTransitionMessage(currentStep, { destination, firstName, selectedUniversities });
    if (!msg) {
      setStep(s => s + 1);
      return;
    }
    setTransitionMsg(msg);
    setShowTransition(true);
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    setStep(s => s + 1);
  };

  const handleNext = () => {
    setError("");
    if (step === 1 && !destination) {
      setError("Please select an option to continue");
      return;
    }
    if (step === 3) {
      try {
        nameSchema.parse(sanitizeInput(firstName));
        nameSchema.parse(sanitizeInput(lastName));
      } catch (err: any) {
        setError(err.errors?.[0]?.message || "Please enter valid names");
        return;
      }
    }
    if (step === 4) {
      if (!school.trim()) {
        setError("Please enter your school");
        return;
      }
      if (!country) {
        setError("Please select your country");
        return;
      }
      if (!applicationCycle) {
        setError("Please select your application cycle");
        return;
      }
    }
    if (step === 5) {
      try {
        emailSchema.parse(sanitizeInput(email));
      } catch (err: any) {
        setError(err.errors?.[0]?.message || "Please enter a valid email address");
        return;
      }
    }
    advanceWithMessage(step);
  };

  const handleSignup = async () => {
    setError("");
    try {
      passwordSchema.parse(password);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Password does not meet requirements");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);
    if (
      checkForMaliciousContent(sanitizedEmail) ||
      checkForMaliciousContent(password) ||
      checkForMaliciousContent(sanitizedFirstName) ||
      checkForMaliciousContent(sanitizedLastName)
    ) {
      setError("Invalid input detected");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sanitizedEmail,
          password,
          confirmPassword,
          userType: "student",
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          country: destination === "US" ? "US" : "MY",
          destination,
          universities: selectedUniversities,
          school,
          applicationCycle,
          studentCountry: country,
          exams: selectedExams,
          intendedMajor,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to sign up");
        return;
      }
      toast({ title: "Account created!", description: "Check your email to verify your account." });
      router.push("/login?signup=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Transition screen ────────────────────────────────────────────────────────
  if (showTransition) {
    return <TransitionScreen message={transitionMsg} onComplete={handleTransitionComplete} />;
  }

  // ─── STEP 2: Full-screen university picker ───────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen with-navbar flex flex-col bg-white">
        <div className="px-10 pt-8 pb-2">
          <ProgressHeader step={step} total={TOTAL_STEPS} />
          <div className="text-center mt-2">
            <h2 className="text-2xl font-bold">Which universities are you interested in?</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Don't worry, you can always change this later
            </p>
            {selectedUniversities.length > 0 && (
              <p className="text-primary text-sm font-semibold mt-1">
                {selectedUniversities.length} selected
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-6">
          {destination === "Other" ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <p className="text-muted-foreground">Type in your dream universities below, then hit Next!</p>
              <div className="flex gap-2 w-full max-w-md">
                <Input
                  placeholder="e.g. University of Toronto"
                  value={customUniversity}
                  onChange={e => setCustomUniversity(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomUniversity(); } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addCustomUniversity} disabled={!customUniversity.trim()}>
                  Add
                </Button>
              </div>
              {selectedUniversities.length > 0 && (
                <div className="flex flex-wrap gap-2 max-w-md">
                  {selectedUniversities.map(name => (
                    <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {name}
                      <button type="button" onClick={() => toggleUniversity(name)} className="hover:text-destructive">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : destination === "Both" ? (
            <div className="space-y-6">
              <div className="flex gap-8">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <span className="text-2xl">🇬🇧</span>
                    <span className="text-lg font-bold text-foreground">UK Universities</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {UK_UNIVERSITIES.map(uni => (
                      <UniLogoCard
                        key={uni.name}
                        uni={uni}
                        selected={selectedUniversities.includes(uni.name)}
                        onClick={() => toggleUniversity(uni.name)}
                        compact
                      />
                    ))}
                  </div>
                </div>
                <div className="w-px bg-border self-stretch" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <span className="text-2xl">🇺🇸</span>
                    <span className="text-lg font-bold text-foreground">US Universities</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {US_UNIVERSITIES.map(uni => (
                      <UniLogoCard
                        key={uni.name}
                        uni={uni}
                        selected={selectedUniversities.includes(uni.name)}
                        onClick={() => toggleUniversity(uni.name)}
                        compact
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom university input */}
              <div className="border-t border-border pt-5">
                <p className="text-sm font-medium text-muted-foreground text-center mb-3">Dream university not here?</p>
                <div className="flex gap-2 max-w-md mx-auto">
                  <Input
                    placeholder="Type your dream university..."
                    value={customUniversity}
                    onChange={e => setCustomUniversity(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomUniversity(); } }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addCustomUniversity} disabled={!customUniversity.trim()}>
                    Add
                  </Button>
                </div>
                {selectedUniversities.filter(name => ![...UK_UNIVERSITIES, ...US_UNIVERSITIES].some(u => u.name === name)).length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {selectedUniversities.filter(name => ![...UK_UNIVERSITIES, ...US_UNIVERSITIES].some(u => u.name === name)).map(name => (
                      <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {name}
                        <button type="button" onClick={() => toggleUniversity(name)} className="hover:text-destructive">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-5 gap-5 max-w-5xl mx-auto">
                {(destination === "UK" ? UK_UNIVERSITIES : US_UNIVERSITIES).map(uni => (
                  <UniLogoCard
                    key={uni.name}
                    uni={uni}
                    selected={selectedUniversities.includes(uni.name)}
                    onClick={() => toggleUniversity(uni.name)}
                  />
                ))}
              </div>

              {/* Custom university input */}
              <div className="border-t border-border pt-5 max-w-md mx-auto">
                <p className="text-sm font-medium text-muted-foreground text-center mb-3">Dream university not here?</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your dream university..."
                    value={customUniversity}
                    onChange={e => setCustomUniversity(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomUniversity(); } }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addCustomUniversity} disabled={!customUniversity.trim()}>
                    Add
                  </Button>
                </div>
                {selectedUniversities.filter(name => ![...UK_UNIVERSITIES, ...US_UNIVERSITIES].some(u => u.name === name)).length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {selectedUniversities.filter(name => ![...UK_UNIVERSITIES, ...US_UNIVERSITIES].some(u => u.name === name)).map(name => (
                      <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {name}
                        <button type="button" onClick={() => toggleUniversity(name)} className="hover:text-destructive">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-white px-10 py-4 flex justify-center gap-3">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="w-36">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handleNext} className="w-36">
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── ALL OTHER STEPS: Card layout ────────────────────────────────────────────
  return (
    <div className="min-h-screen with-navbar flex flex-col items-center justify-center bg-white p-4">
      <div className="relative z-10 max-w-md w-full">
        <ProgressHeader step={step} total={TOTAL_STEPS} />

        <Card className="border border-border shadow-sm">
          <CardContent className="pt-6 pb-6 px-6">

            {/* Step 1: Destination */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">Where are you applying?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Choose your target destination</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {destinationOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDestination(opt.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        destination === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className="mb-1 flex items-center">{opt.icon}</div>
                      <div className="font-semibold text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button onClick={handleNext} className="w-full mt-2">
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 3: Name */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">What's your name?</h2>
                  <p className="text-muted-foreground text-sm mt-1">How should we address you?</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="firstName" type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="pl-10" autoFocus />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="lastName" type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="pl-10" />
                  </div>
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button onClick={handleNext} className="flex-1">Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* Step 4: School, country, application cycle + exams */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">A bit about your studies</h2>
                  <p className="text-muted-foreground text-sm mt-1">Help us tailor your experience</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school">What school are you currently at?</Label>
                  <Input
                    id="school"
                    type="text"
                    placeholder="e.g. Sunway College, ACS International..."
                    value={school}
                    onChange={e => setSchool(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intendedMajor">What do you want to study? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="intendedMajor"
                    type="text"
                    placeholder="e.g. Computer Science, Medicine, Economics..."
                    value={intendedMajor}
                    onChange={e => setIntendedMajor(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">No need to be certain - give us a rough idea</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Where are you from?</Label>
                  <select
                    id="country"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select your country</option>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>When will you be applying?</Label>
                  <div className="flex gap-2 flex-wrap">
                    {APPLICATION_CYCLES.map(cycle => (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setApplicationCycle(cycle)}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          applicationCycle === cycle
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        {cycle}
                      </button>
                    ))}
                  </div>
                </div>

                {showExams && (
                  <div className="space-y-2 pt-1">
                    <Label>Which exams are you doing?</Label>
                    <p className="text-xs text-muted-foreground">Select all that apply</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {EXAM_OPTIONS.map(exam => (
                        <button
                          key={exam.value}
                          type="button"
                          onClick={() => toggleExam(exam.value)}
                          className={`px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${
                            selectedExams.includes(exam.value)
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/40 hover:bg-muted/40"
                          }`}
                        >
                          {exam.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && <p className="text-destructive text-sm">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button onClick={handleNext} className="flex-1">Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* Step 5: Email */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Your email address</h2>
                  <p className="text-muted-foreground text-sm mt-1">We'll send a verification link here</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" autoFocus />
                  </div>
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button onClick={handleNext} className="flex-1">Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* Step 6: Password */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Create a password</h2>
                  <p className="text-muted-foreground text-sm mt-1">Make it strong and memorable</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" autoFocus />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10" />
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button onClick={handleSignup} disabled={isLoading} className="flex-1">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
        </div>
      </div>
    </div>
  );
}
