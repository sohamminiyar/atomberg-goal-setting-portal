'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts'
import { cn } from '@/lib/utils'
import { Sparkles, Trophy, AlertTriangle, Target, CheckCircle2 } from 'lucide-react'

// TS Interface for props
interface Goal {
  id: string
  employee_id: string
  status: string
  weightage: number
}

interface QuarterlyUpdate {
  goal_id: string
  progress_score: number
  quarter: string
}

interface DashboardChartsProps {
  goals: Goal[]
  quarterlyUpdates: QuarterlyUpdate[]
  currentQuarter: string
}

export function DashboardCharts({ goals, quarterlyUpdates, currentQuarter }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  // 1. Calculate Goal Status Distribution
  const approvedCount = goals.filter(g => g.status === 'approved').length
  const pendingCount = goals.filter(g => g.status === 'pending_approval').length
  const reworkCount = goals.filter(g => g.status === 'rework_requested').length
  // Anything else (draft, pending, empty) counts as draft
  const draftCount = goals.filter(g => g.status === 'draft' || (!g.status)).length

  const chartData = [
    { name: 'Approved', value: approvedCount, fill: 'url(#approved-grad)', rawColor: '#10b981' },
    { name: 'Pending Review', value: pendingCount, fill: 'url(#pending-grad)', rawColor: '#f59e0b' },
    { name: 'Rework Required', value: reworkCount, fill: 'url(#rework-grad)', rawColor: '#f43f5e' },
    { name: 'Draft', value: draftCount, fill: 'url(#draft-grad)', rawColor: '#64748b' },
  ]

  // 2. Calculate Team Completion Average (for Approved goals only)
  const approvedGoals = goals.filter(g => g.status === 'approved')
  const totalApproved = approvedGoals.length
  
  let averageCompletion = 0
  let updatesCount = 0

  if (totalApproved > 0) {
    let totalScore = 0
    approvedGoals.forEach(g => {
      const update = quarterlyUpdates.find(u => u.goal_id === g.id)
      if (update) {
        totalScore += Number(update.progress_score) || 0
        updatesCount++
      }
    })
    averageCompletion = Math.round(totalScore / totalApproved)
  }

  // 3. Personalized Coaching Commentary based on progress score
  const getCoachingMessage = (score: number) => {
    if (score === 0) {
      return {
        text: 'Initiation Stage: Team members are drafting targets. Support them by reviewing goals and scheduling planning check-ins.',
        icon: <Target className="w-5 h-5 text-blue-500 flex-shrink-0" />,
        badge: 'Setup Cycle'
      }
    }
    if (score > 0 && score <= 40) {
      return {
        text: 'Early Momentum: Check-in records are starting to log. Remind team members to document their monthly metrics as milestones occur.',
        icon: <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0" />,
        badge: 'Building Pace'
      }
    }
    if (score > 40 && score <= 80) {
      return {
        text: 'Progressive Flow: Team is making solid strides. Great work driving operational achievements. Hold standard 1-on-1 reviews to clear roadblocks.',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
        badge: 'On Track'
      }
    }
    return {
      text: 'Peak Performance: Outstanding team achievement rate! Targets are being crushed systematically. Plan a reward recognition session.',
      icon: <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />,
      badge: 'High Achievement'
    }
  }

  const coach = getCoachingMessage(averageCompletion)

  // Circle dimensions
  const radius = 58
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius
  // Cap at 100 for SVG display but show actual average in text (which could exceed 100 in high performance)
  const displayPercent = Math.min(averageCompletion, 100)
  const strokeDashoffset = circumference * (1 - displayPercent / 100)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Chart 1: Goal Status Distribution Bar Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between lg:col-span-7 group hover:shadow-md transition-shadow">
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Goal Status Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time counts of employee goal statuses reporting to you.</p>
            </div>
            <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-550 text-[10px] font-bold rounded-full uppercase">
              Live Feed
            </span>
          </div>

          <div className="h-[280px] w-full mt-4">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  {/* Definitions for gorgeous gradients */}
                  <defs>
                    <linearGradient id="approved-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="pending-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="rework-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                    <linearGradient id="draft-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'semibold' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #f1f5f9', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      fontFamily: 'sans-serif'
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-50/50 rounded-3xl animate-pulse border border-dashed border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-400">
                Loading analytics feed...
              </div>
            )}
          </div>
        </div>

        {/* Legend Summary */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100 justify-start">
          {chartData.map((e, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.rawColor }} />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{e.name}: {e.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart 2: Circular Progress Gauge */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between lg:col-span-5 hover:shadow-md transition-shadow">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Team Achievement</h3>
              <p className="text-xs text-slate-400 mt-0.5">Average achievement score of approved team goals for {currentQuarter}.</p>
            </div>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100">
              {coach.badge}
            </span>
          </div>

          <div className="h-[210px] w-full flex items-center justify-center relative mt-3">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="text-slate-100"
                />
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="url(#progress-ring-grad)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
                
                {/* Gradient Definition for circle progress */}
                <defs>
                  <linearGradient id="progress-ring-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="50%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-slate-850 tracking-tight">{averageCompletion}%</span>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">Average Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Personalised Performance Insight Box */}
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-3 mt-4">
          {coach.icon}
          <div className="space-y-0.5">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Manager Insights</p>
            <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{coach.text}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
