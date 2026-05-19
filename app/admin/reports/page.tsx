'use client'

import { useEffect, useState } from 'react'
import { adminService } from '@/services/admin'
import { authService } from '@/services/auth'
import { Goal } from '@/types/goals'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts'
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Award, 
  CheckCircle2, 
  HelpCircle, 
  Building2,
  TrendingUp,
  Percent
} from 'lucide-react'
import { toast } from 'sonner'

export default function ReportsAnalyticsPage() {
  const [goals, setGoals] = useState<(Goal & { employee_name?: string | null; employee_email?: string | null })[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const allGoals = await adminService.getAllGoals()
      setGoals(allGoals)

      const allUsers = await adminService.getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      toast.error('Failed to compile corporate statistics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setMounted(true)
  }, [])

  // 1. Process Chart Data: Goal Status Counts
  const statusCounts = {
    draft: 0,
    pending_approval: 0,
    approved: 0,
    rework_requested: 0
  }

  goals.forEach(g => {
    if (g.status in statusCounts) {
      statusCounts[g.status as keyof typeof statusCounts]++
    } else {
      statusCounts.draft++
    }
  })

  const statusPieData = [
    { name: 'Approved', value: statusCounts.approved, color: '#10b981' },
    { name: 'Pending Manager', value: statusCounts.pending_approval, color: '#f59e0b' },
    { name: 'Rework Requested', value: statusCounts.rework_requested, color: '#ef4444' },
    { name: 'Draft Mode', value: statusCounts.draft, color: '#64748b' }
  ].filter(item => item.value > 0) // only show active segments

  // 2. Process Chart Data: Goals defined by Department
  const deptMap = new Map<string, { count: number; approved: number }>()
  
  // Resolve departments for goals
  const userDeptMap = new Map<string, string>()
  users.forEach(u => {
    if (u.id && u.department) {
      userDeptMap.set(u.id, u.department)
    }
  })

  goals.forEach(g => {
    const dept = userDeptMap.get(g.employee_id) || 'General'
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { count: 0, approved: 0 })
    }
    const metrics = deptMap.get(dept)!
    metrics.count++
    if (g.status === 'approved') {
      metrics.approved++
    }
  })

  const departmentBarData = Array.from(deptMap.entries()).map(([dept, metrics]) => ({
    name: dept,
    'Total Goals': metrics.count,
    'Approved Goals': metrics.approved
  }))

  // 3. Overall Stats Indicators
  const totalGoals = goals.length
  const totalEmployeesCount = users.filter(u => u.role === 'employee').length
  const avgGoals = totalEmployeesCount > 0 ? (totalGoals / totalEmployeesCount).toFixed(1) : '0'
  const approvedPercentage = totalGoals > 0 ? ((statusCounts.approved / totalGoals) * 100).toFixed(0) : '0'

  // 4. Export all Goals to CSV format
  const handleExportCSV = () => {
    if (goals.length === 0) {
      toast.error('No goal records exist to export.')
      return
    }

    try {
      // CSV Headers
      const headers = ['Employee Name', 'Employee Email', 'Department', 'Thrust Area', 'Goal Title', 'Description', 'UOM', 'Target Value', 'Weightage (%)', 'Status', 'Locked Status']
      
      const csvRows = [headers.join(',')]

      goals.forEach(g => {
        const dept = userDeptMap.get(g.employee_id) || 'General'
        
        // Escape commas and quotes for CSV stability
        const row = [
          `"${(g.employee_name || 'Unknown').replace(/"/g, '""')}"`,
          `"${(g.employee_email || 'N/A').replace(/"/g, '""')}"`,
          `"${dept.replace(/"/g, '""')}"`,
          `"${(g.thrust_area || '').replace(/"/g, '""')}"`,
          `"${(g.title || '').replace(/"/g, '""')}"`,
          `"${(g.description || '').replace(/"/g, '""')}"`,
          `"${g.uom_type.toUpperCase()}"`,
          `"${(g.target || '').replace(/"/g, '""')}"`,
          g.weightage,
          `"${g.status.toUpperCase()}"`,
          g.locked ? 'LOCKED' : 'UNLOCKED'
        ]
        csvRows.push(row.join(','))
      })

      // Download file action
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `Atomberg_Goals_Export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Successfully exported goal tracking sheets CSV!')
    } catch (err) {
      toast.error('Failed to export system spreadsheet.')
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Performance Reports</h1>
        <p className="text-xs text-slate-400 mt-1">Interactive visual analytics, progress bars, and spreadsheet aggregations.</p>
      </div>

      {/* Analytics Mini Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Objectives</span>
              <span className="text-2xl font-extrabold text-slate-800 block">{totalGoals} Total</span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approved Ratio</span>
              <span className="text-2xl font-extrabold text-emerald-600 block">{approvedPercentage}% Approved</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Percent className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Goals density</span>
              <span className="text-2xl font-extrabold text-slate-800 block">{avgGoals} / Employee</span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Departments Active</span>
              <span className="text-2xl font-extrabold text-purple-600 block">{deptMap.size} Active</span>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Department performance bar widget */}
        <Card className="lg:col-span-8 border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/40 border-b border-slate-100/80 px-6 py-5">
            <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-600" />
              Objectives Defined by Departments
            </CardTitle>
            <CardDescription className="text-xs">Compare counts of goals set and approved across business divisions.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 min-h-[340px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading bar charts...</div>
            ) : departmentBarData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No department logs currently recorded.</div>
            ) : mounted ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={departmentBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'semibold' }} />
                  <Bar dataKey="Total Goals" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="Approved Goals" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] w-full bg-slate-50/50 rounded-2xl animate-pulse flex items-center justify-center text-xs font-semibold text-slate-400">
                Loading analytics feed...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goal workflow division pie widget */}
        <Card className="lg:col-span-4 border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/40 border-b border-slate-100/80 px-6 py-5">
            <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
              <Percent className="w-5 h-5 text-slate-600" />
              Workflow Status Shares
            </CardTitle>
            <CardDescription className="text-xs">Ratios of current objective sheet stages.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center min-h-[340px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading pie charts...</div>
            ) : statusPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No goal sheets registered.</div>
            ) : mounted ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Custom Legend */}
                <div className="mt-4 space-y-2 text-xs">
                  {statusPieData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between font-medium">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </div>
                      <span className="font-bold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] w-full bg-slate-50/50 rounded-2xl animate-pulse flex items-center justify-center text-xs font-semibold text-slate-400">
                Loading analytics feed...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Corporate spreadsheet CSV generator download trigger box */}
      <Card className="border-blue-100 bg-gradient-to-br from-blue-50/20 to-blue-50/50 shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4.5">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 animate-pulse">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Enterprise Spreadsheet Downloader</h3>
            <p className="text-xs text-slate-500 mt-1 font-light leading-normal">
              Extract all registered company goals, department divisions, weight ratios, targets, and lock states into a formatted CSV report.
            </p>
          </div>
        </div>

        <Button
          onClick={handleExportCSV}
          disabled={loading || totalGoals === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center justify-center gap-1.5 shrink-0 shadow-sm hover:scale-[1.02] transform duration-150 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download CSV Report
        </Button>
      </Card>
    </div>
  )
}
