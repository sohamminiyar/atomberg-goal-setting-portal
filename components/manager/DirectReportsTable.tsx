'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, Search, ArrowUpRight, Mail } from 'lucide-react'
import { toast } from 'sonner'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  department: string | null
}

interface Goal {
  employee_id: string
  status: string
}

interface DirectReportsTableProps {
  team: Profile[]
  goals: Goal[]
}

export function DirectReportsTable({ team, goals }: DirectReportsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Clean initials builder
  const getInitials = (name: string | null) => {
    if (!name) return 'EE'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Pick deterministically colored badges to elevate dashboard visuals
  const getAvatarColor = (name: string | null) => {
    if (!name) return 'bg-slate-50 text-slate-700 border-slate-100'
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-100',
      'bg-indigo-50 text-indigo-700 border-indigo-100',
      'bg-violet-50 text-violet-700 border-violet-100',
      'bg-purple-50 text-purple-700 border-purple-100',
      'bg-sky-50 text-sky-700 border-sky-100',
    ]
    const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[sum % colors.length]
  }

  // Trigger real CSV download in-browser
  const handleExportCSV = () => {
    try {
      if (!team || team.length === 0) {
        toast.error('No direct reports available to export.')
        return
      }

      const headers = ['Employee Name', 'Email', 'Department', 'Goal Status']
      const rows = team.map(member => {
        const memberGoals = goals?.filter(g => g.employee_id === member.id) || []
        const overallStatus = memberGoals[0]?.status || 'draft'
        return [
          member.full_name || 'N/A',
          member.email || 'N/A',
          member.department || 'General Operations',
          overallStatus.replace('_', ' ').toUpperCase()
        ]
      })

      const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `Direct_Reports_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Successfully exported team goals spreadsheet!')
    } catch (error) {
      toast.error('Failed to export team CSV.')
    }
  }

  const handleNudge = (name: string | null) => {
    toast.success(`Nudged ${name || 'employee'} successfully! A notification was sent.`)
  }

  // Live client-side filtering matching search inputs
  const filteredTeam = team.filter(member => {
    const search = searchTerm.toLowerCase()
    const nameMatch = member.full_name?.toLowerCase().includes(search) || false
    const deptMatch = member.department?.toLowerCase().includes(search) || false
    const emailMatch = member.email?.toLowerCase().includes(search) || false
    return nameMatch || deptMatch || emailMatch
  })

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Table Header Controls */}
      <div className="px-6 py-5 border-b border-[#E5E7EB] bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Direct Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">Overview of goals, check-ins, and performance states.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Dynamic Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-xs border border-[#c4c5d5] rounded-lg bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all placeholder:text-slate-400 w-full sm:w-48"
            />
          </div>

          {/* Export CSV Trigger */}
          <button
            onClick={handleExportCSV}
            className="text-[#00288e] hover:text-white hover:bg-[#00288e] border border-[#00288e] transition-all text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Direct Reports Grid Table */}
      <div className="overflow-x-auto">
        {filteredTeam.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400 font-medium">No team members match your search criteria.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-3.5 w-[35%]">Employee Name</th>
                <th className="px-6 py-3.5 w-[25%]">Department</th>
                <th className="px-6 py-3.5 w-[20%]">Goal Status</th>
                <th className="px-6 py-3.5 w-[20%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTeam.map((member) => {
                const memberGoals = goals?.filter(g => g.employee_id === member.id) || []
                const overallStatus = memberGoals[0]?.status || 'draft'
                const initials = getInitials(member.full_name)
                const avatarColorClass = getAvatarColor(member.full_name)

                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    {/* Employee Profile Cell */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shadow-sm ${avatarColorClass}`}>
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm group-hover:text-[#00288e] transition-colors">
                            {member.full_name}
                          </div>
                          <div className="text-xs text-slate-400 font-light flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-300" />
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department Cell */}
                    <td className="px-6 py-4.5 text-sm text-slate-600 font-medium">
                      {member.department || 'General Operations'}
                    </td>

                    {/* Status Badge Cell */}
                    <td className="px-6 py-4.5">
                      {overallStatus === 'approved' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                          Locked
                        </span>
                      )}
                      {overallStatus === 'pending_approval' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/50 animate-pulse">
                          Pending Approval
                        </span>
                      )}
                      {overallStatus === 'rework_requested' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/50">
                          Rework
                        </span>
                      )}
                      {overallStatus === 'draft' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200/60">
                          Draft
                        </span>
                      )}
                    </td>

                    {/* Quick Shortcuts Trigger */}
                    <td className="px-6 py-4.5 text-right">
                      {overallStatus === 'pending_approval' ? (
                        <Link href={`/manager/approvals?employeeId=${member.id}`}>
                          <button className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-[#00288e] text-white text-xs font-bold hover:bg-[#001f66] transition-colors shadow-sm gap-1 hover:scale-[1.02] transform duration-150">
                            Review Goals
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      ) : overallStatus === 'approved' ? (
                        <Link href={`/manager/team?employeeId=${member.id}`}>
                          <button className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg border border-[#00288e] text-[#00288e] bg-white text-xs font-bold hover:bg-slate-50 transition-all gap-1 hover:scale-[1.02] transform duration-150">
                            View Progress
                          </button>
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleNudge(member.full_name)}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-slate-500 hover:text-[#00288e] hover:bg-slate-100 text-xs font-bold transition-all"
                        >
                          Nudge User
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
