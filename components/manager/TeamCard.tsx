'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, ArrowRight } from 'lucide-react'
import Link from 'next/link'
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

interface TeamCardProps {
  member: Profile
  memberGoals: Goal[]
}

export function TeamCard({ member, memberGoals }: TeamCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const pendingCount = memberGoals.filter(g => g.status === 'pending_approval').length
  const hasSubmission = pendingCount > 0

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/50 rounded-full font-semibold px-2.5 py-0.5">Approved</Badge>
      case 'pending_approval': return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200/50 rounded-full font-semibold px-2.5 py-0.5 animate-pulse">Pending Review</Badge>
      case 'rework_requested': return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200/50 rounded-full font-semibold px-2.5 py-0.5">Rework</Badge>
      default: return <Badge className="bg-slate-50 text-slate-600 hover:bg-slate-50 border border-slate-200/60 rounded-full font-semibold px-2.5 py-0.5">Draft</Badge>
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow group flex flex-col justify-between">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 border border-blue-100 rounded-full flex items-center justify-center font-bold text-lg shadow-xs">
              {member.full_name?.charAt(0) || 'E'}
            </div>
            {hasSubmission && (
              <Badge className="bg-[#00288e] text-white animate-pulse uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border-none">Action Required</Badge>
            )}
          </div>
          <div className="mt-4 text-left">
            <CardTitle className="text-xl font-extrabold text-slate-800">{member.full_name}</CardTitle>
            <p className="text-xs text-slate-400 mt-1 font-semibold">{member.department || 'General Operations'}</p>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-4 font-semibold text-slate-650">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-slate-450" /> Total Goals
              </span>
              <span className="font-extrabold text-slate-800">{memberGoals.length}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm font-semibold text-slate-655 pb-2">
              <span>Goal Status</span>
              {getStatusBadge(memberGoals[0]?.status || 'none')}
            </div>

            {hasSubmission ? (
              <Link href={`/manager/approvals?employeeId=${member.id}`} className="block w-full">
                <Button className="w-full mt-4 bg-[#00288e] text-white hover:bg-[#001f66] font-bold py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-none">
                  Review Submission
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button 
                onClick={() => setIsModalOpen(true)}
                variant="outline" 
                className="w-full mt-4 border-[#00288e] text-[#00288e] hover:bg-slate-50 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white"
              >
                View Goals
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visual Goals Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base shadow-sm">
                  {member.full_name?.charAt(0) || 'E'}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-slate-900">{member.full_name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{member.department || 'General Operations'} • {member.email}</p>
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
              {memberGoals.length === 0 ? (
                <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-sm text-slate-450 font-semibold">This employee has not created any goals yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {memberGoals.map((goal, idx) => (
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
    </>
  )
}
