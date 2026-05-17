'use client'

import { authService } from '@/services/auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const handleLogout = async () => {
    await authService.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">A</div>
          <span className="font-bold text-slate-900 tracking-tight">Atomberg Goals</span>
          <span className="ml-4 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">Employee</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
