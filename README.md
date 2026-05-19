# 🎯 Atomberg Goal Setting & Tracking Portal

> A comprehensive, role-based OKR and Goal Management platform built for seamless organizational alignment, quarterly check-ins, and performance tracking.

## 🔗 Project Links
- **Live Deployed Link:** [https://atomberg-goal-setting-portal.vercel.app/](https://atomberg-goal-setting-portal.vercel.app/)
- **GitHub Repository:** [https://github.com/sohamminiyar/atomberg-goal-setting-portal](https://github.com/sohamminiyar/atomberg-goal-setting-portal)
- - **Project Document:** [https://docs.google.com/document/d/1nz_8v3eObpdJHXeYEv9iXEC0uBAedRVO/edit?usp=drive_link&ouid=106077840430437701213&rtpof=true&sd=true](https://docs.google.com/document/d/1nz_8v3eObpdJHXeYEv9iXEC0uBAedRVO/edit?usp=drive_link&ouid=106077840430437701213&rtpof=true&sd=true)

## A. Project Overview
This portal streamlines the entire goal-setting lifecycle. It provides an enterprise-grade platform for employees to set goals, managers to approve and track progress, and administrators to oversee the organizational hierarchy. The system exists to bridge the gap between individual performance and organizational objectives, ensuring everyone is aligned.

**Workflow:**
1. Employee creates goals and OKRs.
2. Manager reviews, modifies if needed, and approves the goals.
3. Approved goals are locked.
4. Employees submit quarterly updates on their progress.
5. Managers review quarterly progress.
6. Admins monitor organization-wide analytics and manage user hierarchy.

## B. Features
- **Role-Based Auth:** Secure and dedicated workspaces for Employees, Managers, and Admins.
- **Goal Creation:** Intuitive interface for employees to set OKRs and daily/quarterly goals.
- **Manager Approvals:** Workflow for managers to review, approve, or reject team goals.
- **Quarterly Tracking:** Seamless check-ins for logging actual achievements and progress.
- **Admin Hierarchy:** Complete management of organizational structure and manager assignments.
- **Shared Goals:** Cross-functional alignment through Shared KPIs, synchronized across multiple users.
- **Audit Logs:** Tracking critical system actions for compliance and transparency.

## C. Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Next.js** | Frontend Framework |
| **Supabase** | Backend/Auth/DB |
| **Tailwind CSS** | Styling |
| **Shadcn UI** | Components |

## D. Architecture
- **Employee Flow:** Access the Employee Portal -> Create Goals -> Wait for Approval -> Log Quarterly Check-ins.
- **Manager Flow:** Access the Manager Portal -> Review Team Goals -> Approve/Reject -> Monitor Direct Reports' Progress.
- **Admin Flow:** Access the Admin Portal -> Manage Users & Hierarchy -> Assign Managers -> View Audit Logs & Reports.

## E. Database Schema
The system uses a relational PostgreSQL database managed via Supabase.
- `profiles`: Stores user details, roles, and manager assignments.
- `goals`: Stores individual employee goals and OKRs.
- `approvals`: Manages the approval status and workflow for goals.
- `quarterly_updates`: Tracks progress updates submitted every quarter.
- `shared_goals`: Manages company-wide or departmental shared KPIs.
- `audit_logs`: Records critical actions for system transparency.

## G. Demo Credentials
Use these credentials to quickly test the application functionality across different roles.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Employee** | employee@test.com | 123456 |
| **Manager** | manager@test.com | 123456 |
| **Admin** | admin@test.com | 123456 |

---
## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase Project (Database & Auth)

### Setup Instructions
1. **Clone the repository**
2. **Install dependencies**: 
   ```bash
   npm install
   ```
3. **Environment Variables**: Create a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```
4. **Run the development server**:
   ```bash
   npm run dev
   ```
5. **Open** [http://localhost:3000](http://localhost:3000) with your browser to see the result.
