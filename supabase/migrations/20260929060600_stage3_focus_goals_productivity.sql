create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text,
  category text not null default 'deep_work' check (category in ('deep_work','planning','admin','learning','other')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create unique index focus_sessions_one_active_per_user_idx
  on public.focus_sessions(user_id) where ended_at is null;
create index focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at desc);
create index focus_sessions_task_idx on public.focus_sessions(task_id);
create index focus_sessions_project_idx on public.focus_sessions(project_id);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  category text not null default 'other' check (category in ('deep_work','planning','admin','learning','other')),
  description text,
  entry_date date not null default current_date,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index time_entries_user_date_idx on public.time_entries(user_id, entry_date desc);
create index time_entries_task_idx on public.time_entries(task_id);
create index time_entries_project_idx on public.time_entries(project_id);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  description text,
  goal_type text not null check (goal_type in ('numeric','task_based','project_milestone')),
  metric text check (metric in ('focus_minutes','tasks_completed','manual_value') or metric is null),
  target_value numeric,
  unit text,
  start_date date not null default current_date,
  target_date date,
  status text not null default 'active' check (status in ('active','completed','archived')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_value is null or target_value >= 0)
);
create index goals_user_status_idx on public.goals(user_id, status);
create index goals_project_idx on public.goals(project_id);

create table public.goal_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  value numeric not null,
  note text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index goal_progress_goal_idx on public.goal_progress(goal_id, recorded_at desc);
create index goal_progress_user_idx on public.goal_progress(user_id);

create table public.productivity_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  score integer not null check (score between 0 and 100),
  task_completion integer not null check (task_completion between 0 and 100),
  focus_time integer not null check (focus_time between 0 and 100),
  deadline_performance integer not null check (deadline_performance between 0 and 100),
  goal_progress integer not null check (goal_progress between 0 and 100),
  consistency integer not null check (consistency between 0 and 100),
  workload_control integer not null check (workload_control between 0 and 100),
  focus_minutes integer not null default 0,
  tasks_completed integer not null default 0,
  overdue_tasks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, snapshot_date)
);
create index productivity_snapshots_user_date_idx on public.productivity_snapshots(user_id, snapshot_date desc);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_focus_target_minutes integer not null default 240 check (daily_focus_target_minutes > 0),
  weekly_focus_target_minutes integer not null default 1800 check (weekly_focus_target_minutes > 0),
  productivity_weights jsonb not null default '{"taskCompletion":25,"focusTime":20,"deadlinePerformance":15,"goalProgress":15,"consistency":15,"workloadControl":10}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.focus_sessions enable row level security;
alter table public.time_entries enable row level security;
alter table public.goals enable row level security;
alter table public.goal_progress enable row level security;
alter table public.productivity_snapshots enable row level security;
alter table public.user_settings enable row level security;

create policy focus_sessions_select_own on public.focus_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy focus_sessions_insert_own on public.focus_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy focus_sessions_update_own on public.focus_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy focus_sessions_delete_own on public.focus_sessions for delete to authenticated using ((select auth.uid()) = user_id);

create policy time_entries_select_own on public.time_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy time_entries_insert_own on public.time_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy time_entries_update_own on public.time_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy time_entries_delete_own on public.time_entries for delete to authenticated using ((select auth.uid()) = user_id);

create policy goals_select_own on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy goals_insert_own on public.goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy goals_update_own on public.goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy goals_delete_own on public.goals for delete to authenticated using ((select auth.uid()) = user_id);

create policy goal_progress_select_own on public.goal_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy goal_progress_insert_own on public.goal_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy goal_progress_update_own on public.goal_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy goal_progress_delete_own on public.goal_progress for delete to authenticated using ((select auth.uid()) = user_id);

create policy productivity_snapshots_select_own on public.productivity_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy productivity_snapshots_insert_own on public.productivity_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy productivity_snapshots_update_own on public.productivity_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy productivity_snapshots_delete_own on public.productivity_snapshots for delete to authenticated using ((select auth.uid()) = user_id);

create policy user_settings_select_own on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy user_settings_insert_own on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_settings_update_own on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger focus_sessions_set_updated_at before update on public.focus_sessions for each row execute function public.set_updated_at();
create trigger time_entries_set_updated_at before update on public.time_entries for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals for each row execute function public.set_updated_at();
create trigger productivity_snapshots_set_updated_at before update on public.productivity_snapshots for each row execute function public.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

create or replace function public.refresh_task_actual_minutes(p_task_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_task_id is null then return; end if;
  update public.tasks t
  set actual_minutes = coalesce((
    select sum(minutes) from (
      select duration_minutes as minutes from public.focus_sessions where task_id = p_task_id and ended_at is not null
      union all
      select duration_minutes as minutes from public.time_entries where task_id = p_task_id
    ) x
  ), 0)
  where t.id = p_task_id and t.user_id = (select auth.uid());
end;
$$;

create or replace function public.sync_focus_session_duration()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.ended_at is not null then
    new.duration_minutes = greatest(1, floor(extract(epoch from (new.ended_at - new.started_at)) / 60)::integer);
  else
    new.duration_minutes = 0;
  end if;
  return new;
end;
$$;

create trigger focus_sessions_sync_duration before insert or update of started_at, ended_at on public.focus_sessions
for each row execute function public.sync_focus_session_duration();

create or replace function public.refresh_task_minutes_after_focus()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  perform public.refresh_task_actual_minutes(coalesce(new.task_id, old.task_id));
  if tg_op = 'UPDATE' and old.task_id is distinct from new.task_id then perform public.refresh_task_actual_minutes(old.task_id); end if;
  return coalesce(new, old);
end;
$$;
create trigger focus_sessions_refresh_task_minutes after insert or update or delete on public.focus_sessions
for each row execute function public.refresh_task_minutes_after_focus();

create or replace function public.refresh_task_minutes_after_entry()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  perform public.refresh_task_actual_minutes(coalesce(new.task_id, old.task_id));
  if tg_op = 'UPDATE' and old.task_id is distinct from new.task_id then perform public.refresh_task_actual_minutes(old.task_id); end if;
  return coalesce(new, old);
end;
$$;
create trigger time_entries_refresh_task_minutes after insert or update or delete on public.time_entries
for each row execute function public.refresh_task_minutes_after_entry();
