# 🎯 Atomberg Goal Setting & Tracking Portal

> A comprehensive, role-based OKR and Goal Management platform built for seamless organizational alignment, quarterly check-ins, and performance tracking.

## 🌟 Overview
Built as a highly modular, industry-standard web application, this portal streamlines the entire goal-setting lifecycle. From individual employee OKRs to synchronized Shared KPIs across departments, it provides a centralized hub for tracking progress, managing approvals, and driving organizational success.

## 🚀 Key Features

### 👥 Role-Based Access Control (RBAC)
Dedicated and secure workspaces tailored to specific organizational roles:
- **Employee Portal**: Intuitive dashboard for setting OKRs, managing daily/quarterly progress, and submitting check-ins.
- **Manager Portal**: Team oversight, goal approval workflows, and direct reports performance tracking.
- **Admin Portal**: Complete organizational hierarchy management, audit logging, and global reporting.

### 🔗 Shared KPIs & Synchronization
- **Cross-Functional Alignment**: Goals can be linked as "Shared KPIs" across multiple users.
- **Data Integrity Governance**: Only the designated Primary Owner can record updates on shared goals. Changes are instantly synchronized to all associated users.

### 📅 Quarterly Check-ins & Lock Governance
- **Frictionless Updates**: Seamless interface for logging "Actual Achievements", statuses, and comments.
- **Smart Dirty Checks**: System automatically detects unsaved changes and prevents accidental data loss.
- **Submission Lockout**: Once an update is submitted and approved, the goal is securely locked from further editing to maintain audit compliance.

### 📊 Dynamic Dashboards & Analytics
- Real-time data visualization using Recharts.
- Track goal completion rates, team performance metrics, and pending approval queues at a glance.

## 💻 Tech Stack

### Frontend Architecture
* **Framework**: [Next.js 16] (App Router, Server Components)
* **Language**: TypeScript (Strict Mode)
* **Styling**: Tailwind CSS & shadcn/ui
* **State Management**: Zustand
* **Charts**: Recharts
* **Icons**: Lucide React

### Backend & Authentication
* **Database & Auth**: [Supabase] (PostgreSQL)
* **Security**: Edge Proxy Middleware (`proxy.ts`) for secure route protection & Row Level Security (RLS)
* **ORM / Client**: Supabase SSR Client

## 📂 Project Structure
```text
├── app/                  # Next.js App Router (Pages, Layouts)
│   ├── admin/            # Admin workspace
│   ├── employee/         # Employee workspace
│   ├── manager/          # Manager workspace
│   └── login/ & signup/  # Authentication views
├── components/           # Reusable UI components & Feature modules
│   ├── ui/               # shadcn/ui primitive components
│   ├── employee/         # Employee-specific components
│   └── manager/          # Manager-specific components
├── lib/ & utils/         # Supabase clients, utility functions, auth handling
├── services/             # Database interaction layer (goals, auth, admin)
├── store/                # Zustand global state (Notifications, etc.)
└── types/                # TypeScript interfaces and database schemas
```

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
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. **Run the development server**:
   ```bash
   npm run dev
   ```
5. **Open** [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ☁️ Deployment
This project is completely modularized and optimized for a flawless deployment on **Vercel**. 
The Edge Middleware is configured according to the latest standards, ensuring fast, secure authentication routing globally.

---
*Developed as an assignment submission for the Hackathon.*
