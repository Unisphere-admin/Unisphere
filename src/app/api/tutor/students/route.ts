import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tutor/students
 * Returns all unique students who have a conversation with the authenticated tutor.
 * Each student includes basic profile info (name, avatar, school, intended major, etc.).
 * Bypasses the `users` table (which has RLS) and queries student_profile directly.
 */
async function getMyStudentsHandler(
  req: NextRequest,
  user: AuthUser
): Promise<NextResponse> {
  try {
    // Only tutors can access this endpoint
    if (!user.is_tutor) {
      return NextResponse.json({ error: 'Only tutors can access this endpoint' }, { status: 403 });
    }

    const supabase = await createRouteHandlerClientWithCookies();

    // Step 1: Get all conversations where this tutor is a participant
    const { data: myParticipations, error: partError } = await supabase
      .from('conversation_participant')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (partError) {
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    if (!myParticipations || myParticipations.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const conversationIds = myParticipations.map(p => p.conversation_id);

    // Step 2: Get all OTHER participants in those conversations
    const { data: otherParticipants, error: othersError } = await supabase
      .from('conversation_participant')
      .select('user_id, conversation_id')
      .in('conversation_id', conversationIds)
      .neq('user_id', user.id);

    if (othersError) {
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }

    if (!otherParticipants || otherParticipants.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // Deduplicate participant IDs
    const uniqueParticipantIds = Array.from(new Set(otherParticipants.map(p => p.user_id)));

    // Step 3: Query student_profile directly with these IDs
    // This bypasses the users table RLS issue. If they have a student_profile, they're a student.
    const { data: profiles, error: profilesError } = await supabase
      .from('student_profile')
      .select('id, first_name, last_name, avatar_url, school_name, year, intended_major, intended_universities, application_cycle, countries_to_apply, bio')
      .in('id', uniqueParticipantIds);

    if (profilesError) {
      return NextResponse.json({ error: 'Failed to fetch student profiles' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      // Fallback: some users might not have student profiles yet but still messaged
      // Return basic info from conversation participants
      const basicStudents = uniqueParticipantIds.map(id => {
        const participation = otherParticipants.find(p => p.user_id === id);
        return {
          id,
          first_name: '',
          last_name: '',
          avatar_url: null,
          school_name: null,
          year: null,
          intended_major: null,
          intended_universities: null,
          application_cycle: null,
          countries_to_apply: null,
          bio: null,
          conversation_id: participation?.conversation_id || null,
          last_message_at: null,
        };
      });
      return NextResponse.json({ students: basicStudents });
    }

    // Step 4: Build student_id -> conversation_id map
    const studentConversationMap: Record<string, string> = {};
    const profileIds = profiles.map(p => p.id);
    for (const p of otherParticipants) {
      if (profileIds.includes(p.user_id)) {
        studentConversationMap[p.user_id] = p.conversation_id;
      }
    }

    // Also include participants who don't have student profiles
    const missingProfileIds = uniqueParticipantIds.filter(id => !profileIds.includes(id));
    for (const p of otherParticipants) {
      if (missingProfileIds.includes(p.user_id)) {
        studentConversationMap[p.user_id] = p.conversation_id;
      }
    }

    // Step 5: Get last message timestamp for each conversation
    const relevantConvIds = Array.from(new Set(Object.values(studentConversationMap)));
    const { data: lastMessages } = await supabase
      .from('message')
      .select('conversation_id, created_at')
      .in('conversation_id', relevantConvIds)
      .order('created_at', { ascending: false });

    const lastMessageMap: Record<string, string> = {};
    if (lastMessages) {
      for (const msg of lastMessages) {
        if (!lastMessageMap[msg.conversation_id]) {
          lastMessageMap[msg.conversation_id] = msg.created_at;
        }
      }
    }

    // Step 6: Merge profiles with conversation data
    const students = profiles.map(profile => {
      const conversationId = studentConversationMap[profile.id];
      const lastMessageAt = conversationId ? lastMessageMap[conversationId] : null;

      return {
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        avatar_url: profile.avatar_url || null,
        school_name: profile.school_name || null,
        year: profile.year || null,
        intended_major: profile.intended_major || null,
        intended_universities: profile.intended_universities || null,
        application_cycle: profile.application_cycle || null,
        countries_to_apply: profile.countries_to_apply || null,
        bio: profile.bio || null,
        conversation_id: conversationId || null,
        last_message_at: lastMessageAt || null,
      };
    });

    // Add participants without profiles (they still messaged the tutor)
    for (const id of missingProfileIds) {
      const conversationId = studentConversationMap[id];
      const lastMessageAt = conversationId ? lastMessageMap[conversationId] : null;
      students.push({
        id,
        first_name: '',
        last_name: '',
        avatar_url: null,
        school_name: null,
        year: null,
        intended_major: null,
        intended_universities: null,
        application_cycle: null,
        countries_to_apply: null,
        bio: null,
        conversation_id: conversationId || null,
        last_message_at: lastMessageAt || null,
      });
    }

    // Sort by most recent message first
    students.sort((a, b) => {
      if (!a.last_message_at && !b.last_message_at) return 0;
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRouteAuth(getMyStudentsHandler);
