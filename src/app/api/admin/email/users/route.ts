import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

// Admin emails that can access this endpoint
const ADMIN_EMAILS = ["joshuaooi105@gmail.com", "ghayuan.ng@gmail.com", "jjzlee018@gmail.com", "justin@unisphere.my", "admin@unisphere.my", "23torch03@gmail.com"];

interface FilterState {
  userType: string;
  hasPaid: string;
  services: string[];
  region: string[];
  school: string;
  course: string;
  name: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const authClient = await createRouteHandlerClientWithCookies();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { filters, specificEmails } = body as { filters?: FilterState; specificEmails?: string[] };

    // If specific emails are provided, look them up directly and return
    if (specificEmails && specificEmails.length > 0) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: users } = await supabase
        .from("users")
        .select("id, email")
        .in("email", specificEmails);

      if (!users || users.length === 0) {
        return NextResponse.json({ users: [], count: 0 });
      }

      const userIds = users.map((u) => u.id);
      const { data: studentProfiles } = await supabase
        .from("student_profile")
        .select("id, first_name, last_name")
        .in("id", userIds);
      const { data: tutorProfiles } = await supabase
        .from("tutor_profile")
        .select("id, first_name, last_name")
        .in("id", userIds);

      const studentProfileMap = new Map(studentProfiles?.map((p) => [p.id, p]) || []);
      const tutorProfileMap = new Map(tutorProfiles?.map((p) => [p.id, p]) || []);

      const result = users.map((u) => ({
        email: u.email,
        first_name: studentProfileMap.get(u.id)?.first_name || tutorProfileMap.get(u.id)?.first_name || null,
        last_name: studentProfileMap.get(u.id)?.last_name || tutorProfileMap.get(u.id)?.last_name || null,
      }));

      return NextResponse.json({ users: result, count: result.length });
    }

    if (!filters) {
      return NextResponse.json({ error: "Missing filters" }, { status: 400 });
    }

    // Use service role client for full access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build the query based on filters
    let query = supabase.from("users").select("id, email, is_tutor, has_access");

    // Filter by user type
    if (filters.userType === "student") {
      query = query.eq("is_tutor", false);
    } else if (filters.userType === "tutor") {
      query = query.eq("is_tutor", true);
    }

    // Filter by payment status
    if (filters.hasPaid === "true") {
      query = query.eq("has_access", true);
    } else if (filters.hasPaid === "false") {
      query = query.eq("has_access", false);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ users: [], count: 0 });
    }

    const userIds = users.map((u) => u.id);

    // Get student profiles for names
    const { data: studentProfiles } = await supabase
      .from("student_profile")
      .select("id, first_name, last_name")
      .in("id", userIds);

    // Get tutor profiles for names
    const { data: tutorProfiles } = await supabase
      .from("tutor_profile")
      .select("id, first_name, last_name")
      .in("id", userIds);

    const schoolFilter = filters.school?.trim() || "";
    const courseFilter = filters.course?.trim() || "";
    const nameFilter = filters.name?.trim() || "";

    const hasSurveyFilters =
      filters.services.length > 0 ||
      filters.region.length > 0 ||
      schoolFilter.length > 0 ||
      courseFilter.length > 0 ||
      nameFilter.length > 0;

    // Get survey responses for segment filtering when needed
    const { data: surveyResponses } = hasSurveyFilters
      ? await supabase
        .from("survey_responses")
        .select("user_id, region, services, school, course, name")
        .in("user_id", userIds)
      : { data: null };

    // Get unsubscribed emails
    const { data: unsubscribes } = await supabase
      .from("email_unsubscribes")
      .select("email");

    const unsubscribedEmails = new Set(unsubscribes?.map((u) => u.email) || []);

    // Create lookup maps
    const studentProfileMap = new Map(
      studentProfiles?.map((p) => [p.id, p]) || []
    );
    const tutorProfileMap = new Map(
      tutorProfiles?.map((p) => [p.id, p]) || []
    );
    const surveyMap = new Map(
      surveyResponses?.map((s) => [s.user_id, s]) || []
    );

    const normalizeRegion = (value?: string | null) => {
      if (!value) return "";
      const normalized = value.trim().toUpperCase();
      if (normalized.includes("BOTH")) return "BOTH";
      if (normalized.includes("UNSURE") || normalized.includes("NOT SURE")) {
        return "UNSURE";
      }
      if (normalized === "UK" || normalized.includes("UK")) return "UK";
      if (normalized === "US" || normalized.includes("US")) return "US";
      return normalized;
    };

    const regionFilters = filters.region.map((r) => normalizeRegion(r));

    // Filter users based on all criteria
    const filteredUsers = users.filter((user) => {
      // Exclude unsubscribed users
      if (unsubscribedEmails.has(user.email)) {
        return false;
      }

      // Exclude test emails
      if (
        user.email.includes("test") ||
        user.email === "admin@unisphere.my"
      ) {
        return false;
      }

      const studentProfile = studentProfileMap.get(user.id);
      const tutorProfile = tutorProfileMap.get(user.id);
      const survey = surveyMap.get(user.id);

      if (hasSurveyFilters) {
        if (!survey) {
          return false;
        }

        // Region filter (from survey)
        if (filters.region.length > 0) {
          const userRegion = normalizeRegion(survey?.region);
          if (!userRegion || !regionFilters.includes(userRegion)) {
            return false;
          }
        }

        // Services filter (from survey)
        if (filters.services.length > 0) {
          const userServices = survey?.services || [];
          const hasMatchingService = filters.services.some((s) =>
            userServices.some((us: string) =>
              us.toLowerCase().includes(s.toLowerCase())
            )
          );
          if (!hasMatchingService) {
            return false;
          }
        }

        // School filter (from survey)
        if (schoolFilter.length > 0) {
          const userSchool = survey?.school || "";
          if (
            !userSchool
            || !userSchool.toLowerCase().includes(schoolFilter.toLowerCase())
          ) {
            return false;
          }
        }

        // Course filter (from survey)
        if (courseFilter.length > 0) {
          const userCourse = survey?.course || "";
          if (
            !userCourse
            || !userCourse.toLowerCase().includes(courseFilter.toLowerCase())
          ) {
            return false;
          }
        }

        // Name filter (from survey)
        if (nameFilter.length > 0) {
          const userName = survey?.name || "";
          if (
            !userName
            || !userName.toLowerCase().includes(nameFilter.toLowerCase())
          ) {
            return false;
          }
        }
      }

      return true;
    });

    // Map to response format with names
    const result = filteredUsers.map((user) => {
      const studentProfile = studentProfileMap.get(user.id);
      const tutorProfile = tutorProfileMap.get(user.id);
      const survey = surveyMap.get(user.id);
      const surveyName = survey?.name?.trim() || "";
      const nameParts = surveyName ? surveyName.split(/\s+/) : [];
      const surveyFirstName = nameParts[0] || null;
      const surveyLastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

      return {
        email: user.email,
        first_name:
          studentProfile?.first_name || tutorProfile?.first_name || surveyFirstName,
        last_name:
          studentProfile?.last_name || tutorProfile?.last_name || surveyLastName,
      };
    });

    return NextResponse.json({
      users: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Error in admin email users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
