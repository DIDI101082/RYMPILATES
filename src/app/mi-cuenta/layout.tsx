import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentSidebar from '@/components/layout/student-sidebar'

export default async function MiCuentaLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar alumno vinculado
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('nombre')
    .eq('auth_user_id', user.id)
    .single()

  if (!alumno) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50">
      <StudentSidebar alumnoNombre={alumno.nombre} />
      <main className="flex-1 overflow-auto lg:pt-0 pt-14">
        {children}
      </main>
    </div>
  )
}
