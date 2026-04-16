"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap, School, MapPin, ArrowRight, Users } from "lucide-react";
import { getInitials } from "@/utils/nameUtils";
import { formatDistanceToNow } from "date-fns";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  school_name: string | null;
  year: string | null;
  intended_major: string | null;
  intended_universities: string | null;
  application_cycle: string | null;
  countries_to_apply: string | null;
  bio: string | null;
  conversation_id: string | null;
  last_message_at: string | null;
}

export default function MyStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isTutor = user?.role === "tutor";

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isTutor) {
      router.push("/dashboard");
      return;
    }

    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/tutor/students", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch students");
        }

        const data = await response.json();
        setStudents(data.students || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user, authLoading, isTutor, router]);

  const filteredStudents = students.filter((student) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    return (
      fullName.includes(query) ||
      student.school_name?.toLowerCase().includes(query) ||
      student.intended_major?.toLowerCase().includes(query) ||
      student.intended_universities?.toLowerCase().includes(query)
    );
  });

  if (authLoading || loading) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-72 bg-muted animate-pulse rounded-lg mt-2" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-5xl mx-auto text-center py-16">
          <p className="text-muted-foreground">Failed to load students. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-7 w-7 text-[#128ca0]" />
            My Students
          </h1>
          <p className="text-muted-foreground mt-1">
            {students.length} student{students.length !== 1 ? "s" : ""} have reached out to you
          </p>
        </div>

        {/* Search */}
        {students.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, school, or major..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        )}

        {/* Student Cards */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {students.length === 0
                ? "No students yet"
                : "No students match your search"}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {students.length === 0
                ? "Students who message you will appear here."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <Link
                key={student.id}
                href={`/dashboard/students/${student.id}`}
                className="block group"
              >
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:bg-accent/50 hover:border-[#128ca0]/30 transition-all cursor-pointer">
                  <Avatar className="h-12 w-12 border border-border/40 shadow-sm flex-shrink-0">
                    <AvatarImage src={student.avatar_url || undefined} alt={`${student.first_name} ${student.last_name}`} />
                    <AvatarFallback className="bg-gradient-to-br from-[#128ca0]/20 to-[#128ca0]/5 text-[#128ca0] font-medium">
                      {getInitials({ first_name: student.first_name, last_name: student.last_name } as any)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {student.first_name} {student.last_name}
                      </h3>
                      {student.countries_to_apply && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          <MapPin className="h-3 w-3 mr-1" />
                          {student.countries_to_apply}
                        </Badge>
                      )}
                      {student.application_cycle && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {student.application_cycle}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {student.school_name && (
                        <span className="flex items-center gap-1 truncate">
                          <School className="h-3.5 w-3.5 flex-shrink-0" />
                          {student.school_name}
                          {student.year ? ` (${student.year})` : ""}
                        </span>
                      )}
                      {student.intended_major && (
                        <span className="flex items-center gap-1 truncate">
                          <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" />
                          {student.intended_major}
                        </span>
                      )}
                    </div>

                    {student.intended_universities && (
                      <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                        Targeting: {student.intended_universities}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {student.last_message_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(student.last_message_at), { addSuffix: true })}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-[#128ca0] transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
