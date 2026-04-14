-- Cause Chain Challenges Table
create table if not exists public.cause_chain_challenges (
  id uuid primary key default gen_random_uuid(),
  article_id text not null,
  question text not null,
  nodes jsonb not null, -- Array of {id, text, isDistractor}
  edges jsonb not null, -- Array of {from, to, explanation}
  difficulty text not null default 'Medium', -- Easy, Medium, Hard
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User Cause Chain Attempts Table
create table if not exists public.user_cause_chain_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.cause_chain_challenges(id) on delete cascade,
  article_id text not null,
  user_chain jsonb not null, -- Array of node ids in order
  user_connections jsonb not null, -- Array of {from, to} connections made by user
  correct_connections integer not null default 0,
  total_connections integer not null default 0,
  has_distractor boolean not null default false,
  xp_earned integer not null default 0,
  xp_penalty integer not null default 0,
  score integer not null default 0,
  percentage_correct integer not null default 0,
  ai_feedback text,
  status text not null default 'pending', -- pending, correct, partial, incorrect
  attempt_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cause Chain Leaderboard Stats
alter table public.profiles add column if not exists cause_chains_total integer not null default 0;
alter table public.profiles add column if not exists cause_chains_correct integer not null default 0;
alter table public.profiles add column if not exists cause_chains_xp_earned integer not null default 0;

-- Indexes for performance
create index if not exists cause_chain_challenges_article_idx on public.cause_chain_challenges (article_id);
create index if not exists cause_chain_challenges_created_idx on public.cause_chain_challenges (created_at desc);
create index if not exists user_cause_chain_attempts_user_idx on public.user_cause_chain_attempts (user_id);
create index if not exists user_cause_chain_attempts_challenge_idx on public.user_cause_chain_attempts (challenge_id);
create index if not exists user_cause_chain_attempts_created_idx on public.user_cause_chain_attempts (created_at desc);

-- Update timestamp trigger
create or replace function public.touch_cause_chain_challenges_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cause_chain_challenges_updated_at on public.cause_chain_challenges;
create trigger trg_cause_chain_challenges_updated_at
before update on public.cause_chain_challenges
for each row
execute procedure public.touch_cause_chain_challenges_updated_at();

create or replace function public.touch_user_cause_chain_attempts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_cause_chain_attempts_updated_at on public.user_cause_chain_attempts;
create trigger trg_user_cause_chain_attempts_updated_at
before update on public.user_cause_chain_attempts
for each row
execute procedure public.touch_user_cause_chain_attempts_updated_at();

-- RLS Policies
alter table public.cause_chain_challenges enable row level security;

drop policy if exists "Anyone can read challenges" on public.cause_chain_challenges;
create policy "Anyone can read challenges"
on public.cause_chain_challenges
for select
to authenticated
using (true);

alter table public.user_cause_chain_attempts enable row level security;

drop policy if exists "Users can read own attempts" on public.user_cause_chain_attempts;
create policy "Users can read own attempts"
on public.user_cause_chain_attempts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own attempts" on public.user_cause_chain_attempts;
create policy "Users can insert own attempts"
on public.user_cause_chain_attempts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own attempts" on public.user_cause_chain_attempts;
create policy "Users can update own attempts"
on public.user_cause_chain_attempts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
