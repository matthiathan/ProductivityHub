create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  content text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index notes_task_idx on public.notes(task_id);
create index notes_project_idx on public.notes(project_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('overdue','due_soon','reminder','goal','system')),
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, dedupe_key)
);
create index notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);

alter table public.notes enable row level security;
alter table public.notifications enable row level security;

create policy notes_select_own on public.notes for select to authenticated using ((select auth.uid()) = user_id);
create policy notes_insert_own on public.notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notes_update_own on public.notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy notes_delete_own on public.notes for delete to authenticated using ((select auth.uid()) = user_id);

create policy notifications_select_own on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy notifications_insert_own on public.notifications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notifications_update_own on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy notifications_delete_own on public.notifications for delete to authenticated using ((select auth.uid()) = user_id);

create trigger notes_set_updated_at before update on public.notes for each row execute function public.set_updated_at();

create or replace function public.refresh_due_notifications()
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := (select auth.uid());
  v_count integer := 0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  insert into public.notifications (user_id, kind, title, body, entity_type, entity_id, dedupe_key)
  select v_user, 'overdue', 'Task overdue', t.title, 'task', t.id, 'task-overdue-' || t.id::text
  from public.tasks t
  where t.user_id = v_user and t.is_recurring = false and t.status <> 'done' and t.due_at < now()
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_count = row_count;

  insert into public.notifications (user_id, kind, title, body, entity_type, entity_id, dedupe_key)
  select v_user, 'due_soon', 'Task due soon', t.title, 'task', t.id, 'task-due-' || t.id::text || '-' || t.due_at::date::text
  from public.tasks t
  where t.user_id = v_user and t.is_recurring = false and t.status <> 'done' and t.due_at >= now() and t.due_at <= now() + interval '24 hours'
  on conflict (user_id, dedupe_key) do nothing;

  insert into public.notifications (user_id, kind, title, body, entity_type, entity_id, dedupe_key)
  select v_user, 'goal', 'Goal deadline approaching', g.name, 'goal', g.id, 'goal-due-' || g.id::text || '-' || g.target_date::text
  from public.goals g
  where g.user_id = v_user and g.status = 'active' and g.target_date is not null and g.target_date between current_date and current_date + 3
  on conflict (user_id, dedupe_key) do nothing;

  insert into public.notifications (user_id, kind, title, body, entity_type, entity_id, dedupe_key)
  select v_user, 'reminder', 'Reminder', coalesce(r.message, 'Scheduled reminder'), case when r.task_id is not null then 'task' else 'project' end, coalesce(r.task_id, r.project_id), 'reminder-' || r.id::text
  from public.reminders r
  where r.user_id = v_user and r.dismissed_at is null and r.remind_at <= now()
  on conflict (user_id, dedupe_key) do nothing;

  return (select count(*)::integer from public.notifications where user_id = v_user and read_at is null);
end;
$$;
