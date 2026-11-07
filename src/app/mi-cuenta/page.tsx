import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPaymentStatus, diasHastaVencimiento, formatDate, formatCurrency } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  BookOpen,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

export default async function MiCuentaDashboard() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Datos del alumno
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!alumno) redirect('/login')

  // Próximas reservas
  const hoy = new Date().toISOString().split('T')[0]
  const { data: proximasReservas } = await supabase
    .from('reservas')
    .select(`
      id,
      fecha,
      asistio,
      clases (hora_inicio, hora_fin, nombre, disciplina)
    `)
    .eq('alumno_id', alumno.id)
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .limit(3)

  // Pagos recientes
  const { data: pagosRecientes } = await supabase
    .from('pagos')
    .select('*')
    .eq('alumno_id', alumno.id)
    .order('fecha_pago', { ascending: false })
    .limit(3)

  const estado = getPaymentStatus(alumno.fecha_vencimiento)
  const diasHasta = diasHastaVencimiento(alumno.fecha_vencimiento)

  const estadoBadge = {
    al_dia: { label: 'Al día', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    proximo: { label: `Vence en ${diasHasta}d`, color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    vencido: { label: 'Cuota vencida', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  }[estado]

  const StatusIcon = estadoBadge.icon

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">
          Hola, {alumno.nombre.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Alerta vencimiento */}
      {estado === 'vencido' && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Tu cuota está vencida</p>
            <p className="text-red-600 text-sm mt-0.5">
              Contactá con el estudio para renovar y seguir reservando clases.
            </p>
          </div>
        </div>
      )}

      {estado === 'proximo' && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800">Tu cuota vence pronto</p>
            <p className="text-yellow-600 text-sm mt-0.5">
              Vence el {formatDate(alumno.fecha_vencimiento)}. Recordá renovar a tiempo.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</p>
          <p className="text-xl font-black text-gray-900 mt-1">{alumno.plan_tipo}</p>
          <p className="text-xs text-gray-400 mt-0.5">clases</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Restantes</p>
          <p className={`text-3xl font-black mt-1 ${alumno.clases_restantes <= 2 ? 'text-orange-600' : 'text-brand-600'}`}>
            {alumno.clases_restantes}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">clases</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</p>
          <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${estadoBadge.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {estadoBadge.label}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vencimiento</p>
          <p className="text-sm font-bold text-gray-900 mt-2 leading-tight">
            {formatDate(alumno.fecha_vencimiento)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Próximas clases */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              <h2 className="font-bold text-gray-800">Próximas clases</h2>
            </div>
            <Link
              href="/mi-cuenta/reservas"
              className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {!proximasReservas || proximasReservas.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No tenés clases reservadas</p>
                <Link
                  href="/mi-cuenta/horarios"
                  className="mt-3 inline-block text-sm text-brand-600 font-semibold hover:underline"
                >
                  Ver horarios disponibles →
                </Link>
              </div>
            ) : (
              proximasReservas.map((r: any) => {
                const clase = Array.isArray(r.clases) ? r.clases[0] : r.clases
                const disciplinaColor: Record<string, string> = {
                  Pilates: 'bg-brand-100 text-brand-700',
                  Yoga: 'bg-green-100 text-green-700',
                  Stretching: 'bg-orange-100 text-orange-700',
                }
                return (
                  <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="text-center min-w-[42px]">
                      <p className="text-xs font-semibold text-gray-400 uppercase">
                        {format(parseISO(r.fecha), 'EEE', { locale: es })}
                      </p>
                      <p className="text-lg font-black text-gray-900">
                        {format(parseISO(r.fecha), 'd')}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">{clase?.nombre}</p>
                      <p className="text-xs text-gray-400">{clase?.hora_inicio?.slice(0,5)} · {clase?.hora_fin?.slice(0,5)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${disciplinaColor[clase?.disciplina] || 'bg-gray-100 text-gray-600'}`}>
                      {clase?.disciplina}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {proximasReservas && proximasReservas.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-50">
              <Link
                href="/mi-cuenta/horarios"
                className="block text-center text-sm text-brand-600 font-semibold hover:underline"
              >
                + Reservar más clases
              </Link>
            </div>
          )}
        </div>

        {/* Pagos recientes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-gray-800">Pagos recientes</h2>
          </div>

          <div className="divide-y divide-gray-50">
            {!pagosRecientes || pagosRecientes.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-400 text-sm">Sin pagos registrados</p>
              </div>
            ) : (
              pagosRecientes.map((p: any) => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      Plan {p.plan_tipo}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(p.fecha_pago)}</p>
                  </div>
                  <span className="font-bold text-brand-600">{formatCurrency(p.monto)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
