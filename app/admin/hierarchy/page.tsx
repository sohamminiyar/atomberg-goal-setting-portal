'use client'

import { useEffect, useState } from 'react'
import { adminService } from '@/services/admin'
import { authService } from '@/services/auth'
import { cn } from '@/lib/utils'
import { Profile } from '@/types/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Network, 
  Search, 
  ArrowRight, 
  UserCheck, 
  GitCommit, 
  Building2, 
  Mail, 
  Users, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'

export default function HierarchyWorkspacePage() {
  const [users, setUsers] = useState<(Profile & { manager_name?: string | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [currentAdminId, setCurrentAdminId] = useState<string>('')

  // Workspace state
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  const [selectedMgrId, setSelectedMgrId] = useState<string>('')
  
  // Searches
  const [empSearch, setEmpSearch] = useState('')
  const [mgrSearch, setMgrSearch] = useState('')
  const [hierarchySearch, setHierarchySearch] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (user) {
        setCurrentAdminId(user.id)
      }

      const userList = await adminService.getAllUsers()
      setUsers(userList)
    } catch (error) {
      toast.error('Failed to load portal reporting lines.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter Employees (only role = employee)
  const employeesList = users.filter(u => u.role === 'employee')
  const filteredEmployees = employeesList.filter(emp => {
    const search = empSearch.toLowerCase()
    return emp.full_name?.toLowerCase().includes(search) || 
           emp.email?.toLowerCase().includes(search) || 
           emp.department?.toLowerCase().includes(search)
  })

  // Filter Managers (only role = manager)
  const managersList = users.filter(u => u.role === 'manager')
  const filteredManagers = managersList.filter(mgr => {
    const search = mgrSearch.toLowerCase()
    return mgr.full_name?.toLowerCase().includes(search) || 
           mgr.email?.toLowerCase().includes(search) || 
           mgr.department?.toLowerCase().includes(search)
  })

  const selectedEmployee = users.find(u => u.id === selectedEmpId)
  const selectedManager = users.find(u => u.id === selectedMgrId)

  // Map Employee to Manager
  const handleAssignHierarchy = async () => {
    if (!selectedEmpId || !selectedMgrId || !currentAdminId) {
      toast.error('Please select both an employee and a manager to complete mapping.')
      return
    }

    if (selectedEmpId === selectedMgrId) {
      toast.error('Business Rule Violation: An employee cannot report to themselves.')
      return
    }

    try {
      const emp = users.find(u => u.id === selectedEmpId)
      const mgr = users.find(u => u.id === selectedMgrId)

      if (emp?.role !== 'employee') {
        toast.error('Business Rule Violation: Only role = employee can have managers assigned.')
        return
      }

      if (mgr?.role !== 'manager') {
        toast.error('Business Rule Violation: Only users with role = manager can become managers.')
        return
      }

      await adminService.updateUserProfile(selectedEmpId, { manager_id: selectedMgrId }, currentAdminId)
      
      toast.success(`Successfully mapped ${emp.full_name} to report to ${mgr.full_name}!`)
      setSelectedEmpId('')
      setSelectedMgrId('')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to map reporting hierarchy.')
    }
  }

  const handleUnmapHierarchy = async (employeeId: string, employeeName: string | null) => {
    if (!currentAdminId) return
    try {
      await adminService.updateUserProfile(employeeId, { manager_id: null }, currentAdminId)
      toast.success(`Removed reporting manager for ${employeeName || 'employee'}`)
      loadData()
    } catch (error) {
      toast.error('Failed to unmap reporting line.')
    }
  }

  // Visual layout helpers
  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Build Hierarchy direct-reports tree locally
  const managersWithReports = managersList.map(mgr => {
    const directReports = employeesList.filter(emp => emp.manager_id === mgr.id)
    return {
      manager: mgr,
      reports: directReports
    }
  })

  // Filter hierarchy lists based on search
  const filteredHierarchy = managersWithReports.filter(item => {
    const search = hierarchySearch.toLowerCase()
    const mgrMatch = item.manager.full_name?.toLowerCase().includes(search) || false
    const reportsMatch = item.reports.some(rep => rep.full_name?.toLowerCase().includes(search) || false)
    return mgrMatch || reportsMatch
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title block */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Hierarchy Workspace</h1>
        <p className="text-xs text-slate-400 mt-1">Configure reporting structure and assign direct reports to corporate managers.</p>
      </div>

      {/* Workspace split columns mapper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left selector panel: Employees */}
        <div className="lg:col-span-4 flex flex-col">
          <Card className="flex-1 border border-slate-200 bg-white flex flex-col overflow-hidden max-h-[500px]">
            <CardHeader className="pb-4 shrink-0 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                1. Select Employee
              </CardTitle>
              <CardDescription className="text-xs">Find employee to assign reporting manager.</CardDescription>
              <div className="relative mt-3">
                <Search className="absolute inset-y-0 left-3 w-3.5 h-3.5 my-auto text-slate-400" />
                <Input
                  placeholder="Search employees..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="pl-8 text-xs bg-white text-slate-800"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 divide-y divide-slate-50">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Loading employee logs...</div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No active employees matching search criteria.</div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmpId === emp.id
                  return (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmpId(emp.id)}
                      className={cn(
                        "p-4 flex items-center justify-between cursor-pointer transition-all duration-150 border-l-2",
                        isSelected 
                          ? "bg-blue-50/80 border-blue-600 text-blue-900" 
                          : "border-transparent hover:bg-slate-50/60 text-slate-700"
                      )}
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-semibold block truncate">{emp.full_name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate">{emp.department || 'Operations'}</span>
                      </div>
                      
                      {emp.manager_name ? (
                        <Badge variant="outline" className="text-[9px] font-medium border-slate-200 text-slate-500 shrink-0">
                          reports to {emp.manager_name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-bold border-amber-200 text-amber-600 bg-amber-50 shrink-0">
                          Unassigned
                        </Badge>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action connecting block */}
        <div className="lg:col-span-4 flex flex-col justify-center items-center gap-6 p-4">
          <Card className="w-full border border-blue-100 bg-gradient-to-br from-blue-50/20 to-blue-50/50 p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm mb-4 uppercase tracking-wider">Mapping Workspace</h4>
            
            {/* Visual mapping diagram */}
            <div className="space-y-4 w-full">
              {/* Employee display */}
              <div className={cn(
                "p-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-200",
                selectedEmployee 
                  ? "bg-blue-50 border-blue-200 text-blue-900 font-bold scale-102" 
                  : "bg-white/80 border-slate-200 border-dashed text-slate-400 italic text-xs"
              )}>
                {selectedEmployee ? (
                  <>
                    <span className="text-xs text-blue-500 font-semibold block uppercase tracking-wider mb-1">Employee</span>
                    <span className="text-sm truncate max-w-full">{selectedEmployee.full_name}</span>
                  </>
                ) : (
                  'No Employee Selected'
                )}
              </div>

              {/* Connecting indicators */}
              <div className="flex flex-col items-center justify-center text-slate-400">
                <GitCommit className="w-4 h-4 text-blue-500 animate-bounce" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">maps to report to</span>
              </div>

              {/* Manager display */}
              <div className={cn(
                "p-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-200",
                selectedManager 
                  ? "bg-purple-50 border-purple-200 text-purple-900 font-bold scale-102" 
                  : "bg-white/80 border-slate-200 border-dashed text-slate-400 italic text-xs"
              )}>
                {selectedManager ? (
                  <>
                    <span className="text-xs text-purple-500 font-semibold block uppercase tracking-wider mb-1">Manager</span>
                    <span className="text-sm truncate max-w-full">{selectedManager.full_name}</span>
                  </>
                ) : (
                  'No Manager Selected'
                )}
              </div>
            </div>

            {/* Execute Button */}
            <Button
              onClick={handleAssignHierarchy}
              disabled={!selectedEmpId || !selectedMgrId}
              className={cn(
                "w-full mt-6 text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5",
                selectedEmpId && selectedMgrId 
                  ? "bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02] transform duration-150 cursor-pointer" 
                  : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              Assign Reporting Line
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Card>
        </div>

        {/* Right selector panel: Managers */}
        <div className="lg:col-span-4 flex flex-col">
          <Card className="flex-1 border border-slate-200 bg-white flex flex-col overflow-hidden max-h-[500px]">
            <CardHeader className="pb-4 shrink-0 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                2. Select Manager
              </CardTitle>
              <CardDescription className="text-xs">Find manager to receive direct report.</CardDescription>
              <div className="relative mt-3">
                <Search className="absolute inset-y-0 left-3 w-3.5 h-3.5 my-auto text-slate-400" />
                <Input
                  placeholder="Search managers..."
                  value={mgrSearch}
                  onChange={(e) => setMgrSearch(e.target.value)}
                  className="pl-8 text-xs bg-white text-slate-800"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 divide-y divide-slate-50">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Loading manager logs...</div>
              ) : filteredManagers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No active managers matching search criteria.</div>
              ) : (
                filteredManagers.map((mgr) => {
                  const isSelected = selectedMgrId === mgr.id
                  const directsCount = employeesList.filter(e => e.manager_id === mgr.id).length

                  return (
                    <div
                      key={mgr.id}
                      onClick={() => setSelectedMgrId(mgr.id)}
                      className={cn(
                        "p-4 flex items-center justify-between cursor-pointer transition-all duration-150 border-l-2",
                        isSelected 
                          ? "bg-purple-50/80 border-purple-600 text-purple-900" 
                          : "border-transparent hover:bg-slate-50/60 text-slate-700"
                      )}
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-semibold block truncate">{mgr.full_name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate">{mgr.department || 'Corporate Division'}</span>
                      </div>
                      
                      <Badge variant="secondary" className="text-[9px] font-bold bg-slate-100 border-none text-slate-600 shrink-0">
                        {directsCount} Direct Reports
                      </Badge>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reporting hierarchy listing tree view */}
      <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div>
            <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
              <Network className="w-5 h-5 text-slate-600" />
              Organizational Tree Overview
            </CardTitle>
            <CardDescription className="text-xs">Visual list representing corporate managers and assigned direct reports.</CardDescription>
          </div>
          
          <div className="relative">
            <Search className="absolute inset-y-0 left-3 w-4 h-4 my-auto text-slate-400" />
            <Input
              placeholder="Search tree..."
              value={hierarchySearch}
              onChange={(e) => setHierarchySearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-xs bg-white text-slate-800 focus:ring-blue-600 w-full sm:w-52"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Syncing hierarchy tree view...</div>
          ) : filteredHierarchy.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No managers found matching criteria.</div>
          ) : (
            filteredHierarchy.map((item) => {
              const managerInitials = getInitials(item.manager.full_name)

              return (
                <div key={item.manager.id} className="p-6 space-y-4">
                  {/* Manager Header Details */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center font-bold text-sm shadow-sm select-none shrink-0">
                      {managerInitials}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 leading-none">
                        {item.manager.full_name}
                        <Badge variant="outline" className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border-indigo-200/50 py-0 uppercase">Manager</Badge>
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1.5 font-light">{item.manager.email} | Dept: {item.manager.department || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Direct Reports branch lists */}
                  <div className="pl-6 border-l-2 border-dashed border-slate-100 space-y-2.5 ml-5">
                    {item.reports.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic font-light pl-3 py-1">No employees assigned to report to this manager yet.</p>
                    ) : (
                      item.reports.map((rep) => {
                        const employeeInitials = getInitials(rep.full_name)
                        return (
                          <div key={rep.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group/row">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs select-none shrink-0">
                                {employeeInitials}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 text-xs truncate block leading-none">{rep.full_name}</span>
                                <span className="text-[10px] text-slate-400 mt-1 block font-light truncate">{rep.email} | Dept: {rep.department || 'N/A'}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleUnmapHierarchy(rep.id, rep.full_name)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg opacity-0 group-hover/row:opacity-100 transition-all shrink-0"
                              title="Unmap employee reporting line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
