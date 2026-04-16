"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  GraduationCap,
  School,
  MapPin,
  BookOpen,
  Trophy,
  Globe,
  Calendar,
  FileText,
  User,
  MessageSquare,
  Briefcase,
} from "lucide-react";
import { getInitials } from "@/utils/nameUtils";

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  age: string | null;
  year: string | null;
  school_name: string | null;
  previous_schools: string[] | string | null;
  current_subjects: string[] | string | null;
  intended_major: string | null;
  intended_universities: string | null;
  application_cycle: string | null;
  countries_to_apply: string | null;
  universities_to_apply: string | null;
  planned_admissions_tests: string | null;
  completed_admissions_tests: string | null;
  planned_admissions_support: string | null;
  university_other_info: string | null;
  a_levels: any[] | null;
  ib_diploma: any[] | null;
  igcse: any[] | null;
  spm: any[] | null;
  extracurricular_activities: any[] | null;
  awards: any[] | null;
  gender: string | null;
  nationality: string | null;
  education_level: string | null;
  graduation_year: string | null;
  academic_achievements: string | null;
  learning_style: string | null;
  career_goals: string | null;
}

function parseJsonField(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

// Converts a field that may be a JSON-stringified array into a readable string list.
// e.g. '["Oxford","Cambridge"]' → "Oxford, Cambridge"
// Falls back to the raw string if it's not JSON.
function parseStringField(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join(", ");
    return String(parsed);
  } catch {
    return value;
  }
}

