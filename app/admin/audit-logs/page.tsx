'use client'

import { useEffect, useState } from 'react'
import { adminService, AuditLog } from '@/services/admin'
import { authService } from '@/services/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  History, 
  Search, 
  ArrowRight, 
  Sliders, 
  Unlock, 
  CheckCircle2, 
  User, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Database,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  // Expanded details tracking
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set())

  const loadData = async () => {
    try {
      setLoading(true)
      const auditLogs = await adminService.getAuditLogs()
      setLogs(auditLogs)
    } catch (error) {
      toast.error('Failed to retrieve system audit logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleExpandLog = (id: string) => {
    const next = new Set(expandedLogIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedLogIds(next)
  }

  // Format dates beautifully
  const formatTimestamp = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  // Generate beautiful icons matching action
  const getActionIcon = (action: string) => {
    if (action.includes('unlock')) {
      return (
        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shadow-sm shrink-0">
          <Unlock className="w-4 h-4" />
        </div>
      )
    }
    if (action.includes('approve')) {
      return (
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      )
    }
    return (
      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm shrink-0">
        <Sliders className="w-4 h-4" />
      </div>
    )
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'update_user_profile': return 'Profile Registry Updated'
      case 'unlock_goals': return 'Approved Goals Unlocked'
      case 'force_approve_goals': return 'Goals Force Approved (Override)'
      default: return action
    }
  }

  // Highly robust custom Property Diffs Comparator
  const renderDiffs = (oldVal: any, newVal: any) => {
    if (!oldVal && !newVal) {
      return <span className="text-slate-400 italic text-xs leading-normal">No detailed JSON values were modified.</span>
    }

    // Primitives comparator
    if (typeof oldVal !== 'object' || typeof newVal !== 'object') {
      return (
        <div className="flex flex-wrap items-center gap-2 text-xs py-1">
          <span className="line-through text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-mono break-all max-w-full">
            {JSON.stringify(oldVal)}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold font-mono break-all max-w-full">
            {JSON.stringify(newVal)}
          </span>
        </div>
      )
    }

    // Objects comparator (key by key)
    const keys = Array.from(new Set([
      ...Object.keys(oldVal || {}), 
      ...Object.keys(newVal || {})
    ])).filter(k => k !== 'updated_at' && k !== 'created_at') // omit standard timestamps

    const changedKeys = keys.filter(k => JSON.stringify(oldVal?.[k]) !== JSON.stringify(newVal?.[k]))

    if (changedKeys.length === 0) {
      return <span className="text-slate-400 italic text-xs leading-normal">No specific data fields were modified.</span>
    }

    return (
      <div className="space-y-2 border border-slate-100 rounded-xl bg-slate-50/50 p-4 font-mono text-xs">
        {changedKeys.map(key => {
          const oldPropValue = oldVal?.[key]
          const newPropValue = newVal?.[key]
          
          return (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 py-1.5 border-b border-slate-100 last:border-none">
              <span className="font-bold text-slate-600 shrink-0 min-w-[100px]">{key}:</span>
              
              <div className="flex flex-wrap items-center gap-2">
                {oldPropValue !== undefined && (
                  <span className="line-through text-red-500 bg-red-50/70 border border-red-100/50 px-2 py-0.5 rounded truncate max-w-[220px]" title={JSON.stringify(oldPropValue)}>
                    {JSON.stringify(oldPropValue)}
                  </span>
                )}
                
                {oldPropValue !== undefined && newPropValue !== undefined && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                
                {newPropValue !== undefined && (
                  <span className="text-emerald-700 bg-emerald-50/70 border border-emerald-100/50 px-2 py-0.5 rounded font-bold truncate max-w-[220px]" title={JSON.stringify(newPropValue)}>
                    {JSON.stringify(newPropValue)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Filter logs matching criteria
  const filteredLogs = logs.filter(log => {
    const search = searchTerm.toLowerCase()
    
    // Match against actor details
    const actorName = log.profiles?.full_name?.toLowerCase() || ''
    const actorEmail = log.profiles?.email?.toLowerCase() || ''
    const actionLabel = log.action.toLowerCase()
    const entityType = log.entity_type.toLowerCase()
    const entityId = log.entity_id.toLowerCase()

    const searchMatch = actorName.includes(search) || 
                        actorEmail.includes(search) || 
                        actionLabel.includes(search) || 
                        entityType.includes(search) ||
                        entityId.includes(search)

    const actionMatch = actionFilter === 'all' || log.action === actionFilter

    return searchMatch && actionMatch
  })

  // Extract unique actions to build search filter list
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)))

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Review operational actions, permission modifications, and structural overrides.</p>
      </div>

      {/* Filters card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute inset-y-0 left-3 w-4 h-4 my-auto text-slate-400" />
          <Input
            placeholder="Search email, action, entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs bg-white text-slate-800 focus:ring-blue-600 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-10 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer min-w-[140px]"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {getActionLabel(act)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline lists */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400 font-medium bg-white border border-slate-200 rounded-2xl shadow-sm">
          <History className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-bounce" />
          Syncing cryptographic security audit trail...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-400 font-medium bg-white border border-slate-200 rounded-2xl shadow-sm">
          No security logs matching search queries.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogIds.has(log.id)
            const initials = log.profiles?.full_name ? log.profiles.full_name.slice(0, 2).toUpperCase() : 'AD'

            return (
              <Card key={log.id} className="border border-slate-200 bg-white hover:shadow-sm transition-all duration-200 overflow-hidden">
                <div 
                  onClick={() => toggleExpandLog(log.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 transition-colors select-none"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Action Icon */}
                    {getActionIcon(log.action)}

                    {/* Meta Data */}
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm flex flex-wrap items-center gap-2">
                        {getActionLabel(log.action)}
                        <Badge variant="secondary" className="bg-slate-100 border-none font-bold text-[9px] uppercase tracking-wider text-slate-500 py-0.5">
                          {log.entity_type}
                        </Badge>
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 mt-1 font-light">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-300" />
                          Actor: <strong className="text-slate-600 font-bold">{log.profiles?.full_name || 'Admin'}</strong> ({log.profiles?.email})
                        </span>
                        
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          {formatTimestamp(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand Indicators */}
                  <button className="text-slate-400 hover:text-slate-600 p-1 rounded-lg shrink-0">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {/* Collapsible expanded detail diff logs */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/20 p-5 space-y-4 animate-in slide-in-from-top-1 duration-200">
                    {/* ID indicators */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light text-slate-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <Database className="w-4 h-4 text-slate-300 shrink-0" />
                        Log ID: <span className="font-mono text-slate-500 font-bold select-all">{log.id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <ExternalLink className="w-4 h-4 text-slate-300 shrink-0" />
                        Target Entity ID: <span className="font-mono text-slate-500 font-bold select-all">{log.entity_id}</span>
                      </div>
                    </div>

                    {/* Custom properties changes list */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Changed Properties Diffs</span>
                      {renderDiffs(log.old_value, log.new_value)}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
