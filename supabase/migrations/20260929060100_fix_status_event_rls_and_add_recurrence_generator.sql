create policy "task_status_events_insert_own" on public.task_status_events
for insert to authenticated with check ((select auth.uid()) = user_id);

create or replace function public.generate_task_occurrences(p_template_id uuid, p_until timestamptz default (now() + interval '60 days'))
returns integer language plpgsql security invoker set search_path = public as $$
declare
  v_task public.tasks%rowtype;
  v_frequency text;
  v_interval integer;
  v_next timestamptz;
  v_key text;
  v_created integer := 0;
  v_task_id uuid;
begin
  select * into v_task from public.tasks
  where id = p_template_id and user_id = (select auth.uid()) and is_recurring = true and recurring_template_id is null;
  if not found then raise exception 'Recurring template not found'; end if;
  v_frequency := coalesce(v_task.recurrence_rule->>'frequency', 'daily');
  v_interval := greatest(coalesce((v_task.recurrence_rule->>'interval')::integer, 1), 1);
  v_next := coalesce(v_task.due_at, v_task.created_at);
  while v_next <= p_until loop
    v_key := to_char(v_next at time zone coalesce(v_task.recurrence_timezone, 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS');
    if not exists (select 1 from public.task_occurrences where user_id=v_task.user_id and template_task_id=v_task.id and occurrence_key=v_key) then
      insert into public.tasks (user_id,project_id,title,description,status,priority,due_at,estimate_minutes,actual_minutes,notes,is_recurring,recurrence_rule,recurrence_timezone,recurring_template_id,occurrence_key)
      values (v_task.user_id,v_task.project_id,v_task.title,v_task.description,'todo',v_task.priority,v_next,v_task.estimate_minutes,0,v_task.notes,false,null,v_task.recurrence_timezone,v_task.id,v_key)
      returning id into v_task_id;
      insert into public.task_occurrences (user_id,template_task_id,task_id,occurrence_key,scheduled_for,status,generated_at)
      values (v_task.user_id,v_task.id,v_task_id,v_key,v_next,'generated',now());
      v_created := v_created + 1;
    end if;
    if v_frequency='daily' then v_next := v_next + make_interval(days=>v_interval);
    elsif v_frequency='weekly' then v_next := v_next + make_interval(days=>7*v_interval);
    elsif v_frequency='monthly' then v_next := v_next + make_interval(months=>v_interval);
    else raise exception 'Unsupported recurrence frequency: %', v_frequency;
    end if;
  end loop;
  return v_created;
end; $$;
