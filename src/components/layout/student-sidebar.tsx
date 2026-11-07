'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  User,
  LogOut,
  Menu,
  X,
  Dumbbell,
} from 'lucide-react'

const navItems = [
  { href: '/mi-cuenta', label: 'Inicio', icon: LayoutDashboard },
  { href: '/mi-cuenta/horarios', label: 'Horarios', icon: Calendar },
  { href: '/mi-cuenta/reservas', label: 'Mis Reservas', icon: BookOpen },
  { href: '/mi-cuenta/cuenta', label: 'Mi Cuenta', icon: User },
]

interface StudentSidebarProps {
  alumnoNombre: string
}

export default function StudentSidebar({ alumnoNombre }: StudentSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-brand-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-white font-black text-sm leading-none">RYM Pilates</p>
            <p className="text-brand-300 text-xs mt-0.5">Mi Panel</p>
          </div>
        </div>
      </div>

      {/* Alumno info */}
      <div className="px-6 py-4 border-b border-brand-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {alumnoNombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{alumnoNombre}</p>
            <p className="text-brand-300 text-xs">Alumno</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-brand-100 hover:bg-brand-700 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-brand-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-brand-200 hover:bg-brand-700 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-brand-700 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-brand-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-white" />
          <span className="text-white font-black text-sm">RYM Pilates</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20 flex">
          <div className="w-64 bg-brand-700 flex flex-col pt-16">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}
