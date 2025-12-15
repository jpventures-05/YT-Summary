
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Channels Table (Stores YouTube Channel Info)
create table public.channels (
  id text primary key, -- YouTube Channel ID (e.g., UC123...)
  title text not null,
  description text,
  thumbnail_url text,
  custom_url text, -- The user-friendly handle/URL
  rss_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Subscriptions Table (Links Users to Channels)
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null, -- Links to Supabase Auth User
  channel_id text references public.channels(id) on delete cascade not null,
  areas text[], -- Array of strings for "Subscription Areas" (e.g., ['Business', 'Tech'])
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, channel_id)
);

-- 3. Videos Table (Stores Video Content & AI Summaries)
create table public.videos (
  video_id text primary key, -- YouTube Video ID
  channel_id text references public.channels(id) on delete cascade not null,
  title text not null,
  published_at timestamp with time zone not null,
  summary jsonb, -- Stores the AI generated summary sections
  transcript text, -- Full transcript text (optional, could be large)
  status text default 'new', -- 'new', 'processing', 'completed', 'error'
  is_learned boolean default false, -- Simple tracking for now
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.channels enable row level security;
alter table public.subscriptions enable row level security;
alter table public.videos enable row level security;

-- Policies (Simple MVP Policies)
-- Allow anyone to read channels/videos (public data)
create policy "Public channels are viewable by everyone" on public.channels for select using (true);
create policy "Public videos are viewable by everyone" on public.videos for select using (true);

-- Allow authenticated users to manage their own subscriptions
create policy "Users can see their own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can create their own subscriptions" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can delete their own subscriptions" on public.subscriptions for delete using (auth.uid() = user_id);
create policy "Users can update their own subscriptions" on public.subscriptions for update using (auth.uid() = user_id);

-- Allow authenticated users to insert channels (when adding new ones)
create policy "Authenticated users can create channels" on public.channels for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update channels" on public.channels for update using (auth.role() = 'authenticated');

-- [NEW] Allow public/authenticated insert/update on videos (required for the server action using anon key)
-- In a real app we would use Service Role, but for this MVP config we use public policies.
create policy "Enable insert for all users" on "public"."videos" as PERMISSIVE for INSERT to public with check (true);
create policy "Enable update for all users" on "public"."videos" as PERMISSIVE for UPDATE to public using (true);
