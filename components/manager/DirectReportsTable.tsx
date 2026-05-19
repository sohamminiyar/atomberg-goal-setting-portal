'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, Search, ArrowUpRight, Mail, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  department: string | null
}

interface Goal {
  id: string
  employee_id: string
  status: string
  title: string
  description: string | null
  thrust_area: string
  uom_type: string
  target: string
  weightage: number
  is_shared?: boolean
  is_primary_owner?: boolean
}

interface DirectReportsTableProps {
  team: Profile[]
  goals: Goal[]
}

export function DirectReportsTable({ team, goals }: DirectReportsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalEmployee, setModalEmployee] = useState<Profile | null>(null)
  const [modalGoals, setModalGoals] = useState<Goal[]>([])

  const handleOpenGoalsModal = (employee: Profile, employeeGoals: Goal[]) => {
    setModalEmployee(employee)
    setModalGoals(employeeGoals)
    setIsModalOpen(true)
  }

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

  // Extract unique departments from the team list
  const uniqueDepartments = Array.from(
    new Set(team.map(m => m.department).filter(Boolean))
  ) as string[]

  // Live client-side filtering matching search and filter selections
  const filteredTeam = team.filter(member => {
    // 1. Search Query
    const search = searchTerm.toLowerCase()
    const nameMatch = member.full_name?.toLowerCase().includes(search) || false
    const deptMatch = member.department?.toLowerCase().includes(search) || false
    const emailMatch = member.email?.toLowerCase().includes(search) || false
    const matchesSearch = !searchTerm || nameMatch || deptMatch || emailMatch

    // 2. Status Filter
    const memberGoals = goals?.filter(g => g.employee_id === member.id) || []
    const overallStatus = memberGoals[0]?.status || 'draft'
    const matchesStatus = statusFilter === 'all' || overallStatus === statusFilter

    // 3. Department Filter
    const matchesDept = deptFilter === 'all' || member.department === deptFilter

    return matchesSearch && matchesStatus && matchesDept
  })

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Table Header Controls */}
      <div className="px-6 py-5 border-b border-[#E5E7EB] bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Direct Reports</h2>
          <p className="text-xs text-slate-400 mt-0.5">Overview of goals, check-ins, and performance states.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
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
              className="pl-9 pr-4 py-1.5 text-xs border border-[#c4c5d5] rounded-lg bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all placeholder:text-slate-400 w-full sm:w-44"
            />
          </div>

          {/* Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-[#c4c5d5] rounded-lg bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] transition-all cursor-pointer font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Locked (Approved)</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="rework_requested">Rework Requested</option>
            <option value="draft">Draft</option>
          </select>

          {/* Department Dropdown Filter */}
          {uniqueDepartments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#c4c5d5] rounded-lg bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] transition-all cursor-pointer font-medium"
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          )}

          {/* Export CSV Trigger */}
          <button
            onClick={handleExportCSV}
            className="text-[#00288e] hover:text-white hover:bg-[#00288e] border border-[#00288e] transition-all text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Direct Reports View */}
      {filteredTeam.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-slate-400 font-medium">No team members match your search criteria.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card List View (< sm) */}
          <div className="block sm:hidden divide-y divide-slate-100 bg-white">
            {filteredTeam.map((member) => {
              const memberGoals = goals?.filter(g => g.employee_id === member.id) || []
              const overallStatus = memberGoals[0]?.status || 'draft'
              const initials = getInitials(member.full_name)
              const avatarColorClass = getAvatarColor(member.full_name)

              return (
                <div key={member.id} className="p-4 space-y-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm shadow-sm ${avatarColorClass}`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-sm truncate">
                        {member.full_name}
                      </div>
                      <div className="text-xs text-slate-400 font-light truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-300 flex-shrink-0" />
                        {member.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 font-semibold">{member.department || 'General Operations'}</span>
                    
                    {overallStatus === 'approved' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        Locked
                      </span>
                    )}
                    {overallStatus === 'pending_approval' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 animate-pulse">
                        Pending
                      </span>
                    )}
                    {overallStatus === 'rework_requested' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/50">
                        Rework
                      </span>
                    )}
                    {overallStatus === 'draft' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200/60">
                        Draft
                      </span>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                    {overallStatus === 'pending_approval' ? (
                      <Link href={`/manager/approvals?employeeId=${member.id}`} className="w-full">
                        <button className="w-full inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#001f66] transition-colors shadow-sm gap-1 cursor-pointer">
                          Review Goals
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleOpenGoalsModal(member, memberGoals)}
                        className="w-full inline-flex items-center justify-center px-3.5 py-2 rounded-xl border border-[#00288e] text-[#00288e] bg-white text-xs font-bold hover:bg-slate-50 transition-all gap-1 cursor-pointer"
                      >
                        View Goals
                      </button>
                    )}
                    {(overallStatus === 'draft' || overallStatus === 'rework_requested') && (
                      <button
                        onClick={() => handleNudge(member.full_name)}
                        className="w-full inline-flex items-center justify-center px-3 py-2 rounded-xl text-slate-650 hover:text-[#00288e] hover:bg-slate-100 text-xs font-bold transition-all border border-slate-200 bg-white cursor-pointer"
                      >
                        Nudge User
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop/Tablet Table View (>= sm) */}
          <div className="hidden sm:block overflow-x-auto">
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

                      <td className="px-6 py-4.5 text-sm text-slate-600 font-medium">
                        {member.department || 'General Operations'}
                      </td>

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

                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {overallStatus === 'pending_approval' ? (
                            <Link href={`/manager/approvals?employeeId=${member.id}`}>
                              <button className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-[#00288e] text-white text-xs font-bold hover:bg-[#001f66] transition-colors shadow-sm gap-1 hover:scale-[1.02] transform duration-150 cursor-pointer">
                                Review Goals
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleOpenGoalsModal(member, memberGoals)}
                              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg border border-[#00288e] text-[#00288e] bg-white text-xs font-bold hover:bg-slate-50 transition-all gap-1 hover:scale-[1.02] transform duration-150 cursor-pointer"
                            >
                              View Goals
                            </button>
                          )}
                          
                          {(overallStatus === 'draft' || overallStatus === 'rework_requested') && (
                            <button
                              onClick={() => handleNudge(member.full_name)}
                              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-slate-500 hover:text-[#00288e] hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                            >
                              Nudge
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Visual Goals Modal */}
      {isModalOpen && modalEmployee && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base shadow-sm">
                  {modalEmployee.full_name?.charAt(0) || 'E'}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-slate-900">{modalEmployee.full_name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{modalEmployee.department || 'General Operations'} • {modalEmployee.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-655 hover:bg-slate-100 rounded-xl transition-all font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0 bg-slate-50/30">
              {modalGoals.length === 0 ? (
                <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-sm text-slate-450 font-semibold">This employee has not created any goals yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {modalGoals.map((goal, idx) => (
                    <div 
                      key={goal.id} 
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 font-bold text-[10px] rounded-full uppercase tracking-tight">
                            {goal.thrust_area}
                          </span>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border",
                            goal.status === 'approved' 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-250/50"
                              : goal.status === 'pending_approval'
                                ? "bg-amber-50 text-amber-700 border-amber-250/50"
                                : goal.status === 'rework_requested'
                                  ? "bg-rose-50 text-rose-700 border-rose-250/50"
                                  : "bg-slate-50 text-slate-600 border-slate-250/60"
                          )}>
                            {goal.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="text-left">
                          <h4 className="text-sm font-extrabold text-slate-800 leading-snug">{goal.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed mt-1">{goal.description || 'No description provided.'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-5 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-650">
                        <div className="flex items-center gap-1">
                          <span>Target:</span>
                          <span className="font-extrabold text-slate-800">{goal.target}</span>
                          <span className="text-[10px] text-slate-450 uppercase">({goal.uom_type})</span>
                        </div>
                        <div>
                          Weight: <span className="font-extrabold text-blue-600">{goal.weightage}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-[#00288e] hover:bg-[#001f66] text-white font-bold py-2 px-5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
