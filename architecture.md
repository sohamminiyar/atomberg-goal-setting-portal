# Atomberg In-House Goal Setting & Tracking Portal

## Full Product Overview & Development Blueprint

This document defines the complete scope, workflows, architecture, features, user journeys, business rules, UI modules, database structure, and implementation roadmap for the portal.

The goal is to build a clean, enterprise-style internal Goal Management System for employees, managers, and HR/admins.

---

# 1. Product Overview

## Product Name

```text id="fyx4d2"
Atomberg Goal Setting & Tracking Portal
```

## Product Type

```text id="37b2wx"
Internal HR Performance & Goal Management Platform
```

## Objective

The platform helps organizations:

* digitally manage employee goals
* align employee work with company objectives
* track quarterly progress
* conduct manager check-ins
* maintain audit-ready records
* monitor completion & performance centrally

The platform replaces:

* spreadsheets
* emails
* manual tracking
* disconnected review systems

---

# 2. Core Problem Being Solved

Currently organizations face problems like:

* No centralized goal tracking
* Employees don’t understand priorities
* Managers cannot track progress in real time
* HR cannot generate reliable appraisal data
* No audit history
* No workflow accountability

This platform solves those issues.

---

# 3. Product Scope

The platform supports the full lifecycle:

```text id="hq1wwr"
Goal Creation
      ↓
Goal Submission
      ↓
Manager Approval
      ↓
Goal Locking
      ↓
Quarterly Achievement Updates
      ↓
Manager Check-ins
      ↓
Progress Tracking
      ↓
Reporting & Audit
```

---

# 4. User Roles

The system contains 3 major roles.

---

# A. Employee

## Responsibilities

* Create goals
* Submit goals
* Update quarterly achievements
* Track progress
* View locked goals

## Permissions

Can:

* create/edit goals before submission
* submit goals
* add quarterly updates
* view own goals

Cannot:

* approve goals
* unlock goals
* edit locked goals
* access admin data

---

# B. Manager (L1)

## Responsibilities

* Review employee goals
* Approve/reject goals
* Edit targets/weightages
* Conduct quarterly check-ins
* Add comments/feedback

## Permissions

Can:

* view team goals
* approve/reject goals
* edit before approval
* add check-in comments

Cannot:

* access admin settings
* unlock locked goals

---

# C. Admin / HR

## Responsibilities

* Configure cycles
* Manage users & hierarchy
* Unlock goals
* Push shared goals
* View reports
* View audit logs

## Permissions

Full system access.

---

# 5. Core Functional Modules

---

# MODULE 1 — Authentication & Role Management

## Features

* Login
* Logout
* Session persistence
* Role-based routing
* Protected pages

## Authentication System

Use:

```text id="wxy4x5"
Supabase Auth
```

## Roles

```text id="3qbyxm"
employee
manager
admin
```

## Role-based Access

Example:

* Employee → `/employee/*`
* Manager → `/manager/*`
* Admin → `/admin/*`

---

# MODULE 2 — Employee Goal Management

This is the heart of the system.

---

# Goal Creation Flow

Employee creates a goal sheet.

Each goal contains:

| Field       | Type        |
| ----------- | ----------- |
| Thrust Area | Dropdown    |
| Goal Title  | Text        |
| Description | Textarea    |
| UoM Type    | Select      |
| Target      | Number/Text |
| Weightage   | Number      |

---

# UoM Types

| Type       | Meaning             |
| ---------- | ------------------- |
| Numeric    | Higher/lower number |
| Percentage | % target            |
| Timeline   | Date/deadline       |
| Zero-based | 0 incidents/errors  |

---

# Goal Validation Rules

## Mandatory Rules

### 1. Total Weightage = 100%

Example:

| Goal   | Weightage |
| ------ | --------- |
| Goal A | 40        |
| Goal B | 30        |
| Goal C | 30        |

Valid.

---

### 2. Minimum Weightage = 10%

Invalid:

```text id="4xy8y3"
5%
```

---

### 3. Maximum Goals = 8

Cannot create more than 8 goals.

---

# Goal States

| State            | Meaning             |
| ---------------- | ------------------- |
| Draft            | Not submitted       |
| Pending Approval | Waiting for manager |
| Approved         | Locked              |
| Rework Requested | Employee must edit  |

---

# Submission Flow

```text id="wqmqow"
Draft
   ↓
Submit
   ↓
Pending Manager Approval
```

