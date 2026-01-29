"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Users, Send, Eye, Save, Filter, Loader2 } from "lucide-react";

// Admin emails that can access this page
const ADMIN_EMAILS = ["justin@unisphere.my", "admin@unisphere.my", "23torch03@gmail.com"];

interface FilterState {
  userType: string;
  hasPaid: string;
  services: string[];
  region: string[];
  school: string;
  course: string;
  name: string;
}

interface UserPreview {
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export default function AdminEmailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Check admin access
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    userType: "student",
    hasPaid: "false",
    services: [],
    region: [],
    school: "",
    course: "",
    name: "",
  });

  // Email content state
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [campaignName, setCampaignName] = useState("");

  // UI state
  const [matchingUsers, setMatchingUsers] = useState<UserPreview[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  // Fetch matching users when filters change
  useEffect(() => {
    if (isAdmin) {
      fetchMatchingUsers();
    }
  }, [filters, isAdmin]);

  const fetchMatchingUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/email/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });

      if (response.ok) {
        const data = await response.json();
        setMatchingUsers(data.users || []);
        setUserCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setIsLoading(false);
  };

  const handlePreview = () => {
    // Replace template variables with sample data
    const sampleHtml = htmlBody
      .replace(/\{\{first_name\}\}/g, "John")
      .replace(/\{\{last_name\}\}/g, "Doe")
      .replace(/\{\{email\}\}/g, "john@example.com");
    setPreviewHtml(sampleHtml);
  };

  const handleSendTest = async () => {
    if (!user?.email) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/admin/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          subject,
          htmlBody,
        }),
      });

      if (response.ok) {
        toast({
          title: "Test email sent!",
          description: `Check your inbox at ${user.email}`,
        });
      } else {
        let message = "Failed to send test email";
        try {
          const data = await response.json();
          if (data?.details) {
            message = data.details;
          } else if (data?.error) {
            message = data.error;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive",
      });
    }
    setIsSending(false);
  };

  const handleSendCampaign = async () => {
    if (!campaignName || !subject || !htmlBody) {
      toast({
        title: "Missing fields",
        description: "Please fill in campaign name, subject, and email body",
        variant: "destructive",
      });
      return;
    }

    if (userCount === 0) {
      toast({
        title: "No recipients",
        description: "No users match your current filters",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${userCount} users?`
    );
    if (!confirmed) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/admin/email/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          subject,
          htmlBody,
          filters,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Campaign started!",
          description: `Sending to ${data.totalRecipients} users`,
        });
        // Reset form
        setCampaignName("");
        setSubject("");
        setHtmlBody(DEFAULT_EMAIL_TEMPLATE);
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start campaign",
        variant: "destructive",
      });
    }
    setIsSending(false);
  };

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Email Marketing Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Send targeted emails to users based on their profile and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Filters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Segment Filters
            </CardTitle>
            <CardDescription>
              Filter users to target specific segments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Type */}
            <div className="space-y-2">
              <Label>User Type</Label>
              <Select
                value={filters.userType}
                onValueChange={(v) => setFilters({ ...filters, userType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Students Only</SelectItem>
                  <SelectItem value="tutor">Tutors Only</SelectItem>
                  <SelectItem value="all">All Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={filters.hasPaid}
                onValueChange={(v) => setFilters({ ...filters, hasPaid: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Non-paying users</SelectItem>
                  <SelectItem value="true">Paid users</SelectItem>
                  <SelectItem value="any">All users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Region (from survey) */}
            <div className="space-y-2">
              <Label>Target Region (Survey)</Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: "UK", label: "UK" },
                  { value: "US", label: "US" },
                  { value: "BOTH", label: "Both UK & US" },
                  { value: "UNSURE", label: "Not sure yet" },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`region-${option.value}`}
                      checked={filters.region.includes(option.value)}
                      onCheckedChange={(checked) => {
                        setFilters({
                          ...filters,
                          region: checked
                            ? [...filters.region, option.value]
                            : filters.region.filter((x) => x !== option.value),
                        });
                      }}
                    />
                    <label htmlFor={`region-${option.value}`} className="text-sm">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Services Interested */}
            <div className="space-y-2">
              <Label>Services Interested (Survey)</Label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {[
                  "US Admissions",
                  "UK Admissions",
                  "UK Entrance Tests",
                  "Extracurricular Building",
                  "SAT/ACT",
                  "A-Level Tutoring",
                  "IB Tutoring",
                ].map((s) => (
                  <div key={s} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${s}`}
                      checked={filters.services.includes(s)}
                      onCheckedChange={(checked) => {
                        setFilters({
                          ...filters,
                          services: checked
                            ? [...filters.services, s]
                            : filters.services.filter((x) => x !== s),
                        });
                      }}
                    />
                    <label htmlFor={`service-${s}`} className="text-sm">
                      {s}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Matching Users Count */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Matching users:
                </span>
                <Badge variant="secondary" className="text-lg px-3">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    userCount
                  )}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Email Composer */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compose Email</CardTitle>
            <CardDescription>
              Use {"{{first_name}}"}, {"{{last_name}}"}, {"{{email}}"} for
              personalization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="compose">
              <TabsList className="mb-4">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="preview" onClick={handlePreview}>
                  Preview
                </TabsTrigger>
                <TabsTrigger value="recipients">Recipients</TabsTrigger>
              </TabsList>

              <TabsContent value="compose" className="space-y-4">
                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input
                    id="campaignName"
                    placeholder="e.g., January 2026 Promo"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Start your tutoring journey with Unisphere"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {/* HTML Body */}
                <div className="space-y-2">
                  <Label htmlFor="htmlBody">Email Body (HTML)</Label>
                  <Textarea
                    id="htmlBody"
                    className="font-mono text-sm min-h-[400px]"
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={handlePreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendTest}
                    disabled={isSending || !subject}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Test to Me
                  </Button>
                  <Button
                    onClick={handleSendCampaign}
                    disabled={isSending || userCount === 0}
                    className="ml-auto"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send to {userCount} Users
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="preview">
                <div className="border rounded-lg p-4 bg-white min-h-[500px]">
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm text-muted-foreground">Subject:</p>
                    <p className="font-medium">{subject || "(No subject)"}</p>
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: previewHtml || htmlBody,
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="recipients">
                <div className="border rounded-lg p-4 max-h-[500px] overflow-y-auto">
                  <p className="text-sm text-muted-foreground mb-4">
                    Showing first 100 matching users:
                  </p>
                  <div className="space-y-2">
                    {matchingUsers.slice(0, 100).map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 border-b"
                      >
                        <div>
                          <p className="font-medium">
                            {u.first_name && u.last_name
                              ? `${u.first_name} ${u.last_name}`
                              : "No name"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Default email template
const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', sans-serif; background: #f7fafc; color: #2d3748; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <h1 style="color: #2c5282;">Hey {{first_name}}! 👋</h1>

    <p>We noticed you signed up for Unisphere but haven't started your tutoring journey yet.</p>

    <p>Our tutors are ready to help you with:</p>
    <ul>
      <li>📚 IB, A-Levels, SAT preparation</li>
      <li>🎓 University application guidance</li>
      <li>💡 One-on-one personalized sessions</li>
    </ul>

    <p style="background: #f0fff4; border-left: 4px solid #38a169; padding: 16px; margin: 24px 0;">
      <strong>🎉 Special Offer:</strong> Get started today and receive a bonus session credit!
    </p>

    <p>
      <a href="https://unisphere.my/credits" style="background:#007396;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;display:inline-block;">Get Started Now</a>
    </p>

    <p style="font-size: 13px; color: #718096; margin-top: 32px;">
      &copy; 2025 Unisphere. All rights reserved.<br>
      <a href="https://unisphere.my/unsubscribe" style="color: #718096;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
