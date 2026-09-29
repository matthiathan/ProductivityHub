create or replace function public.sync_task_occurrence_status()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.recurring_template_id is not null then
    update public.task_occurrences
    set status = case when new.status='done' then 'completed' else 'generated' end,
        completed_at = case when new.status='done' then coalesce(new.completed_at,now()) else null end
    where task_id=new.id and user_id=new.user_id;
  end if;
  return new;
end; $$;

create trigger tasks_sync_occurrence_status after update of status, completed_at on public.tasks
for each row execute function public.sync_task_occurrence_status();
