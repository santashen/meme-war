create extension if not exists pgcrypto;

-- 1) Ensure profiles.username is present and valid
update public.profiles
set username = coalesce(nullif(trim(username), ''), 'user_' || left(id::text, 8))
where username is null or trim(username) = '';

alter table public.profiles
  alter column username set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_len_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_len_check
      check (char_length(trim(username)) between 2 and 30);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_unique'
  ) then
    alter table public.profiles
      add constraint profiles_username_unique unique (username);
  end if;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles
for select
to public
using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 1.1) Update trigger function so new users always get a nickname
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      split_part(new.email, '@', 1) || '_' || left(new.id::text, 4)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 2) Comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 500)
);

create index if not exists comments_post_id_created_at_idx
on public.comments (post_id, created_at);

alter table public.comments enable row level security;

drop policy if exists "Comments are readable by everyone" on public.comments;
create policy "Comments are readable by everyone"
on public.comments
for select
to public
using (true);

drop policy if exists "Authenticated users can insert own comments" on public.comments;
create policy "Authenticated users can insert own comments"
on public.comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
on public.comments
for delete
to authenticated
using (auth.uid() = user_id);