---

# MODULE 3 — Manager Approval Workflow

---

# Manager Dashboard

Manager can:

* see pending approvals
* review employee goals
* edit targets
* edit weightages
* approve/reject

---

# Approval Actions

## Approve

Goals become:

```text id="s8khby"
LOCKED
```

Employee cannot edit.

---

## Reject / Rework

Manager adds comments:

```text id="mns2gg"
Please reduce weightage on Goal 2
```

Employee edits & resubmits.

---

# Inline Editing

Manager can modify:

* target
* weightage

before approval.

---

# Goal Locking

After approval:

* employee edit disabled
* only admin can unlock

---

# MODULE 4 — Shared Goals

This is an important advanced feature.

---

# Concept

Admin/Manager creates a department KPI.

Example:

```text id="0odtfx"
Increase Sales Revenue by 20%
```

Assigns to:

* Rahul
* Priya
* Amit

---

# Shared Goal Rules

Employee can:

* adjust ONLY weightage

Employee cannot:

* edit title
* edit target
* edit description

---

# Sync Logic

Primary owner updates achievement.

All linked employees automatically sync.

---

# MODULE 5 — Quarterly Achievement Tracking

Employees update progress quarterly.

---

# Quarterly Windows

| Quarter | Window      |
| ------- | ----------- |
| Q1      | July        |
| Q2      | October     |
| Q3      | January     |
| Q4      | March/April |

---

# Employee Updates

For each goal:

* planned target
* actual achievement
* status
* remarks

---

# Status Options

| Status      |
| ----------- |
| Not Started |
| On Track    |
| Completed   |

---

# Example

| Target     | Actual     |
| ---------- | ---------- |
| 50 Dealers | 20 Dealers |

Status:

```text id="p60z1v"
On Track
```

---

# MODULE 6 — Progress Score Calculation

System automatically computes progress.

---

# A. Min (Higher is Better)

Example:

```text id="bnjlwm"
Sales Revenue
```

Formula:

\text{Progress} = \frac{\text{Achievement}}{\text{Target}}

---

# B. Max (Lower is Better)

Example:

```text id="jlwm90"
Cost Reduction
```

Formula:

\text{Progress} = \frac{\text{Target}}{\text{Achievement}}

---

# C. Timeline

Compare:

* completion date
* deadline

---

# D. Zero-based

Example:

```text id="jlwm91"
Safety Incidents
```

Rule:

\text{If Achievement}=0 \Rightarrow 100%,\ \text{else}\ 0%

---

# MODULE 7 — Manager Check-ins

Managers conduct quarterly reviews.

---

# Features

Manager can:

* review achievements
* compare planned vs actual
* add comments
* track employee performance

---

# Check-in Example

```text id="jlwm92"
Good progress in Q1.
Need improvement in customer retention metrics.
```

---

# MODULE 8 — Admin Control Panel

Admin has complete visibility.

---

# Features

## User Management

* create users
* assign managers
* assign roles

---

## Cycle Management

Control:

* goal setting window
* quarterly windows

---

## Goal Unlock

Admin can unlock approved goals.

---

## Shared Goal Assignment

Assign goals across departments.

---

## Audit Logs

Track:

* who changed what
* when
* old value
* new value

---

# MODULE 9 — Reporting & Analytics

---

# A. Achievement Report

Export:

```text id="jlwm93"
CSV / Excel
```

Contains:

* employee
* goal
* target
* achievement
* status
* progress

---

# B. Completion Dashboard

Shows:

* who completed goals
* who missed check-ins
* pending approvals

---

# C. Analytics Dashboard

Charts:

* completion rates
* QoQ trends
* department performance
* manager effectiveness

---

# MODULE 10 — Notifications (Optional Bonus)

Examples:

* Goal submitted
* Goal approved
* Check-in reminder
* Rework request

Optional:

* email
* in-app notifications

---

# 6. Complete User Journey

---

# EMPLOYEE JOURNEY

```text id="jlwm94"
Login
   ↓
Create Goals
   ↓
Save Draft
   ↓
Submit Goals
   ↓
Manager Review
   ↓
Approved & Locked
   ↓
Quarterly Updates
   ↓
Track Progress
```

---

# MANAGER JOURNEY

```text id="jlwm95"
Login
   ↓
View Team Goals
   ↓
Review Submission
   ↓
Approve / Reject
   ↓
Quarterly Check-ins
   ↓
Add Comments
```

