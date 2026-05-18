•	Shared Goals functionality:
◦	Admin or manager can push a departmental KPI to multiple employees
◦	Recipients may adjust weightage only; Goal Title and Target are read-only
◦	Achievement updates by the primary owner sync across all linked goal sheets



What Is Shared Goals Functionality?

This feature means:

One common goal can be assigned to multiple employees.

Instead of every employee creating the same goal manually.

Simple Example

Company KPI:

Increase Customer Satisfaction Score to 90%

This goal applies to:

Rahul
Priya
Amit

So admin/manager:

pushes the same goal to all 3 employees.
What Needs To Be Implemented?
1. Admin/Manager Creates Shared Goal

Example:

Field
Goal Title
Description
Target
UoM
Employee List
2. System Assigns Goal To Multiple Employees

Same goal appears in:

Rahul’s goals
Priya’s goals
Amit’s goals
3. Employees Have Limited Editing

Employees:

CAN ONLY change weightage

They CANNOT edit:

title
description
target
KPI data

Those fields become:

read-only
Example
Shared Goal
Increase Revenue by 20%
Rahul can modify:
weightage = 20%
Priya can modify:
weightage = 15%

But goal itself remains same.

4. Primary Owner Concept

One employee is:

Primary Owner

Only primary owner updates:

achievement
quarterly progress
Example

Primary Owner:

Rahul

Quarterly update:

Achievement = 40%
5. Sync Functionality

When Rahul updates achievement:

all linked employee goals automatically reflect same achievement.

Meaning:

Priya sees updated progress
Amit sees updated progress

No duplicate updates needed.

WHY THIS FEATURE EXISTS

Because in companies:

department KPIs are shared
teams work on same objectives
managers don’t want duplicate entries
What DB Changes Are Needed?

You need:

shared goal linking
Add To Goals Table
shared_goal_id uuid,
is_primary_owner boolean default false
Meaning
Field	Purpose
shared_goal_id	links all shared copies
is_primary_owner	who controls achievement
Example
Employee	shared_goal_id
Rahul	SG1
Priya	SG1
Amit	SG1

All belong to same shared KPI.

How Sync Works

When:

primary owner updates achievement

system updates all goals having:

same shared_goal_id
UI Requirements
Admin/Manager Side

Need:

Push Shared Goal

page/modal.

Employee Side

Shared goals should show:

Shared Badge

Example:

[Shared KPI]
Employee Restrictions

Disable fields:

title
target
description

Enable only:

weightage
IMPORTANT

This is:

BONUS/ADVANCED FEATURE

NOT core MVP.

Recommendation For YOU

If time permits:
implement simplified version.

Shared Goals — Advanced Syncing Implementation

This implementation supports:

✅ Shared departmental KPIs
✅ Multiple employees linked to same goal
✅ Primary owner sync system
✅ Individual weightages
✅ Synced quarterly achievements
✅ Read-only shared KPI fields

This is the correct enterprise-style architecture.

1. SYSTEM ARCHITECTURE
Core Idea

Instead of duplicating full goal logic independently:

all linked goals share one common parent

Structure:

Shared Goal (Master KPI)
        ↓
Employee Goal Copies
        ↓
Quarterly Updates Sync
2. REQUIRED DATABASE DESIGN
A. Shared Goals Table (MASTER KPI)

Create new table:

create table shared_goals (
  id uuid primary key default gen_random_uuid(),

  title text not null,

  description text,

  thrust_area text,

  uom_type text check (
    uom_type in ('numeric', 'percentage', 'timeline', 'zero')
  ),

  target text not null,

  created_by uuid references profiles(id),

  created_at timestamp with time zone
  default timezone('utc'::text, now())
);
PURPOSE

This table stores:

central shared KPI definition

Example:

Increase Revenue by 20%

ONLY stored once.

3. MODIFY GOALS TABLE

Add these columns:

alter table goals
add column if not exists shared_goal_id
uuid references shared_goals(id);

alter table goals
add column if not exists is_shared boolean default false;

alter table goals
add column if not exists is_primary_owner boolean default false;
WHAT THESE MEAN
Column	Purpose
shared_goal_id	links to master KPI
is_shared	identifies shared goal
is_primary_owner	controls sync authority
4. HOW DATA WILL LOOK
shared_goals table
id	title
SG1	Increase Revenue
goals table
Employee	shared_goal_id	is_primary_owner
Rahul	SG1	true
Priya	SG1	false
Amit	SG1	false
IMPORTANT

Each employee still has:

separate goals row

This allows:

separate weightage
separate ownership
separate visibility

BUT all connect to same shared KPI.

5. QUARTERLY UPDATE TABLE

Keep:

quarterly_updates

No major changes needed.

BUT:

syncing logic changes.
6. HOW SHARED GOAL CREATION WORKS
Admin/Manager Creates Shared KPI

Example:

Title:
Increase Revenue by 20%

Select employees:

Rahul
Priya
Amit

Select primary owner:

Rahul
SYSTEM FLOW
Step 1

Insert into:

shared_goals
Step 2

Create individual rows in:

goals

for each employee.

Example

3 employees selected →
3 goal rows created.

Each Goal Row

Contains:

employee_id
individual weightage
shared_goal_id
is_primary_owner
7. EMPLOYEE UI RULES

If:

is_shared = true

Then:

disable editing

for:

title
description
target
uom

Enable ONLY:

weightage
Example UI
Editable

✅ Weightage

Read-only

❌ Goal Title
❌ Target
❌ KPI details

8. PRIMARY OWNER SYNC SYSTEM

THIS is the advanced part.

ONLY PRIMARY OWNER CAN UPDATE ACHIEVEMENTS

Example:

Rahul = primary owner

Rahul updates:

Q1 Achievement = 40%
SYSTEM AUTO-SYNCS

All linked goals:

Priya
Amit

also reflect:

40%
9. HOW SYNCING WORKS
Step 1

Primary owner submits quarterly update.

Step 2

Find:

shared_goal_id
Step 3

Fetch all goals with same:

shared_goal_id
Step 4

Update/create quarterly updates for all linked goals.

EXAMPLE QUERY
select * from goals
where shared_goal_id = 'SG1';
10. IMPLEMENTATION LOGIC
Primary Owner Updates
updateSharedGoalProgress()
Backend Logic

Pseudo-flow:

Get primary owner's goal
        ↓
Find shared_goal_id
        ↓
Find all linked goals
        ↓
Update quarterly_updates
for all linked goals
11. IMPORTANT VALIDATION

ONLY allow updates if:

is_primary_owner = true

Else:

Disable achievement editing
Other Employees

Can:

view synced progress

Cannot:

modify achievement
12. MANAGER VIEW

Manager should see:

[Shared KPI]

badge.

And:

Primary Owner: Rahul
13. ADMIN FEATURES

Admin can:

create shared KPI
assign employees
change primary owner
remove employees
14. IMPORTANT UI COMPONENTS

Use:

Multi-select employee dropdown
Primary owner selector
Shared badge
Read-only fields
Progress sync indicators
15. RECOMMENDED ROUTES
Admin
/admin/shared-goals
Manager
/manager/shared-goals
Employee

Shared goals appear in:

/employee/goals

normally.

16. IMPORTANT BUSINESS RULES
Rule 1

Only one:

primary owner

per shared KPI.

Rule 2

Achievement updates sync across all linked goals.

Rule 3

Weightage remains individual.

Rule 4

Shared KPI fields are read-only.

Rule 5

Deleting shared goal removes all linked goals.