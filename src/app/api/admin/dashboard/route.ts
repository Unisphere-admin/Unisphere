import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/auth/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const section = req.nextUrl.searchParams.get("section") || "overview";

    switch (section) {
      case "overview": {
        // Fetch ALL payments with pagination for accurate totals
        const fetchAllPayments = async () => {
          const all: any[] = [];
          let from = 0;
          const batchSize = 1000;
          while (true) {
            const { data, error } = await supabase
              .from("processed_stripe_payments")
              .select("id, credits_added, amount_total, currency")
              .range(from, from + batchSize - 1);
            if (error || !data || data.length === 0) break;
            all.push(...data);
            if (data.length < batchSize) break;
            from += batchSize;
          }
          return all;
        }

        // Fetch ALL public users with pagination for accurate breakdowns
        const fetchAllPublicUsers = async () => {
          const all: any[] = [];
          let from = 0;
          const batchSize = 1000;
          while (true) {
            const { data, error } = await supabase
              .from("users")
              .select("id, tokens, has_access, is_tutor")
              .range(from, from + batchSize - 1);
            if (error || !data || data.length === 0) break;
            all.push(...data);
            if (data.length < batchSize) break;
            from += batchSize;
          }
          return all;
        }

        const [
          sessionsRes,
          reviewsRes,
          payments,
          publicUsers,
        ] = await Promise.all([
          supabase.from("tutoring_session").select("id", { count: "exact", head: true }),
          supabase.from("reviews").select("id", { count: "exact", head: true }),
          fetchAllPayments(),
          fetchAllPublicUsers(),
        ]);

        // Get true total user count from auth (includes all signups)
        const { data: authUsersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
        // @ts-ignore - total is in the response
        const totalAuthUsers: number = (authUsersPage as any)?.total ?? publicUsers.length;

        const totalStudents = publicUsers.filter((u) => !u.is_tutor).length;
        const totalTutors = publicUsers.filter((u) => u.is_tutor).length;
        const premiumUsers = publicUsers.filter((u) => u.has_access).length;
        const totalCreditsInSystem = publicUsers.reduce(
          (sum: number, u: any) => sum + (u.tokens || 0),
          0
        );

        const totalRevenue = payments.reduce(
          (sum, p) => sum + (p.amount_total || 0),
          0
        );
        const totalCreditsPurchased = payments.reduce(
          (sum, p) => sum + (p.credits_added || 0),
          0
        );

        return NextResponse.json({
          overview: {
            totalUsers: totalAuthUsers,
            totalStudents,
            totalTutors,
            premiumUsers,
            totalSessions: sessionsRes.count || 0,
            totalReviews: reviewsRes.count || 0,
            totalCreditsInSystem,
            totalCreditsPurchased,
            totalRevenueCents: totalRevenue,
            totalPayments: payments.length,
          },
        });
      }

      case "users-meta": {
        // Return available filter options from the database
        const [cyclesRes, destinationsRes] = await Promise.all([
          supabase
            .from("student_profile")
            .select("application_cycle")
            .not("application_cycle", "is", null),
          supabase
            .from("student_profile")
            .select("countries_to_apply")
            .not("countries_to_apply", "is", null),
        ]);

        const admissionYears = Array.from(
          new Set((cyclesRes.data || []).map((r: any) => r.application_cycle).filter(Boolean))
        ).sort();

        const destinations = Array.from(
          new Set((destinationsRes.data || []).map((r: any) => r.countries_to_apply).filter(Boolean))
        ).sort();

        return NextResponse.json({ admissionYears, destinations });
      }

      case "users": {
        const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
        const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
        const search = req.nextUrl.searchParams.get("search") || "";
        const offset = (page - 1) * limit;

        // Filter params
        const admissionYears = req.nextUrl.searchParams.getAll("admissionYear");
        const destinations = req.nextUrl.searchParams.getAll("destination");
        const hasCreditsFilter = req.nextUrl.searchParams.get("hasCredits");
        const hasPurchasedFilter = req.nextUrl.searchParams.get("hasPurchased");
        const roleFilter = req.nextUrl.searchParams.get("role");
        const isPremiumFilter = req.nextUrl.searchParams.get("isPremium");

        const hasActiveFilters =
          admissionYears.length > 0 ||
          destinations.length > 0 ||
          hasCreditsFilter ||
          hasPurchasedFilter ||
          roleFilter ||
          isPremiumFilter ||
          search;

        // ── NO FILTERS: use auth.admin for complete list ─────────────────────
        if (!hasActiveFilters) {
          const [authResult, publicCountRes] = await Promise.all([
            supabase.auth.admin.listUsers({ page, perPage: limit }) as any,
            supabase.from("users").select("id", { count: "exact", head: true }),
          ]);

          const authData = authResult?.data;
          const authUsers: any[] = authData?.users || [];
          const totalAuthUsers: number =
            authData?.total != null
              ? authData.total
              : (publicCountRes.count ?? authUsers.length);

          if (authUsers.length === 0) {
            return NextResponse.json({ users: [], total: totalAuthUsers, page, limit });
          }

          const userIds = authUsers.map((u: any) => u.id);
          const [publicUsersRes, studentProfiles, tutorProfiles] = await Promise.all([
            supabase
              .from("users")
              .select("id, email, tokens, has_access, is_tutor, created_at, last_sign_in")
              .in("id", userIds),
            supabase
              .from("student_profile")
              .select("id, first_name, last_name, avatar_url, country, countries_to_apply, application_cycle")
              .in("id", userIds),
            supabase
              .from("tutor_profile")
              .select("id, first_name, last_name, avatar_url")
              .in("id", userIds),
          ]);

          const pubMap: Record<string, any> = {};
          for (const u of publicUsersRes.data || []) pubMap[u.id] = u;
          const profMap: Record<string, any> = {};
          for (const p of studentProfiles.data || []) profMap[p.id] = p;
          for (const p of tutorProfiles.data || []) profMap[p.id] = profMap[p.id] || p;

          const enriched = authUsers.map((u: any) => {
            const pub = pubMap[u.id] || {};
            return {
              id: u.id,
              email: u.email || pub.email || "",
              tokens: pub.tokens ?? 0,
              has_access: pub.has_access ?? false,
              is_tutor: pub.is_tutor ?? (u.user_metadata?.is_tutor === true),
              created_at: u.created_at || pub.created_at || null,
              last_sign_in: u.last_sign_in_at || pub.last_sign_in || null,
              profile: profMap[u.id] || null,
            };
          });

          return NextResponse.json({ users: enriched, total: totalAuthUsers, page, limit });
        }

        // ── FILTERED path: build query from public users table ───────────────

        // Step 1: Get IDs matching profile-based filters (admissionYear, destination)
        let profileFilterIds: string[] | null = null;
        if (admissionYears.length > 0 || destinations.length > 0) {
          let profileQuery = supabase.from("student_profile").select("id");
          if (admissionYears.length > 0) {
            profileQuery = profileQuery.in("application_cycle", admissionYears);
          }
          if (destinations.length > 0) {
            profileQuery = profileQuery.in("countries_to_apply", destinations);
          }
          const { data: profiles } = await profileQuery;
          profileFilterIds = (profiles || []).map((p: any) => p.id);
          if (profileFilterIds.length === 0) {
            return NextResponse.json({ users: [], total: 0, page, limit });
          }
        }

        // Step 2: Get purchased user IDs if needed
        let purchasedUserIds: Set<string> | null = null;
        if (hasPurchasedFilter !== null) {
          const { data: paymentData } = await supabase
            .from("processed_stripe_payments")
            .select("user_id");
          purchasedUserIds = new Set((paymentData || []).map((p: any) => p.user_id));
        }

        // Step 3: Build users query with all filters
        let usersQuery = supabase
          .from("users")
          .select("id, email, tokens, has_access, is_tutor, created_at, last_sign_in", {
            count: "exact",
          });

        if (search) usersQuery = usersQuery.ilike("email", `%${search}%`);
        if (roleFilter === "student") usersQuery = usersQuery.eq("is_tutor", false);
        else if (roleFilter === "tutor") usersQuery = usersQuery.eq("is_tutor", true);
        if (hasCreditsFilter === "true") usersQuery = usersQuery.gt("tokens", 0);
        else if (hasCreditsFilter === "false") usersQuery = usersQuery.eq("tokens", 0);
        if (isPremiumFilter === "true") usersQuery = usersQuery.eq("has_access", true);
        if (profileFilterIds !== null) {
          usersQuery = usersQuery.in("id", profileFilterIds);
        }
        if (hasPurchasedFilter === "true" && purchasedUserIds && purchasedUserIds.size > 0) {
          usersQuery = usersQuery.in("id", Array.from(purchasedUserIds));
        } else if (hasPurchasedFilter === "true" && purchasedUserIds && purchasedUserIds.size === 0) {
          return NextResponse.json({ users: [], total: 0, page, limit });
        }
        if (hasPurchasedFilter === "false" && purchasedUserIds && purchasedUserIds.size > 0) {
          usersQuery = usersQuery.not("id", "in", `(${Array.from(purchasedUserIds).join(",")})`);
        }

        usersQuery = usersQuery
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        const { data: users, count } = await usersQuery;

        if (!users || users.length === 0) {
          return NextResponse.json({ users: [], total: count || 0, page, limit });
        }

        const userIds = users.map((u: any) => u.id);

        const [studentProfiles, tutorProfiles] = await Promise.all([
          supabase
            .from("student_profile")
            .select("id, first_name, last_name, avatar_url, country, countries_to_apply, application_cycle")
            .in("id", userIds),
          supabase
            .from("tutor_profile")
            .select("id, first_name, last_name, avatar_url")
            .in("id", userIds),
        ]);

        const profileMap: Record<string, any> = {};
        for (const p of studentProfiles.data || []) profileMap[p.id] = p;
        for (const p of tutorProfiles.data || []) profileMap[p.id] = profileMap[p.id] || p;

        const enrichedUsers = users.map((u: any) => ({
          ...u,
          profile: profileMap[u.id] || null,
          hasPurchased: purchasedUserIds ? purchasedUserIds.has(u.id) : undefined,
        }));

        return NextResponse.json({ users: enrichedUsers, total: count || 0, page, limit });
      }

      case "credits": {
        const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
        const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        // Fetch stripe payments (credit purchases)
        const { data: payments, count: paymentsCount } = await supabase
          .from("processed_stripe_payments")
          .select("*", { count: "exact" })
          .order("processed_at", { ascending: false })
          .range(offset, offset + limit - 1);

        // Fetch credit transfers (lesson payments)
        const { data: transfers, count: transfersCount } = await supabase
          .from("processed_credit_requests")
          .select("*", { count: "exact" })
          .order("processed_at", { ascending: false })
          .range(offset, offset + limit - 1);

        // Get user emails for all referenced user IDs
        const allUserIds = new Set<string>();
        for (const p of payments || []) {
          if (p.user_id) allUserIds.add(p.user_id);
        }
        for (const t of transfers || []) {
          if (t.student_id) allUserIds.add(t.student_id);
          if (t.tutor_id) allUserIds.add(t.tutor_id);
        }

        const { data: userLookup } = await supabase
          .from("users")
          .select("id, email")
          .in("id", Array.from(allUserIds));

        // Also try to get emails from auth for any missing users
        const foundIds = new Set((userLookup || []).map((u: any) => u.id));
        const missingIds = Array.from(allUserIds).filter((id) => !foundIds.has(id));

        const emailMap: Record<string, string> = {};
        for (const u of userLookup || []) {
          emailMap[u.id] = u.email;
        }

        // Fetch missing emails from auth admin API
        for (const id of missingIds) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(id);
            if (authUser?.user?.email) {
              emailMap[id] = authUser.user.email;
            }
          } catch {}
        }

        return NextResponse.json({
          payments: (payments || []).map((p) => ({
            ...p,
            user_email: emailMap[p.user_id] || "Unknown",
          })),
          transfers: (transfers || []).map((t) => ({
            ...t,
            student_email: emailMap[t.student_id] || "Unknown",
            tutor_email: emailMap[t.tutor_id] || "Unknown",
          })),
          paymentsCount: paymentsCount || 0,
          transfersCount: transfersCount || 0,
          page,
          limit,
        });
      }

      case "conversations": {
        const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
        const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        const { data: conversations, count } = await supabase
          .from("conversation")
          .select("id, created_at, updated_at", { count: "exact" })
          .order("updated_at", { ascending: false })
          .range(offset, offset + limit - 1);

        const convoIds = (conversations || []).map((c) => c.id);

        // Get participants for each conversation
        const { data: participants } = await supabase
          .from("conversation_participant")
          .select("conversation_id, user_id")
          .in("conversation_id", convoIds);

        // Get latest message for each conversation
        const { data: latestMessages } = await supabase
          .from("message")
          .select("conversation_id, content, created_at, sender_id")
          .in("conversation_id", convoIds)
          .order("created_at", { ascending: false });

        // Get message counts
        const messageCounts: Record<string, number> = {};
        const latestMessageMap: Record<string, any> = {};
        for (const m of latestMessages || []) {
          messageCounts[m.conversation_id] =
            (messageCounts[m.conversation_id] || 0) + 1;
          if (!latestMessageMap[m.conversation_id]) {
            latestMessageMap[m.conversation_id] = m;
          }
        }

        // Get all user info
        const allUserIds = new Set<string>();
        for (const p of participants || []) {
          allUserIds.add(p.user_id);
        }
        for (const m of latestMessages || []) {
          if (m.sender_id) allUserIds.add(m.sender_id);
        }

        const { data: userLookup } = await supabase
          .from("users")
          .select("id, email, is_tutor")
          .in("id", Array.from(allUserIds));

        const [studentProfiles, tutorProfiles] = await Promise.all([
          supabase
            .from("student_profile")
            .select("id, first_name, last_name")
            .in("id", Array.from(allUserIds)),
          supabase
            .from("tutor_profile")
            .select("id, first_name, last_name")
            .in("id", Array.from(allUserIds)),
        ]);

        const userMap: Record<string, any> = {};
        for (const u of userLookup || []) {
          userMap[u.id] = { email: u.email, is_tutor: u.is_tutor };
        }
        for (const p of studentProfiles.data || []) {
          if (userMap[p.id])
            userMap[p.id].name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        }
        for (const p of tutorProfiles.data || []) {
          if (userMap[p.id])
            userMap[p.id].name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        }

        // Build participant map
        const participantMap: Record<string, any[]> = {};
        for (const p of participants || []) {
          if (!participantMap[p.conversation_id])
            participantMap[p.conversation_id] = [];
          participantMap[p.conversation_id].push(
            userMap[p.user_id] || { email: "Unknown" }
          );
        }

        const enrichedConversations = (conversations || []).map((c) => ({
          ...c,
          participants: participantMap[c.id] || [],
          latestMessage: latestMessageMap[c.id] || null,
          messageCount: messageCounts[c.id] || 0,
          latestMessageSender: latestMessageMap[c.id]
            ? userMap[latestMessageMap[c.id].sender_id] || null
            : null,
        }));

        return NextResponse.json({
          conversations: enrichedConversations,
          total: count || 0,
          page,
          limit,
        });
      }

      case "conversation-messages": {
        const conversationId = req.nextUrl.searchParams.get("conversationId");
        if (!conversationId) {
          return NextResponse.json(
            { error: "conversationId required" },
            { status: 400 }
          );
        }

        const { data: messages } = await supabase
          .from("message")
          .select("id, content, created_at, sender_id")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        // Get sender info
        const senderIdSet = new Set<string>();
        for (const m of messages || []) {
          if (m.sender_id) senderIdSet.add(m.sender_id);
        }
        const senderIds = Array.from(senderIdSet);

        const { data: userLookup } = await supabase
          .from("users")
          .select("id, email, is_tutor")
          .in("id", senderIds);

        const [studentProfiles, tutorProfiles] = await Promise.all([
          supabase
            .from("student_profile")
            .select("id, first_name, last_name")
            .in("id", senderIds),
          supabase
            .from("tutor_profile")
            .select("id, first_name, last_name")
            .in("id", senderIds),
        ]);

        const userMap: Record<string, any> = {};
        for (const u of userLookup || []) {
          userMap[u.id] = { email: u.email, is_tutor: u.is_tutor };
        }
        for (const p of studentProfiles.data || []) {
          if (userMap[p.id])
            userMap[p.id].name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        }
        for (const p of tutorProfiles.data || []) {
          if (userMap[p.id])
            userMap[p.id].name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        }

        const enrichedMessages = (messages || []).map((m) => ({
          ...m,
          sender: userMap[m.sender_id] || { email: "Unknown" },
        }));

        return NextResponse.json({ messages: enrichedMessages });
      }

      case "sessions": {
        const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
        const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        const { data: sessions, count } = await supabase
          .from("tutoring_session")
          .select(
            "id, created_at, updated_at, status, started_at, ended_at, scheduled_for, name, tutor_id, student_id, conversation_id",
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        // Get user info for tutors and students
        const allUserIds = new Set<string>();
        for (const s of sessions || []) {
          if (s.tutor_id) allUserIds.add(s.tutor_id);
          if (s.student_id) allUserIds.add(s.student_id);
        }

        const { data: userLookup } = await supabase
          .from("users")
          .select("id, email")
          .in("id", Array.from(allUserIds));

        const [studentProfiles, tutorProfiles] = await Promise.all([
          supabase
            .from("student_profile")
            .select("id, first_name, last_name")
            .in("id", Array.from(allUserIds)),
          supabase
            .from("tutor_profile")
            .select("id, first_name, last_name")
            .in("id", Array.from(allUserIds)),
        ]);

        const userMap: Record<string, any> = {};
        for (const u of userLookup || []) {
          userMap[u.id] = { email: u.email };
        }
        for (const p of studentProfiles.data || []) {
          if (userMap[p.id])
            userMap[p.id].name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        }
        for (const p of tutorProfiles.data || []) {
          if (userMap[p.id])
            userMap[p.id].name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        }

        const enrichedSessions = (sessions || []).map((s) => ({
          ...s,
          tutor: userMap[s.tutor_id] || { email: "Unknown" },
          student: userMap[s.student_id] || { email: "Unknown" },
        }));

        return NextResponse.json({
          sessions: enrichedSessions,
          total: count || 0,
          page,
          limit,
        });
      }

      case "reviews": {
        const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
        const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        const { data: reviews, count } = await supabase
          .from("reviews")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        const allUserIds = new Set<string>();
        for (const r of reviews || []) {
          if (r.student_id) allUserIds.add(r.student_id);
          if (r.tutor_id) allUserIds.add(r.tutor_id);
        }

        const { data: userLookup } = await supabase
          .from("users")
          .select("id, email")
          .in("id", Array.from(allUserIds));

        const [studentProfiles, tutorProfiles] = await Promise.all([
          supabase
            .from("student_profile")
            .select("id, first_name, last_name")
            .in("id", Array.from(allUserIds)),
          supabase
            .from("tutor_profile")
            .select("id, first_name, last_name")
            .in("id", Array.from(allUserIds)),
        ]);

        const userMap: Record<string, any> = {};
        for (const u of userLookup || []) {
          userMap[u.id] = { email: u.email };
        }
        for (const p of studentProfiles.data || []) {
          if (userMap[p.id])
            userMap[p.id].name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        }
        for (const p of tutorProfiles.data || []) {
          if (userMap[p.id])
            userMap[p.id].name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        }

        const enrichedReviews = (reviews || []).map((r) => ({
          ...r,
          student: userMap[r.student_id] || { email: "Unknown" },
          tutor: userMap[r.tutor_id] || { email: "Unknown" },
        }));

        return NextResponse.json({
          reviews: enrichedReviews,
          total: count || 0,
          page,
          limit,
        });
      }

      case "recent-signups": {
        // Recent signups feed for the admin overview.
        //
        // The public.users table has NO created_at column (only id, email,
        // conversation, email_confirmed_at, is_tutor, tokens, has_access).
        // Real signup time lives in auth.users — so we use the admin API
        // for the canonical sorted-by-newest list, then enrich each row
        // with the public.users record + student_profile + survey_responses
        // we have for that user.
        const limit = Math.min(
          parseInt(req.nextUrl.searchParams.get("limit") || "20"),
          100
        );

        // listUsers returns auth users sorted by created_at desc. We pull
        // a wider page than the limit so we can filter out tutors and
        // still hit the requested count.
        const { data: authPage } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: Math.min(limit * 3, 100),
        });
        const authUsers = authPage?.users || [];

        if (authUsers.length === 0) {
          return NextResponse.json({ signups: [] });
        }

        // Pull public.users / profile / survey rows for ALL the auth users
        // we received, then assemble in the correct order below.
        const allIds = authUsers.map((u: any) => u.id);
        const [publicUsersRes, profilesRes, surveyRes] = await Promise.all([
          supabase
            .from("users")
            .select("id, is_tutor, has_access, tokens")
            .in("id", allIds),
          supabase
            .from("student_profile")
            .select(
              "id, first_name, last_name, avatar_url, country, school, countries_to_apply, application_cycle, survey_completed"
            )
            .in("id", allIds),
          supabase
            .from("survey_responses")
            .select("user_id, school, country, application_cycle, universities, course")
            .in("user_id", allIds),
        ]);

        const publicMap: Record<string, any> = {};
        for (const u of publicUsersRes.data || []) publicMap[u.id] = u;
        const profileMap: Record<string, any> = {};
        for (const p of profilesRes.data || []) profileMap[p.id] = p;
        const surveyMap: Record<string, any> = {};
        for (const s of surveyRes.data || []) surveyMap[s.user_id] = s;

        // Walk auth users (already in newest-first order), drop tutors,
        // stop at limit. is_tutor lives on either public.users.is_tutor
        // or auth.user_metadata.is_tutor, depending on signup flow.
        const signups: any[] = [];
        for (const u of authUsers) {
          if (signups.length >= limit) break;
          const pub = publicMap[u.id] || {};
          const isTutor =
            pub.is_tutor === true || u.user_metadata?.is_tutor === true;
          if (isTutor) continue;

          const profile = profileMap[u.id] || {};
          const survey = surveyMap[u.id];
          signups.push({
            id: u.id,
            email: u.email || "",
            created_at: u.created_at || null,
            has_access: pub.has_access ?? false,
            survey_completed: !!profile.survey_completed,
            first_name: profile.first_name || null,
            last_name: profile.last_name || null,
            avatar_url: profile.avatar_url || null,
            country: profile.country || survey?.country || null,
            school: profile.school || survey?.school || null,
            countries_to_apply:
              profile.countries_to_apply || survey?.country || null,
            application_cycle:
              profile.application_cycle || survey?.application_cycle || null,
            target_unis_preview: Array.isArray(survey?.universities)
              ? survey.universities.slice(0, 3)
              : [],
          });
        }

        return NextResponse.json({ signups });
      }

      case "student-detail": {
        const studentId = req.nextUrl.searchParams.get("studentId");
        if (!studentId) {
          return NextResponse.json(
            { error: "studentId required" },
            { status: 400 }
          );
        }

        // Pull everything we have about this user in parallel. We use
        // maybeSingle() on every row-lookup so a missing record returns
        // null rather than an error — this endpoint must work for any
        // user the admin can click (student, tutor, or auth-only user
        // with no public.users row yet).
        const [
          userRes,
          profileRes,
          tutorRes,
          surveyRes,
          paymentsRes,
          studentSessionsRes,
          tutorSessionsRes,
          authUserRes,
        ] = await Promise.all([
          supabase
            .from("users")
            // public.users does NOT have created_at or last_sign_in.
            // We pull those from auth.users below.
            .select("id, email, tokens, has_access, is_tutor")
            .eq("id", studentId)
            .maybeSingle(),
          supabase
            .from("student_profile")
            .select("*")
            .eq("id", studentId)
            .maybeSingle(),
          supabase
            .from("tutor_profile")
            .select("*")
            .eq("id", studentId)
            .maybeSingle(),
          supabase
            .from("survey_responses")
            .select("*")
            .eq("user_id", studentId)
            .maybeSingle(),
          supabase
            .from("processed_stripe_payments")
            .select("id, amount_total, currency, credits_added, processed_at")
            .eq("user_id", studentId)
            .order("processed_at", { ascending: false })
            .limit(20),
          supabase
            .from("tutoring_session")
            .select("id, status, scheduled_for, name, created_at, tutor_id, student_id")
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("tutoring_session")
            .select("id, status, scheduled_for, name, created_at, tutor_id, student_id")
            .eq("tutor_id", studentId)
            .order("created_at", { ascending: false })
            .limit(20),
          // auth.users — owner of created_at and last_sign_in_at, neither
          // of which exists on public.users. Always fetched in parallel
          // with the rest so the panel can show signup time and last
          // login regardless of whether public.users has a row.
          supabase.auth.admin.getUserById(studentId),
        ]);

        // Combine public.users (tokens / access / role) with auth.users
        // (timestamps) into the `user` payload the panel expects.
        const authUser = (authUserRes as any)?.data?.user || null;
        let user: any = userRes.data
          ? {
              ...userRes.data,
              created_at: authUser?.created_at || null,
              last_sign_in: authUser?.last_sign_in_at || null,
            }
          : null;
        if (!user && authUser) {
          // No public.users row — synthesize from auth alone.
          user = {
            id: authUser.id,
            email: authUser.email || "",
            tokens: 0,
            has_access: false,
            is_tutor: !!authUser.user_metadata?.is_tutor,
            created_at: authUser.created_at || null,
            last_sign_in: authUser.last_sign_in_at || null,
          };
        }

        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Use whichever profile exists: student or tutor.
        const profile = profileRes.data || tutorRes.data || null;

        // For tutors, sessions are listed where THEY are the tutor.
        // For students, sessions are listed where THEY are the student.
        const rawSessions =
          (user.is_tutor ? tutorSessionsRes.data : studentSessionsRes.data) || [];

        // Hydrate counterpart names.
        const counterpartIds = Array.from(
          new Set(
            rawSessions
              .map((s: any) => (user.is_tutor ? s.student_id : s.tutor_id))
              .filter(Boolean)
          )
        );
        let counterpartMap: Record<string, string> = {};
        if (counterpartIds.length > 0) {
          const profileTable = user.is_tutor ? "student_profile" : "tutor_profile";
          const { data: profiles } = await supabase
            .from(profileTable)
            .select("id, first_name, last_name")
            .in("id", counterpartIds);
          for (const p of profiles || []) {
            counterpartMap[p.id] =
              `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";
          }
        }

        const sessions = rawSessions.map((s: any) => ({
          id: s.id,
          status: s.status,
          scheduled_for: s.scheduled_for,
          name: s.name,
          created_at: s.created_at,
          tutor_name: user.is_tutor
            ? counterpartMap[s.student_id] || "Unknown student"
            : counterpartMap[s.tutor_id] || "Unknown tutor",
        }));

        return NextResponse.json({
          user,
          profile,
          survey: surveyRes.data || null,
          payments: paymentsRes.data || [],
          sessions,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid section" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
