create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text not null default '',
  content text not null default '',
  author_id text not null,
  user_id text not null,
  authors text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists posts_author_idx
  on public.posts (author_id);

create index if not exists posts_status_updated_idx
  on public.posts (status, updated_at desc);

create index if not exists posts_user_idx
  on public.posts (user_id);

alter table public.posts enable row level security;

revoke all on public.posts from anon, authenticated;

drop policy if exists "service_role_full_posts" on public.posts;
create policy "service_role_full_posts"
  on public.posts
  for all
  to service_role
  using (true)
  with check (true);
