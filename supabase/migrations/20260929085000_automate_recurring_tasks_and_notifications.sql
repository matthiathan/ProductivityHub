create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.generate_task_occurrences_internal(
  p_template_id uuid,
  p_user_id uuid,
  p_until timestamptz default (now() + interval '60 days')
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.tasks%rowtype;
  v_frequency text;
  v_interval integer;
  v_next timestamptz;
  v_key text;
  v_created integer := 0;
  v_task_id uuid;
begin
  select * into v_task
  from public.tasks
  where id = p_template_id
    and user_id = p_user_id
    and is_recurring = true
    and recurring_template_id is null
    and archived_at is null;

  if not found then return 0; end if;

  v_frequency := coalesce(v_task.recurrence_rule->>'frequency', 'daily');
  v_interval := greatest(coalesce((v_task.recurrence_rule->>'interval')::integer, 1), 1);
  v_next := coalesce(v_task.due_at, v_task.created_at);

  while v_next <= p_until loop
    v_key := to_char(v_next at time zone coalesce(v_task.recurrence_timezone, 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS');

    if not exists (
      select 1 from public.task_occurrences
      where user_id = v_task.user_id
        and template_task_id = v_task.id
        and occurrence_key = v_key
    ) then
      insert into public.tasks (
        user_id, project_id, title, description, status, priority, due_at,
        estimate_minutes, actual_minutes, notes, is_recurring, recurrence_rule,
        recurrence_timezone, recurring_template_id, occurrence_key
      ) values (
        v_task.user_id, v_task.project_id, v_task.title, v_task.description, 'todo', v_task.priority, v_next,
        v_task.estimate_minutes, 0, v_task.notes, false, null,
        v_task.recurrence_timezone, v_task.id, v_key
      ) returning id into v_task_id;

      insert into public.task_occurrences (
        user_id, template_task_id, task_id, occurrence_key, scheduled_for, status, generated_at
      ) values (
        v_task.user_id, v_task.id, v_task_id, v_key, v_next, 'generated', now()
      );
      v_created := v_created + 1;
    end if;

    if v_frequency = 'daily' then
      v_next := v_next + make_interval(days => v_interval);
    elsif v_frequency = 'weekly' then
      v_next := v_next + make_interval(days => 7 * v_interval);
    elsif v_frequency = 'monthly' then
      v_next := v_next + make_interval(months => v_interval);
    else
      exit;
    end if;
  end loop;

  return v_created;
end;
$$;

revoke all on function public.generate_task_occurrences_internal(uuid, uuid, timestamptz) from public, anon, authenticated;

create or replace function public.run_productivity_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_template record;
  v_occurrences integer := 0;
  v_notifications integer := 0;
  v_rows integer := 0;
begin
  for v_template in
    select id, user_id
    from public.tasks
    where is_recurring = true
      and recurring_template_id is null
      and archived_at is null
  loop
    v_occurrences := v_occurrences + public.generate_task_occurrences_internal(v_template.id, v_template.user_id, now() + interval '60 days');
  end loop;

  insert into public.notifications (user_id, kind, title, body, entity_type, entity_id, dedupe_key)
  select t.user_id, 'overdue', 'Task overdue', t.title, 'task', t.id, 'task-overdue-' || t.id::text
  from public.tasks t
  where t.is_recurring = false and t.archived_at is null and t.status <> 'done' and t.due_at < now()
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_notifications := v_notifications + v_rows;

  insert into public.notifications (user_id, kind, title, body, entity_type, entity_id, dedupe_key)
  select t.user_id, 'due_soon', 'Task due soon', t.title, 'task', t.id,
         'task-due-' || t.id::text || '-' || t.due_at::date::text
  from public.tasks t
  where t.is_recurring = false and t.archived_at is null and t.status <> 'done'
    and t.due_at >= now() and t.due_at <= now() + interval '24 hours'
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_notifications := v_notifications + v_rows;

  insert into public.notifications (user_id, kind, title, body, entity_type, entity_id, dedupe_key)
  select g.user_id, 'goal', 'Goal deadline approaching', g.name, 'goal', g.id,
         'goal-due-' || g.id::text || '-' || g.target_date::text
  from public.goals g
  where g.status = 'active' and g.target_date is not null
    and g.target_date between current_date and current_date + 3
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_notifications := v_notifications + v_rows;

  insert into public.notifications (user_id, kind, title, body, entity_type, entity_id, dedupe_key)
  select r.user_id, 'reminder', 'Reminder', coalesce(r.message, 'Scheduled reminder'),
         case when r.task_id is not null then 'task' else 'project' end,
         coalesce(r.task_id, r.project_id), 'reminder-' || r.id::text
  from public.reminders r
  where r.dismissed_at is null and r.remind_at <= now()
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_notifications := v_notifications + v_rows;

  return jsonb_build_object(
    'occurrences_created', v_occurrences,
    'notifications_created', v_notifications,
    'ran_at', now()
  );
end;
$$;

revoke all on function public.run_productivity_maintenance() from public, anon, authenticated;

select cron.schedule(
  'productivity-hub-maintenance',
  '*/5 * * * *',
  $$select public.run_productivity_maintenance();$$
);