---

# ADMIN JOURNEY

```text id="jlwm96"
Login
   ↓
Manage Users
   ↓
Configure Cycles
   ↓
Assign Shared Goals
   ↓
Monitor Completion
   ↓
View Reports & Audit Logs
```

---

# 7. UI/UX Design Principles

The UI should feel:

* modern
* enterprise-grade
* minimal
* clean
* dashboard-oriented

---

# Design Style

Use:

* card layouts
* sidebar navigation
* charts
* tables
* badges
* progress bars

---

# Color Theme

Recommended:

```text id="jlwm97"
Slate + Blue
```

Professional HRMS look.

---

# 8. Technical Architecture

---

# Frontend

Use:

```text id="jlwm98"
Next.js App Router
```

---

# Styling

Use:

```text id="jlwm99"
Tailwind CSS + Shadcn UI
```

---

# Backend

Use:

```text id="jwlm00"
Supabase
```

Includes:

* Auth
* PostgreSQL
* Storage
* Policies

---

# Hosting

Use:

* [Vercel](https://vercel.com?utm_source=chatgpt.com) for frontend
* [Supabase](https://supabase.com?utm_source=chatgpt.com) for backend

---

# 9. Database Schema

---

# users

| Field      |
| ---------- |
| id         |
| name       |
| email      |
| role       |
| manager_id |
| department |

---

# goals

| Field          |
| -------------- |
| id             |
| employee_id    |
| title          |
| description    |
| thrust_area    |
| uom_type       |
| target         |
| weightage      |
| status         |
| locked         |
| shared_goal_id |

---

# approvals

| Field       |
| ----------- |
| id          |
| goal_id     |
| manager_id  |
| status      |
| remarks     |
| approved_at |

---

# quarterly_updates

| Field          |
| -------------- |
| id             |
| goal_id        |
| quarter        |
| planned        |
| actual         |
| status         |
| progress_score |
| comment        |

---

# audit_logs

| Field     |
| --------- |
| id        |
| user_id   |
| action    |
| old_value |
| new_value |
| timestamp |

---

# 10. Required Pages

---

# Public

* Login

---

# Employee

* Dashboard
* Goal Creation
* Goal List
* Quarterly Updates
* Profile

---

# Manager

* Team Dashboard
* Pending Approvals
* Team Check-ins

---

# Admin

* Admin Dashboard
* User Management
* Reports
* Shared Goals
* Audit Logs

---

# 11. Important Business Rules

---

# Rule 1

Total goal weightage MUST equal 100%.

---

# Rule 2

Minimum individual weightage = 10%.

---

# Rule 3

Maximum goals per employee = 8.

---

# Rule 4

Approved goals become locked.

---

# Rule 5

Quarterly updates allowed only during active windows.

---

# Rule 6

Employees cannot access manager/admin routes.

---

# Rule 7

Shared goal title & target are read-only.

---

# 12. Project Folder Structure

```text id="jlwm01"
src/
 ├── app/
 ├── components/
 ├── lib/
 ├── services/
 ├── hooks/
 ├── types/
 ├── utils/
```

---

# 13. Suggested Development Order

---

# Phase 1 — Foundation

Build:

* project setup
* auth
* layouts
* sidebar
* role routing

---

# Phase 2 — Employee Module

Build:

* goal creation
* validations
* submissions

---

# Phase 3 — Manager Module

Build:

* approvals
* edits
* comments
* locking

---

# Phase 4 — Quarterly Tracking

Build:

* achievement updates
* progress calculation
* check-ins

---

# Phase 5 — Admin Module

Build:

* reports
* audit logs
* user management

---

# Phase 6 — Polish

Build:

* charts
* responsiveness
* loading states
* notifications
* demo data

---

# 14. MVP Features (Must Complete)

These are compulsory.

✅ Authentication
✅ Role-based access
✅ Goal creation
✅ Goal validations
✅ Manager approval
✅ Goal locking
✅ Quarterly updates
✅ Progress calculation
✅ Check-in comments
✅ Reports
✅ Audit logs

---

# 16. Final Product Goal

The final application should feel like:

```text id="jlwm02"
A real internal corporate HR performance management platform
```

with:

* clean workflows
* enterprise UI
* role separation
* dashboards
* approvals
* reports
* governance
* auditability
