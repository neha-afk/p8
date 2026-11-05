create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  theme text not null,
  genre text not null,
  content jsonb not null default '{"passages": [], "choices": []}'::jsonb,
  summary text not null default '',
  is_finished boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stories enable row level security;
