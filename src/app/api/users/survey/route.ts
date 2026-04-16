import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/protectResource';
import { updateSurveyCompletionInProfile, saveSurveyResponses, syncSurveyToStudentProfile } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Get the survey data from the request body
    const surveyData = await request.json();

    // Validate survey data structure
    if (!surveyData.region || !surveyData.applicationCycle || !surveyData.country || !surveyData.school || !surveyData.course) {
      return NextResponse.json(
        { error: 'Missing required survey fields' },
        { status: 400 }
      );
    }

    // Save survey responses to the survey_responses table
    const { success: saveSuccess, error: saveError } = await saveSurveyResponses(authUser.id, surveyData);

    if (!saveSuccess) {
      console.error('Error saving survey responses:', saveError);
      return NextResponse.json(
        { error: 'Failed to save survey responses', details: saveError },
        { status: 500 }
      );
    }


    // Sync survey answers into the student_profile so tutors can see them
    const { success: syncSuccess, error: syncError } = await syncSurveyToStudentProfile(authUser.id, surveyData);
    if (!syncSuccess) {
      // Log but don't fail - survey_responses was saved successfully
      console.error('Warning: could not sync survey data to student_profile:', syncError);
    }

    // Update survey completion using the profile table function
    const { success, error } = await updateSurveyCompletionInProfile(authUser.id);

    if (!success) {
      console.error('Error updating survey_completed:', error);
      return NextResponse.json(
        { error: 'Failed to update survey completion status', details: error },
        { status: 500 }
      );
    }


    return NextResponse.json({ 
      success: true, 
      message: 'Survey completed and responses saved successfully'
    });

  } catch (error) {
    console.error('Error in survey completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}