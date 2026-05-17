Manager Approval & Check-in System

This is the core enterprise workflow evaluators will care about most.

If this module feels polished and realistic, your project quality increases massively.

MANAGER MODULE — FULL OVERVIEW

The manager system handles:

Employee submits goals
        ↓
Manager reviews
        ↓
Manager edits if needed
        ↓
Approve / Reject
        ↓
Goals get locked
        ↓
Quarterly check-ins
        ↓
Performance tracking
WHAT THE MANAGER MODULE MUST HANDLE
1. Team Dashboard

Manager sees:

team members
goal completion
pending approvals
quarterly progress
2. Goal Approval Workflow

Manager can:

review goals
edit targets
edit weightages
approve goals
reject goals
send for rework
3. Goal Locking

After approval:

employee cannot edit
goal becomes locked
4. Quarterly Check-ins

Manager:

reviews employee updates
compares planned vs actual
adds comments
5. Tracking & Monitoring

Manager dashboard should show:

pending approvals
overdue check-ins
progress summaries
STEP 1 — REQUIRED DATABASE CHANGES

Now we must structure database properly.

A. Goals Table

Create this in Supabase SQL Editor.

create table goals (
  id uuid default gen_random_uuid() primary key,

  employee_id uuid references profiles(id) on delete cascade,

  thrust_area text not null,

  title text not null,

  description text,

  uom_type text check (
    uom_type in ('numeric', 'percentage', 'timeline', 'zero')
  ),

  target text not null,

  weightage integer not null check (
    weightage >= 10 and weightage <= 100
  ),

  status text default 'draft' check (
    status in (
      'draft',
      'pending_approval',
      'approved',
      'rework_requested'
    )
  ),

  locked boolean default false,

  created_at timestamp with time zone default timezone('utc'::text, now())
);
PURPOSE OF EACH FIELD
Field	Purpose
employee_id	goal owner
thrust_area	business category
title	goal title
description	explanation
uom_type	measurement type
target	expected target
weightage	contribution
status	workflow state
locked	prevents editing
B. Approvals Table

VERY IMPORTANT.

Tracks approval history.

create table approvals (
  id uuid default gen_random_uuid() primary key,

  goal_id uuid references goals(id) on delete cascade,

  manager_id uuid references profiles(id),

  status text check (
    status in (
      'approved',
      'rejected',
      'rework_requested'
    )
  ),

  remarks text,

  created_at timestamp with time zone default timezone('utc'::text, now())
);
WHY THIS TABLE MATTERS

Without this:

no approval history
no auditability
no tracking

This makes your app feel enterprise-grade.

C. Quarterly Updates Table

Needed for manager check-ins.

create table quarterly_updates (
  id uuid default gen_random_uuid() primary key,

  goal_id uuid references goals(id) on delete cascade,

  quarter text check (
    quarter in ('Q1', 'Q2', 'Q3', 'Q4')
  ),

  planned_value text,

  actual_value text,

  status text check (
    status in (
      'not_started',
      'on_track',
      'completed'
    )
  ),

  progress_score numeric,

  employee_comment text,

  manager_comment text,

  updated_at timestamp with time zone default timezone('utc'::text, now())
);
STEP 2 — MANAGER ROUTES STRUCTURE

Create:

app/
 └── manager/
      ├── layout.tsx
      ├── dashboard/
      ├── approvals/
      ├── checkins/
      ├── team/
PAGES YOU NEED
1. Manager Dashboard

Route:

/manager/dashboard

Shows:

pending approvals count
approved goals
quarterly completion
team performance charts
2. Team Goals Page

Route:

/manager/team

Shows:

all team members
goals
statuses
3. Pending Approvals Page

Route:

/manager/approvals

MOST IMPORTANT PAGE.

Manager reviews employee submissions here.

4. Check-ins Page

Route:

/manager/checkins

Manager reviews quarterly updates.

STEP 3 — MANAGER DASHBOARD FEATURES
Dashboard Cards

Use cards for:

Card	Example
Pending Approvals	5
Approved Goals	20
Q1 Completion	75%
Team Members	8
Charts

Use:
Recharts

Charts:

completion rates
goal status distribution
QoQ progress
STEP 4 — PENDING APPROVALS WORKFLOW

THIS IS THE MOST IMPORTANT FEATURE.

Flow
Employee submits goals
       ↓
Manager sees pending item
       ↓
Opens goal details
       ↓
Reviews goals
       ↓
Approve / Reject / Rework
WHAT MANAGER SHOULD SEE

For each employee:

name
department
submitted goals
total weightage
status badges
INSIDE GOAL REVIEW

Manager can:

edit target
edit weightage
add remarks
APPROVAL ACTIONS
APPROVE

When approved:

status = 'approved'
locked = true

Employee editing disabled.

REWORK REQUESTED
status = 'rework_requested'

Manager adds comment.

Employee edits and resubmits.

STEP 5 — GOAL LOCKING LOGIC

VERY IMPORTANT.

When:

locked = true

Employee:

cannot edit
save button hidden
fields disabled
STEP 6 — TEAM MEMBERS FETCHING

Manager should only see:

employees reporting to them

Use:

manager_id

from profiles table.

Example
Manager A
   ├── Rahul
   ├── Priya
   └── Amit
Query Logic

Fetch employees where:

manager_id = current_manager_id
STEP 7 — QUARTERLY CHECK-IN SYSTEM
Manager View

Manager sees:

Goal	Planned	Actual	Status
Manager Can Add
manager_comment

Example:

Good progress in Q1. Need better customer retention in Q2.
STEP 8 — PROGRESS SCORE LOGIC

Add utility function.

Numeric / Percentage

Progress=
Target
Achievement
	​

×100

Zero-Based

If Achievement=0⇒100%, else 0%

Timeline

Compare:

completion date
target deadline
STEP 9 — AUDIT LOGS (VERY IMPORTANT)

Create:

create table audit_logs (
  id uuid default gen_random_uuid() primary key,

  user_id uuid references profiles(id),

  action text,

  entity_type text,

  entity_id uuid,

  old_value jsonb,

  new_value jsonb,

  created_at timestamp with time zone default timezone('utc'::text, now())
);
WHAT TO LOG

Whenever manager:

edits target
edits weightage
approves goal
rejects goal

create audit log.

This gives HUGE enterprise feel.

STEP 10 — IMPORTANT UI COMPONENTS
Use These Components
Component	Use
Table	approvals
Card	dashboard
Badge	statuses
Dialog	approval modal
Tabs	quarter filtering
Progress bar	completion
STATUS BADGES
Status	Color
Draft	Gray
Pending	Yellow
Approved	Green
Rework	Red
STEP 11 — MANAGER LAYOUT

Create:

app/manager/layout.tsx

Include:

sidebar
navbar
logout button
Sidebar Items
Dashboard
Team Goals
Pending Approvals
Quarterly Check-ins
STEP 12 — ROLE PROTECTION

Manager routes must only allow:

role = manager