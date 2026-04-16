"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mail,
  Eye,
  Send,
  Users,
  ArrowLeft,
  Loader2,
  FileText,
  X,
  Search,
  User,
  Check,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  title: string;
  description: string;
  fileName: string;
  subject: string;
  createdAt: string;
  category: string;
}

interface UserPreview {
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface FilterState {
  userType: string;
  hasPaid: string;
  services: string[];
  region: string[];
  school: string;
  course: string;
  name: string;
}

interface AudienceSegment {
  id: string;
  label: string;
  description: string;
  emoji: string;
  category: "core" | "destination" | "school" | "services";
  filters: FilterState;
}

type SendMode = "group" | "individual";

const EMPTY_FILTERS: FilterState = {
  userType: "student",
  hasPaid: "any",
  services: [],
  region: [],
  school: "",
  course: "",
  name: "",
};

const AUDIENCE_SEGMENTS: AudienceSegment[] = [
  // Core
  {
    id: "all-students",
    label: "All Students",
    description: "Every registered student on the platform",
    emoji: "🎓",
    category: "core",
    filters: { ...EMPTY_FILTERS, userType: "student", hasPaid: "any" },
  },
  {
    id: "paid-students",
    label: "Paid Students",
    description: "Students who have purchased credits",
    emoji: "💳",
    category: "core",
    filters: { ...EMPTY_FILTERS, userType: "student", hasPaid: "true" },
  },
  {
    id: "free-students",
    label: "Free Students",
    description: "Students who have never purchased credits",
    emoji: "🆓",
    category: "core",
    filters: { ...EMPTY_FILTERS, userType: "student", hasPaid: "false" },
  },
  {
    id: "tutors",
    label: "All Tutors",
    description: "Everyone on the tutor roster",
    emoji: "📚",
    category: "core",
    filters: { ...EMPTY_FILTERS, userType: "tutor" },
  },
  {
    id: "everyone",
    label: "Everyone",
    description: "All students and tutors on the platform",
    emoji: "🌐",
    category: "core",
    filters: { ...EMPTY_FILTERS, userType: "any" },
  },

  // Destination
  {
    id: "us-focused",
    label: "US Applicants",
    description: "Students applying to US universities",
    emoji: "🇺🇸",
    category: "destination",
    filters: { ...EMPTY_FILTERS, region: ["US"] },
  },
  {
    id: "uk-focused",
    label: "UK Applicants",
    description: "Students applying to UK universities",
    emoji: "🇬🇧",
    category: "destination",
    filters: { ...EMPTY_FILTERS, region: ["UK"] },
  },
  {
    id: "us-and-uk",
    label: "US & UK",
    description: "Students applying to both US and UK",
    emoji: "🌍",
    category: "destination",
    filters: { ...EMPTY_FILTERS, region: ["BOTH"] },
  },
  {
    id: "undecided-dest",
    label: "Undecided Destination",
    description: "Students unsure of where they want to apply",
    emoji: "🤷",
    category: "destination",
    filters: { ...EMPTY_FILTERS, region: ["UNSURE"] },
  },

  // Schools
  {
    id: "school-gardens",
    label: "Gardens Int'l School",
    description: "Students from Gardens International School",
    emoji: "🌿",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Gardens" },
  },
  {
    id: "school-iskl",
    label: "ISKL",
    description: "Int'l School of Kuala Lumpur students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "ISKL" },
  },
  {
    id: "school-alice-smith",
    label: "Alice Smith School",
    description: "Alice Smith School students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Alice Smith" },
  },
  {
    id: "school-taylors",
    label: "Taylor's College",
    description: "Taylor's College and Taylor's University students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Taylor" },
  },
  {
    id: "school-mkis",
    label: "Mont Kiara Int'l",
    description: "Mont Kiara International School students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Mont Kiara" },
  },
  {
    id: "school-nexus",
    label: "Nexus Int'l School",
    description: "Nexus International School students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Nexus" },
  },
  {
    id: "school-epsom",
    label: "Epsom College Malaysia",
    description: "Epsom College Malaysia students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Epsom" },
  },
  {
    id: "school-marlborough",
    label: "Marlborough College",
    description: "Marlborough College Malaysia students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Marlborough" },
  },
  {
    id: "school-ktj",
    label: "KTJ",
    description: "Kolej Tuanku Ja'afar students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "KTJ" },
  },
  {
    id: "school-sunway",
    label: "Sunway College",
    description: "Sunway College and Sunway University students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Sunway" },
  },
  {
    id: "school-help",
    label: "HELP University",
    description: "HELP University students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "HELP" },
  },
  {
    id: "school-srikdu",
    label: "Sri KDU",
    description: "Sri KDU Schools students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Sri KDU" },
  },
  {
    id: "school-tenby",
    label: "Tenby Schools",
    description: "Tenby International School students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Tenby" },
  },
  {
    id: "school-kl-high",
    label: "KL High",
    description: "Kuala Lumpur High School (KL High) students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "KL High" },
  },
  {
    id: "school-piyal",
    label: "Piyal International",
    description: "Piyal International School students",
    emoji: "🏫",
    category: "school",
    filters: { ...EMPTY_FILTERS, school: "Piyal" },
  },

  // Services
  {
    id: "svc-essay",
    label: "Essay Help",
    description: "Students seeking essay and personal statement help",
    emoji: "✍️",
    category: "services",
    filters: { ...EMPTY_FILTERS, services: ["essay"] },
  },
  {
    id: "svc-interview",
    label: "Interview Prep",
    description: "Students preparing for admissions interviews",
    emoji: "🎤",
    category: "services",
    filters: { ...EMPTY_FILTERS, services: ["interview"] },
  },
  {
    id: "svc-extracurricular",
    label: "Extracurriculars",
    description: "Students building their extracurricular profile",
    emoji: "⭐",
    category: "services",
    filters: { ...EMPTY_FILTERS, services: ["extracurricular"] },
  },
  {
    id: "svc-scholarship",
    label: "Scholarships",
    description: "Students looking for scholarship guidance",
    emoji: "🏆",
    category: "services",
    filters: { ...EMPTY_FILTERS, services: ["scholarship"] },
  },
  {
    id: "svc-counseling",
    label: "General Counseling",
    description: "Students interested in general admissions counseling",
    emoji: "💬",
    category: "services",
    filters: { ...EMPTY_FILTERS, services: ["counsel"] },
  },
];

