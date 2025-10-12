import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/protectResource';
import { updateSurveyCompletionInProfile, saveSurveyResponses } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authUser = await getAuthUser();
    if (!authUser) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Authenticated user:', authUser.id);

    // Get the survey data from the request body
    const surveyData = await request.json();
    console.log('Survey data received:', surveyData);

    // Validate survey data structure
    if (!surveyData.region || !surveyData.applicationCycle || !surveyData.country || !surveyData.school || !surveyData.course) {
      return NextResponse.json(
        { error: 'Missing required survey fields' },
        { status: 400 }
      );
    }

    // Save survey responses to the survey_responses table
    console.log('Saving survey responses for user:', authUser.id);
    const { success: saveSuccess, error: saveError } = await saveSurveyResponses(authUser.id, surveyData);

    if (!saveSuccess) {
      console.error('Error saving survey responses:', saveError);
      return NextResponse.json(
        { error: 'Failed to save survey responses', details: saveError },
        { status: 500 }
      );
    }

    console.log('✅ Successfully saved survey responses');

    // Update survey completion using the profile table function
    console.log('Updating survey_completed in profile table for user:', authUser.id);
    const { success, error } = await updateSurveyCompletionInProfile(authUser.id);

    if (!success) {
      console.error('Error updating survey_completed:', error);
      return NextResponse.json(
        { error: 'Failed to update survey completion status', details: error },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully marked survey as completed for user ${authUser.id}`);

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