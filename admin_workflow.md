The Admin Panel is:

The Control Center of the Entire System

It handles:

user management
hierarchy management
reports
unlock controls
audit visibility
analytics
ADMIN RESPONSIBILITIES
1. User Management

Admin can:

view all users
create users
edit users
assign managers
change roles
deactivate users
2. Hierarchy Management

MOST IMPORTANT.

Admin can:

assign employees to managers
reassign employees
view reporting structure
3. Goal Governance

Admin can:

unlock goals
override approvals
monitor submissions
4. Reporting

Admin sees:

organization-wide progress
completion rates
pending approvals
department analytics
5. Audit & Tracking

Admin can see:

who changed what
approval history
edits
timestamps
ADMIN MODULE STRUCTURE

Create:

app/admin/
 ├── layout.tsx
 ├── dashboard/
 ├── users/
 ├── hierarchy/
 ├── reports/
 ├── audit-logs/
 ├── goals/
CORE ADMIN PAGES
1. Admin Dashboard

Route:

/admin/dashboard

Shows:

total employees
total managers
pending approvals
completed goals
quarterly progress
Dashboard Cards
Card
Employees
Managers
Pending Approvals
Locked Goals
Quarterly Completion
2. User Management Page

Route:

/admin/users

MOST IMPORTANT PAGE.

Features

Admin can:

see all users
filter by role
edit role
edit department
assign manager
remove manager
TABLE STRUCTURE
Name	Role	Department	Manager	Actions
Actions

Buttons:

Edit
Assign Manager
Change Role
3. Manager Assignment System

Route:

/admin/hierarchy

THIS is where your current problem gets solved.

HOW IT WORKS

Admin selects:

employee
manager

Then:

update profiles
set manager_id = MANAGER_ID
where id = EMPLOYEE_ID;

Done.

IMPORTANT BUSINESS RULES
Rule 1

Only:

role = employee

can be assigned.

Rule 2

Only:

role = manager

can become manager.

Rule 3

Manager cannot assign themselves.

Rule 4

One employee → one manager

(Simple hierarchy)

4. Reports Page

Route:

/admin/reports

Shows:

employee performance
completion stats
quarterly analytics
Recommended Charts

Use:
Recharts

Charts:

completion %
department performance
approval trends
5. Audit Logs Page

Route:

/admin/audit-logs

Shows:

User	Action	Time
WHAT TO TRACK

Track:

goal edits
approvals
manager assignments
unlock actions
AUDIT LOG TABLE

If not already created:

create table audit_logs (
  id uuid default gen_random_uuid() primary key,

  user_id uuid references profiles(id),

  action text,

  entity_type text,

  entity_id uuid,

  old_value jsonb,

  new_value jsonb,

  created_at timestamp with time zone
  default timezone('utc'::text, now())
);
6. Goal Governance Page

Route:

/admin/goals

Admin can:

view all goals
unlock goals
force approve
monitor statuses
GOAL UNLOCK FEATURE

When admin unlocks:

locked = false
status = 'draft'

Employee can edit again.

ADMIN SIDEBAR

Create sidebar:

Dashboard
Users
Hierarchy
Goals
Reports
Audit Logs
Logout
IMPORTANT QUERIES
Fetch All Employees
select * from profiles
where role = 'employee';
Fetch All Managers
select * from profiles
where role = 'manager';
Assign Manager
update profiles
set manager_id = 'MANAGER_UUID'
where id = 'EMPLOYEE_UUID';
Fetch Employees Under Manager
select * from profiles
where manager_id = 'MANAGER_UUID';
UI COMPONENTS YOU NEED

Use:

Tables
Cards
Dialogs
Select dropdowns
Charts
Badges
IMPORTANT UI FLOW
Assign Manager Modal

Admin clicks:

Assign Manager

Modal opens.

Dropdown 1:

Select Employee

Dropdown 2:

Select Manager

Click:

Assign

Done.

VERY IMPORTANT SECURITY RULES
Admin Only Routes

Protect:

/admin/*

Only:

role = admin

allowed.

Managers Cannot Access Admin

Redirect unauthorized users.