// Same as above but returns an array (for rendering as badges).
function parseStringFieldAsArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [String(parsed)];
  } catch {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

function SectionCard({ title, icon, children, isEmpty }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  if (isEmpty) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function ExamTable({ title, data, columns }: {
  title: string;
  data: any[];
  columns: { key: string; label: string }[];
}) {
  if (!data || data.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              {columns.map((col) => (
                <th key={col.key} className="text-left py-2 px-3 font-medium text-muted-foreground">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="py-2 px-3">
                    {row[col.key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTutor = user?.role === "tutor";

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isTutor) {
      router.push("/dashboard");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/users/profile/${studentId}?profile_type=student&complete=true`,
          { credentials: "include" }
        );

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You don't have permission to view this profile.");
          }
          if (response.status === 404) {
            throw new Error("Student profile not found.");
          }
          throw new Error("Failed to load profile.");
        }

        const data = await response.json();
        setProfile(data.profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading, isTutor, studentId, router]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-6 w-32 bg-muted animate-pulse rounded-lg mb-6" />
          <div className="h-32 bg-muted animate-pulse rounded-xl mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" asChild className="mb-6">
            <Link href="/dashboard/students">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Students
            </Link>
          </Button>
          <div className="text-center py-16 border border-dashed rounded-xl">
            <p className="text-muted-foreground">{error || "Profile not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Student";
  const subjects = parseJsonField(profile.current_subjects);
  const previousSchools = parseJsonField(profile.previous_schools);
  const aLevels = parseJsonField(profile.a_levels);
  const ibDiploma = parseJsonField(profile.ib_diploma);
  const igcse = parseJsonField(profile.igcse);
  const spm = parseJsonField(profile.spm);
  const extracurriculars = parseJsonField(profile.extracurricular_activities);
  const awards = parseJsonField(profile.awards);

  const hasExams = aLevels.length > 0 || ibDiploma.length > 0 || igcse.length > 0 || spm.length > 0;
  const hasUniPlanning = profile.intended_universities || profile.intended_major || profile.universities_to_apply || profile.planned_admissions_tests || profile.completed_admissions_tests;

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/dashboard/students">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Students
          </Link>
        </Button>

        {/* Profile Header */}
        <div className="rounded-xl border border-border/60 bg-card p-6 mb-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 border-2 border-border/40 shadow-md flex-shrink-0">
              <AvatarImage src={profile.avatar_url || undefined} alt={fullName} />
              <AvatarFallback className="bg-gradient-to-br from-[#128ca0]/20 to-[#128ca0]/5 text-[#128ca0] text-xl font-semibold">
                {getInitials({ first_name: profile.first_name, last_name: profile.last_name } as any)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {profile.school_name && (
                  <Badge variant="secondary" className="text-xs">
                    <School className="h-3 w-3 mr-1" />
                    {profile.school_name}
                    {profile.year ? ` - ${profile.year}` : ""}
                  </Badge>
                )}
                {profile.countries_to_apply && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {profile.countries_to_apply}
                  </Badge>
                )}
                {profile.application_cycle && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {profile.application_cycle}
                  </Badge>
                )}
                {profile.nationality && (
                  <Badge variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {profile.nationality}
                  </Badge>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* School & Subjects */}
          <SectionCard
            title="School & Subjects"
            icon={<School className="h-4 w-4" />}
            isEmpty={!profile.school_name && subjects.length === 0 && previousSchools.length === 0}
          >
            <div className="space-y-3">
              {profile.school_name && (
                <div>
                  <span className="text-sm text-muted-foreground">Current School:</span>
                  <p className="font-medium">{profile.school_name}{profile.year ? ` (${profile.year})` : ""}</p>
                </div>
              )}
              {previousSchools.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Previous Schools:</span>
                  <p className="font-medium">{previousSchools.join(", ")}</p>
                </div>
              )}
              {subjects.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Current Subjects:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {subjects.map((subject, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{typeof subject === 'string' ? subject : subject.name || subject.subject || JSON.stringify(subject)}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Qualifications & Exams */}
          <SectionCard
            title="Qualifications & Exams"
            icon={<FileText className="h-4 w-4" />}
            isEmpty={!hasExams}
          >
            <ExamTable
              title="A-Levels"
              data={aLevels}
              columns={[
                { key: "subject", label: "Subject" },
                { key: "asGrade", label: "AS Grade" },
                { key: "predictedGrade", label: "Predicted" },
                { key: "achievedGrade", label: "Achieved" },
              ]}
            />
            <ExamTable
              title="IB Diploma"
              data={ibDiploma}
              columns={[
                { key: "subject", label: "Subject" },
                { key: "predictedGrade", label: "Predicted" },
                { key: "achievedGrade", label: "Achieved" },
              ]}
            />
            <ExamTable
              title="IGCSE / GCSE"
              data={igcse}
              columns={[
                { key: "subject", label: "Subject" },
                { key: "achievedGrade", label: "Grade" },
              ]}
            />
            <ExamTable
              title="SPM"
              data={spm}
              columns={[
                { key: "subject", label: "Subject" },
                { key: "achievedGrade", label: "Grade" },
              ]}
            />
          </SectionCard>

          {/* University Planning */}
          <SectionCard
            title="University Application Details"
            icon={<GraduationCap className="h-4 w-4" />}
            isEmpty={!hasUniPlanning}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.intended_major && (
                <div>
                  <span className="text-sm text-muted-foreground">Intended Major</span>
                  <p className="font-medium">{profile.intended_major}</p>
                </div>
              )}
              {profile.intended_universities && (
                <div>
                  <span className="text-sm text-muted-foreground">Intended Universities</span>
                  <p className="font-medium">{profile.intended_universities}</p>
                </div>
              )}
              {profile.universities_to_apply && (
                <div className="md:col-span-2">
                  <span className="text-sm text-muted-foreground">Universities to Apply</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parseStringFieldAsArray(profile.universities_to_apply).map((uni, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{uni}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.planned_admissions_tests && (
                <div>
                  <span className="text-sm text-muted-foreground">Planned Admissions Tests</span>
                  <p className="font-medium">{parseStringField(profile.planned_admissions_tests)}</p>
                </div>
              )}
              {profile.completed_admissions_tests && (
                <div>
                  <span className="text-sm text-muted-foreground">Completed Admissions Tests</span>
                  <p className="font-medium">{parseStringField(profile.completed_admissions_tests)}</p>
                </div>
              )}
              {profile.planned_admissions_support && (
                <div className="md:col-span-2">
                  <span className="text-sm text-muted-foreground">Admissions Support Needed</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parseStringFieldAsArray(profile.planned_admissions_support).map((svc, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{svc}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.university_other_info && (
                <div className="md:col-span-2">
                  <span className="text-sm text-muted-foreground">Additional Info</span>
                  <p className="font-medium">{profile.university_other_info}</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Extracurricular Activities */}
          <SectionCard
            title="Extracurricular Activities"
            icon={<Briefcase className="h-4 w-4" />}
            isEmpty={extracurriculars.length === 0}
          >
            <div className="space-y-3">
              {extracurriculars.map((activity, i) => (
                <div key={i} className="p-3 rounded-lg bg-accent/30 border border-border/30">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{activity.activity || activity.name || "Activity"}</h4>
                    {activity.yearParticipated && (
                      <span className="text-xs text-muted-foreground">{activity.yearParticipated}</span>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Honors & Awards */}
          <SectionCard
            title="Honors & Awards"
            icon={<Trophy className="h-4 w-4" />}
            isEmpty={awards.length === 0}
          >
            <div className="space-y-3">
              {awards.map((award, i) => (
                <div key={i} className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 dark:border-amber-800/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{award.name || award.title || "Award"}</h4>
                    {award.yearAwarded && (
                      <span className="text-xs text-muted-foreground">{award.yearAwarded}</span>
                    )}
                  </div>
                  {award.description && (
                    <p className="text-sm text-muted-foreground mt-1">{award.description}</p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Career Goals & Learning */}
          <SectionCard
            title="Goals & Learning Style"
            icon={<User className="h-4 w-4" />}
            isEmpty={!profile.career_goals && !profile.learning_style && !profile.academic_achievements}
          >
            <div className="space-y-3">
              {profile.career_goals && (
                <div>
                  <span className="text-sm text-muted-foreground">Career Goals</span>
                  <p className="font-medium">{profile.career_goals}</p>
                </div>
              )}
              {profile.learning_style && (
                <div>
                  <span className="text-sm text-muted-foreground">Learning Style</span>
                  <p className="font-medium">{profile.learning_style}</p>
                </div>
              )}
              {profile.academic_achievements && (
                <div>
                  <span className="text-sm text-muted-foreground">Academic Achievements</span>
                  <p className="font-medium">{profile.academic_achievements}</p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
