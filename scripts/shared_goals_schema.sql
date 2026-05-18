-- 1. Create the Master Shared Goals table
create table if not exists shared_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  thrust_area text,
  uom_type text check (
    uom_type in ('numeric', 'percentage', 'timeline', 'zero')
  ),
  target text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Modify the existing goals table to add shared goals linking columns
alter table goals
add column if not exists shared_goal_id uuid references shared_goals(id) on delete cascade;

alter table goals
add column if not exists is_shared boolean default false;

alter table goals
add column if not exists is_primary_owner boolean default false;

-- 3. Create high-performance index on shared_goal_id to accelerate syncing queries
create index if not exists idx_goals_shared_goal_id on goals(shared_goal_id);

-- 4. Enable Row-Level Security (RLS) on shared_goals table
alter table shared_goals enable row level security;

-- 5. Create RLS Policies for shared_goals table
create policy "Allow select shared_goals for everyone authenticated"
on shared_goals
for select
to authenticated
using (true);

create policy "Allow insert shared_goals for managers and admins"
on shared_goals
for insert
to authenticated
with check (
  exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('manager', 'admin')
  )
);

create policy "Allow delete shared_goals for creator or admin"
on shared_goals
for delete
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'admin'
  )
);

-- 6. Create RLS Policy to allow managers and admins to deploy goals to employees
create policy "Allow managers and admins to insert employee goals"
on goals
for insert
to authenticated
with check (
  -- Allow manager to deploy goals to their direct reports
  exists (
    select 1 from profiles
    where id = employee_id
      and manager_id = auth.uid()
  )
  -- Or allow admin to deploy goals to anyone
  or exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'admin'
  )
);
