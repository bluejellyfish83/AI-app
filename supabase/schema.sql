create table chats (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  title text default 'New Chat',
  model_id text default 'openai/gpt-4o-mini',
  system_prompt text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  created_at timestamptz default now()
);

create table daily_summaries (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  summary_date date not null,
  summary text not null,
  created_at timestamptz default now(),
  unique(chat_id, summary_date)
);

alter table chats disable row level security;
alter table messages disable row level security;
alter table daily_summaries disable row level security;