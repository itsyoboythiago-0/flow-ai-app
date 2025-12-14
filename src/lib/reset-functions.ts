import { supabase } from './supabase';

export async function resetProgress(userId: string | null) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Check if this is a mock user
  if (userId.startsWith('mock_')) {
    // For mock users, we can't reset data in Supabase
    // This will be handled in the component
    return { success: true, isMock: true };
  }

  // Delete all user data from Supabase
  const { error: tasksError } = await supabase
    .from('tasks')
    .update({ completed: false })
    .eq('user_id', userId);

  const { error: habitsError } = await supabase
    .from('habits')
    .update({ completed: false, streak: 0 })
    .eq('user_id', userId);

  const { error: progressError } = await supabase
    .from('progress')
    .update({ 
      habits_completed: 0, 
      tasks_completed: 0, 
      completion_rate: 0 
    })
    .eq('user_id', userId);

  if (tasksError || habitsError || progressError) {
    console.error('Error resetting progress:', { tasksError, habitsError, progressError });
    throw new Error('Failed to reset progress');
  }

  return { success: true, isMock: false };
}

export async function resetOnboarding(userId: string | null) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Check if this is a mock user
  if (userId.startsWith('mock_')) {
    localStorage.removeItem(`onboarding_complete_${userId}`);
    localStorage.removeItem(`onboarding_data_${userId}`);
    return { success: true, isMock: true };
  }

  // Reset in Supabase
  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_complete: false,
      identity: null,
      goal: null,
      focus_areas: [],
      coach_tone: 'balanced',
      reminder_time: null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error resetting onboarding:', error);
    throw new Error('Failed to reset onboarding');
  }

  return { success: true, isMock: false };
}
