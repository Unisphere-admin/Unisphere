"use client";

import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { redirect } from "next/navigation";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import dynamic from "next/dynamic";
import CustomGoalsSection from "@/components/dashboard/CustomGoalsSection";

// Lazy-load the heavy ApplicationTimeline component
const ApplicationTimeline = dynamic(
  () => import("@/components/dashboard/ApplicationTimeline"),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    ),
    ssr: false,
  }
);

export default function TimelinePage() {
  const { user, loading: authLoading } = useAuth();
  const { sessions, loadingSessions } = useSessions();

  if (!authLoading && !user) {
    redirect("/");
  }

  const isStudent = user?.role === "student";

  // For tutors: derive unique students from sessions
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const tutorStudents = useMemo(() => {
    if (isStudent || !sessions) return [];
    const seen = new Set<string>();
    const students: { id: string; name: string }[] = [];
    sessions.forEach((s) => {
      if (s.student_id && !seen.has(s.student_id) && s.student_profile) {
        seen.add(s.student_id);
        students.push({
          id: s.student_id,
          name:
            `${s.student_profile.first_name || ""} ${s.student_profile.last_name || ""}`.trim() ||
            "Student",
        });
      }
    });
    return students;
  }, [sessions, isStudent]);

  // Determine destination from user profile
  const destination = (user as any)?.countries_to_apply || "Both";
  const universities: string[] = (() => {
    try {
      const raw = (user as any)?.universities_to_apply;
      if (!raw) return [];
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return [];
    }
  })();

  const selectedStudentName = tutorStudents.find((s) => s.id === selectedStudentId)?.name;

  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tutor: student selector */}
      {!isStudent && (
        <>
          {loadingSessions ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-28 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </div>
          ) : tutorStudents.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Select a Student
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {tutorStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() =>
                      setSelectedStudentId(
                        selectedStudentId === student.id ? null : student.id
                      )
                    }
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedStudentId === student.id
                        ? "bg-foreground text-background shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                        {student.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {student.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Application Timeline (existing) */}
      {isStudent ? (
        <ApplicationTimeline
          destination={destination}
          universities={universities}
        />
      ) : selectedStudentId ? (
        <ApplicationTimeline
          destination="Both"
          isTutor={true}
          studentName={selectedStudentName}
        />
      ) : !loadingSessions && tutorStudents.length > 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Select a student above to view their application timeline.
        </div>
      ) : !loadingSessions && tutorStudents.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Once students book sessions with you, their application timelines
          will appear here.
        </div>
      ) : null}

      {/* Custom Goals Section */}
      {user && (
        <div className="border-t border-border/40 pt-8">
          <CustomGoalsSection
            studentId={isStudent ? (user as any).id : selectedStudentId}
            isTutor={!isStudent}
            viewerId={(user as any).id}
            studentName={selectedStudentName}
          />
        </div>
      )}
    </div>
  );
}
