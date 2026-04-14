-- Add indexes to optimize leaderboard queries
-- These indexes will significantly speed up the Supabase REST API queries
create index if not exists idx_profiles_xp on public.profiles(total_xp desc);
create index if not exists idx_profiles_streak on public.profiles(streak_count desc);
create index if not exists idx_quiz_results_user_id on public.quiz_results(user_id);
create index if not exists idx_user_activity_date on public.user_activity(activity_date desc);
create index if not exists idx_user_activity_days_date on public.user_activity_days(activity_date desc);
