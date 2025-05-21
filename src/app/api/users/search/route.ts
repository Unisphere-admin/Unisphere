import { NextRequest, NextResponse } from 'next/server';
import { searchUsers } from '@/lib/db/users';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';

async function searchUsersHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Use the data access layer to search users
    const { users, error, authError } = await searchUsers(query);

    // Handle authentication error
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    // Filter out the current user
    const filteredUsers = users.filter(u => u.id !== user.id);

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
} 

// Export the wrapped route handler
export const GET = withRouteAuth(searchUsersHandler); 