const CATEGORY_LABELS: Record<AudienceSegment["category"] | "all", string> = {
  all: "All",
  core: "Students & Tutors",
  destination: "By Destination",
  school: "By School",
  services: "By Service",
};

function categoryColor(category: string) {
  switch (category) {
    case "announcement": return "bg-blue-50 text-blue-700 border-blue-200";
    case "marketing": return "bg-purple-50 text-purple-700 border-purple-200";
    case "re-engagement": return "bg-amber-50 text-amber-700 border-amber-200";
    case "event": return "bg-green-50 text-green-700 border-green-200";
    case "reminder": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

export default function AdminEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateHtml, setTemplateHtml] = useState("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [showSendFlow, setShowSendFlow] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Group mode
  const [sendMode, setSendMode] = useState<SendMode>("group");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<AudienceSegment["category"] | "all">("all");
  const [selectedSegment, setSelectedSegment] = useState<AudienceSegment | null>(null);
  const [segmentCount, setSegmentCount] = useState<number | null>(null);
  const [isLoadingSegmentCount, setIsLoadingSegmentCount] = useState(false);
  const [segmentPreview, setSegmentPreview] = useState<UserPreview[]>([]);

  // Individual mode
  const [individualSearch, setIndividualSearch] = useState("");
  const [individualResults, setIndividualResults] = useState<UserPreview[]>([]);
  const [selectedIndividual, setSelectedIndividual] = useState<UserPreview | null>(null);
  const [isSearchingIndividual, setIsSearchingIndividual] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Confirm send dialog
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [pendingRecipientLabel, setPendingRecipientLabel] = useState("");
  const [pendingTemplateTitle, setPendingTemplateTitle] = useState("");

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch("/api/admin/email/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
    setIsLoadingTemplates(false);
  };

  const openTemplate = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsLoadingTemplate(true);
    setShowSendFlow(false);
    setSendResult(null);
    try {
      const res = await fetch(`/api/admin/email/templates/${template.id}`);
      if (res.ok) {
        const data = await res.json();
        setTemplateHtml(data.htmlContent || "");
      }
    } catch (err) {
      console.error("Failed to fetch template:", err);
    }
    setIsLoadingTemplate(false);
  };

  const closeTemplate = () => {
    setSelectedTemplate(null);
    setTemplateHtml("");
    setShowSendFlow(false);
    setSendResult(null);
    setSelectedSegment(null);
    setSegmentCount(null);
    setSelectedIndividual(null);
    setIndividualSearch("");
    setIndividualResults([]);
  };

  const openSendFlow = () => {
    setShowSendFlow(!showSendFlow);
    setSendResult(null);
    setSelectedSegment(null);
    setSegmentCount(null);
    setSelectedIndividual(null);
    setIndividualSearch("");
    setIndividualResults([]);
  };

  // Load recipient count when a segment is selected
  const loadSegmentCount = useCallback(async (segment: AudienceSegment) => {
    setIsLoadingSegmentCount(true);
    setSegmentCount(null);
    setSegmentPreview([]);
    try {
      const res = await fetch("/api/admin/email/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: segment.filters }),
      });
      if (res.ok) {
        const data = await res.json();
        setSegmentCount(data.count || 0);
        setSegmentPreview(data.users?.slice(0, 8) || []);
      }
    } catch (err) {
      console.error("Failed to load segment count:", err);
    }
    setIsLoadingSegmentCount(false);
  }, []);

  const selectSegment = (segment: AudienceSegment) => {
    setSelectedSegment(segment);
    loadSegmentCount(segment);
  };

  // Individual search (debounced)
  const searchIndividuals = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setIndividualResults([]);
      return;
    }
    setIsSearchingIndividual(true);
    try {
      const filters: FilterState = {
        userType: "any",
        hasPaid: "any",
        services: [],
        region: [],
        school: "",
        course: "",
        name: query.trim(),
      };
      const res = await fetch("/api/admin/email/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      if (res.ok) {
        const data = await res.json();
        setIndividualResults(data.users?.slice(0, 10) || []);
      }
    } catch (err) {
      console.error("Individual search failed:", err);
    }
    setIsSearchingIndividual(false);
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      searchIndividuals(individualSearch);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [individualSearch, searchIndividuals]);

  const handleSend = async () => {
    if (!selectedTemplate) return;
    if (sendMode === "group" && (!selectedSegment || segmentCount === 0)) return;
    if (sendMode === "individual" && !selectedIndividual) return;

    const recipientLabel = sendMode === "individual"
      ? `${selectedIndividual!.first_name || selectedIndividual!.email} (${selectedIndividual!.email})`
      : `${segmentCount} people in "${selectedSegment!.label}"`;

    setPendingRecipientLabel(recipientLabel);
    setPendingTemplateTitle(selectedTemplate.title);
    setShowSendConfirm(true);
  };

  const handleConfirmedSend = async () => {
    if (!selectedTemplate) return;
    setShowSendConfirm(false);
    setIsSending(true);
    setSendResult(null);

    try {
      const body = sendMode === "individual"
        ? {
            campaignName: selectedTemplate.title,
            subject: selectedTemplate.subject,
            htmlBody: templateHtml,
            specificEmails: [selectedIndividual!.email],
          }
        : {
            campaignName: selectedTemplate.title,
            subject: selectedTemplate.subject,
            htmlBody: templateHtml,
            filters: selectedSegment!.filters,
          };

      const res = await fetch("/api/admin/email/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setSendResult({
          success: true,
          message: `Campaign started! Sending to ${data.totalRecipients} recipient(s).`,
        });
      } else {
        throw new Error("Failed to send");
      }
    } catch {
      setSendResult({ success: false, message: "Failed to start campaign. Please try again." });
    }
    setIsSending(false);
  };

  const handleSendTest = async () => {
    if (!selectedTemplate) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/admin/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "joshuaooi105@gmail.com",
          subject: `[TEST] ${selectedTemplate.subject}`,
          htmlBody: templateHtml,
        }),
      });
      if (res.ok) {
        setSendResult({ success: true, message: "Test email sent to your inbox." });
      } else {
        throw new Error("Failed");
      }
    } catch {
      setSendResult({ success: false, message: "Failed to send test email." });
    }
    setIsSending(false);
  };

  const filteredSegments = activeCategoryFilter === "all"
    ? AUDIENCE_SEGMENTS
    : AUDIENCE_SEGMENTS.filter((s) => s.category === activeCategoryFilter);

  const canSend = sendMode === "group"
    ? selectedSegment !== null && segmentCount !== null && segmentCount > 0 && !isLoadingSegmentCount
    : selectedIndividual !== null;

  const recipientCount = sendMode === "group" ? segmentCount : (selectedIndividual ? 1 : null);

  // Template detail view
  if (selectedTemplate) {
    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={closeTemplate}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{selectedTemplate.title}</h1>
              <Badge variant="outline" className={categoryColor(selectedTemplate.category)}>
                {selectedTemplate.category}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">Subject: {selectedTemplate.subject}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSendTest} disabled={isSending || isLoadingTemplate}>
              {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Test
            </Button>
            <Button size="sm" onClick={openSendFlow} disabled={isLoadingTemplate}>
              <Send className="h-4 w-4 mr-2" />
              Send Campaign
            </Button>
          </div>
        </div>

        {/* Send result banner */}
        {sendResult && (
          <div className={`mb-4 px-4 py-3 rounded-lg flex items-center justify-between ${sendResult.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            <p className="text-sm font-medium">{sendResult.message}</p>
            <button onClick={() => setSendResult(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Send flow panel */}
        {showSendFlow && (
          <Card className="mb-6 border-blue-200 bg-blue-50/20">
            <CardContent className="pt-5 pb-5">

              {/* Mode tabs */}
              <div className="flex items-center gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
                {(["group", "individual"] as SendMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setSendMode(mode); setSelectedSegment(null); setSegmentCount(null); setSelectedIndividual(null); setIndividualSearch(""); setIndividualResults([]); }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${sendMode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {mode === "group" ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    {mode === "group" ? "Send to Group" : "Send to Individual"}
                  </button>
                ))}
              </div>

              {/* Group mode */}
              {sendMode === "group" && (
                <div>
                  {/* Category filter pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(["all", "core", "destination", "school", "services"] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategoryFilter(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeCategoryFilter === cat ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>

                  {/* Segment grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4 max-h-72 overflow-y-auto pr-1">
                    {filteredSegments.map((segment) => {
                      const isSelected = selectedSegment?.id === segment.id;
                      return (
                        <button
                          key={segment.id}
                          onClick={() => selectSegment(segment)}
                          className={`text-left p-3 rounded-xl border transition-all ${isSelected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="text-lg leading-none">{segment.emoji}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />}
                          </div>
                          <p className={`text-xs font-semibold leading-snug mb-0.5 ${isSelected ? "text-blue-700" : "text-gray-800"}`}>{segment.label}</p>
                          <p className="text-xs text-gray-400 leading-snug line-clamp-2">{segment.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected segment info */}
                  {selectedSegment && (
                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-blue-200">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{selectedSegment.emoji} {selectedSegment.label}</p>
                        {isLoadingSegmentCount ? (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Loader2 className="h-3 w-3 animate-spin" /> Counting recipients...</p>
                        ) : segmentCount !== null ? (
                          <div>
                            <p className="text-xs text-gray-500 mt-0.5">{segmentCount} recipient{segmentCount !== 1 ? "s" : ""}</p>
                            {segmentPreview.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {segmentPreview.map((u, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white border text-gray-600">
                                    {u.first_name || u.email.split("@")[0]}
                                  </span>
                                ))}
                                {segmentCount > segmentPreview.length && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">+{segmentCount - segmentPreview.length} more</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        onClick={handleSend}
                        disabled={!canSend || isSending}
                        className="bg-green-600 hover:bg-green-700 shrink-0"
                      >
                        {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Send to {segmentCount ?? "..."}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Individual mode */}
              {sendMode === "individual" && (
                <div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={individualSearch}
                      onChange={(e) => { setIndividualSearch(e.target.value); setSelectedIndividual(null); }}
                      placeholder="Search by name or email..."
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                    {isSearchingIndividual && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {/* Search results */}
                  {individualResults.length > 0 && !selectedIndividual && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 bg-white">
                      {individualResults.map((user, i) => (
                        <button
                          key={i}
                          onClick={() => { setSelectedIndividual(user); setIndividualResults([]); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0 border-gray-100"
                        >
                          <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.first_name || user.email.split("@")[0]}
                            </p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {individualSearch.length >= 2 && !isSearchingIndividual && individualResults.length === 0 && !selectedIndividual && (
                    <p className="text-sm text-gray-400 mb-4">No users found for &quot;{individualSearch}&quot;</p>
                  )}

                  {/* Selected individual */}
                  {selectedIndividual && (
                    <div className="flex items-center justify-between gap-4 p-3 bg-white border border-gray-200 rounded-lg mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {selectedIndividual.first_name && selectedIndividual.last_name
                              ? `${selectedIndividual.first_name} ${selectedIndividual.last_name}`
                              : selectedIndividual.first_name || selectedIndividual.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-gray-400">{selectedIndividual.email}</p>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedIndividual(null); setIndividualSearch(""); }} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {selectedIndividual && (
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSend}
                        disabled={!canSend || isSending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Send to {selectedIndividual.first_name || "this user"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Email preview */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3 bg-gray-50 rounded-t-lg flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Email Preview</span>
            </div>
            {isLoadingTemplate ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
              </div>
            ) : (
              <div className="p-6 flex justify-center bg-gray-100">
                <div className="bg-white shadow-sm max-w-[700px] w-full" dangerouslySetInnerHTML={{ __html: templateHtml }} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Template list view
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Emails</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and send email templates to your students.</p>
      </div>

      {isLoadingTemplates ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-24">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No email templates yet</h3>
          <p className="text-sm text-gray-400">Email templates will appear here once created.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-300"
              onClick={() => openTemplate(template)}
            >
              <CardContent className="p-5">
                <div className="w-full h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-4 flex items-center justify-center border overflow-hidden">
                  <iframe
                    srcDoc={`<style>body{transform:scale(0.25);transform-origin:top left;width:400%;pointer-events:none;overflow:hidden;margin:0;}</style>`}
                    className="w-full h-full pointer-events-none border-0"
                    title={template.title}
                    sandbox=""
                    tabIndex={-1}
                  />
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{template.title}</h3>
                  <Badge variant="outline" className={`text-xs shrink-0 ${categoryColor(template.category)}`}>{template.category}</Badge>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{template.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Subject: {template.subject}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">Created {template.createdAt}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send &ldquo;{pendingTemplateTitle}&rdquo;</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the email to{" "}
              <strong>{pendingRecipientLabel}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedSend}
              className="bg-[#128ca0] hover:bg-[#0e6b7a]"
            >
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
