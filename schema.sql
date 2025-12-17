
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

-- 4. Collections Table (User-created folders for saves)
create table public.collections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Saved Lessons Table (The actual bookmarks)
create table public.saved_lessons (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  video_id text references public.videos(video_id) on delete cascade not null,
  collection_id uuid references public.collections(id) on delete set null, -- Optional folder
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, video_id) -- Prevent double saving the same video
);

-- Enable RLS for new tables
alter table public.collections enable row level security;
alter table public.saved_lessons enable row level security;

-- Policies for Collections
create policy "Users can manage own collections" on public.collections for all using (auth.uid() = user_id);

-- Policies for Saved Lessons
create policy "Users can manage own saved lessons" on public.saved_lessons for all using (auth.uid() = user_id);
-- 6. Profiles Table (Extended User Info)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  first_name text,
  last_name text,
  email text,
  recovery_email text,
  phone text,
  state text,
  city text,
  avatar_url text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

-- RLS for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone" 
  on public.profiles for select using (true);

create policy "Users can insert their own profile" 
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update using (auth.uid() = id);

-- 7. Triggers for Auto-Profile Creation
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  new_username text;
begin
  -- Generate a default username: firstname + lastname + random 4 digits
  -- Coalesce ensures we don't get nulls. Regexp cleans it.
  new_username := lower(coalesce(new.raw_user_meta_data->>'first_name', 'user')) || 
                  lower(coalesce(new.raw_user_meta_data->>'last_name', '')) || 
                  floor(random() * 9000 + 1000)::text;
                  
  -- Remove spaces and special chars
  new_username := regexp_replace(new_username, '[^a-zA-Z0-9]', '', 'g');

  insert into public.profiles (id, email, username, first_name, last_name, recovery_email, phone, state, city, avatar_url)
  values (
    new.id, 
    new.email, 
    new_username,
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'recovery_email',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Storage Setup (SQL for storage is tricky, usually done in Dashboard, but here are policies)
-- The user must create a PUBLIC bucket named 'avatars' in the Supabase Dashboard.
-- Once created, they can run these policies:
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- create policy "Avatar images are publicly accessible" on storage.objects for select using ( bucket_id = 'avatars' );
-- create policy "Users can upload avatars" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
