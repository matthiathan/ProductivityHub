alter table public.user_settings
  add column if not exists weekly_task_target integer not null default 20 check (weekly_task_target > 0),
  add column if not exists default_priority text not null default 'medium' check (default_priority = any (array['low'::text,'medium'::text,'high'::text,'critical'::text])),
  add column if not exists default_task_view text not null default 'all' check (default_task_view = any (array['all'::text,'today'::text,'upcoming'::text,'overdue'::text,'completed'::text])),
  add column if not exists week_starts_on integer not null default 1 check (week_starts_on between 0 and 6),
  add column if not exists working_day_start time without time zone not null default '08:00',
  add column if not exists working_day_end time without time zone not null default '17:00';

alter table public.user_settings
  drop constraint if exists user_settings_working_hours_valid;

alter table public.user_settings
  add constraint user_settings_working_hours_valid check (working_day_end > working_day_start);
