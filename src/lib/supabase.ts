import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  user_id: string;
  onboarding_complete: boolean;
  goal: string;
  focus_areas: string[];
  main_motivation: string;
  biggest_challenge: string;
  preferred_coach_tone: 'strict' | 'balanced' | 'encouraging';
  reminder_time: string;
  wake_time?: string;
  sleep_time?: string;
  created_at: string;
  updated_at: string;
};
