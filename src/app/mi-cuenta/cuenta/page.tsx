import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPaymentStatus, formatDate, formatCurrency, PLANES } from '@/lib/utils'
import { User, CreditCard, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default async function MiCuentaPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: alumno } = await supabase
    .from('alumnos')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!alumno) redirect('/login')

  const { data: pagos } = await supabase
    .from('pagos')
    .select('*')
    .eq('alumno_id', alumno.id)
    .order('fecha_pago', { ascending: false })
    .limit(10)

  const estado = getPaymentStatus(alumno.fecha_vencimiento)

  const estadoConfig = {
    al_dia: { label: 'Al día', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
    proximo: { label: 'Próximo a vencer', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    vencido: { label: 'Vencida', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  }[estado]

  const StatusIcon = estadoConfig.icon

  const planActual = PLANES.find(p => p.clases === alumno.plan_tipo)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Mi Cuenta</h1>

      {/* Datos personales */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <User className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-gray-800">Datos personales</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Nombre</p>
              <p className="text-gray-900 font-semibold">{alumno.nombre}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</p>
              <p className="text-gray-900">{alumno.email || user.email}</p>
            </div>
            {alumno.telefono && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Teléfono</p>
                <p className="text-gray-900">{alumno.telefono}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan y cuota */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <CreditCard className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-gray-800">Plan y cuota</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-brand-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">Plan actual</p>
              <p className="text-2xl font-black text-brand-700">{alumno.plan_tipo}</p>
              <p className="text-xs text-brand-500">clases / mes</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Clases restantes</p>
              <p className={`text-2xl font-black ${alumno.clases_restantes <= 2 ? 'text-orange-600' : 'text-gray-800'}`}>
                {alumno.clases_restantes}
              </p>
              <p className="text-xs text-gray-400">disponibles</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Estado de cuota</p>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${estadoConfig.color}`}>
                <StatusIcon className="w-4 h-4" />
                {estadoConfig.label}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Vencimiento</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="font-semibold text-gray-800">{formatDate(alumno.fecha_vencimiento)}</p>
              </div>
            </div>
          </div>

          {planActual && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Planes disponibles</p>
              <div className="grid grid-cols-3 gap-2">
                {PLANES.map(plan => (
                  <div
                    key={plan.clases}
                    className={`rounded-xl p-3 text-center border ${
                      plan.clases === alumno.plan_tipo
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <p className={`text-lg font-black ${plan.clases === alumno.plan_tipo ? 'text-brand-700' : 'text-gray-700'}`}>
                      {plan.clases}
                    </p>
                    <p className="text-xs text-gray-400">clases</p>
                    <p className={`text-xs font-semibold mt-1 ${plan.clases === alumno.plan_tipo ? 'text-brand-600' : 'text-gray-500'}`}>
                      {formatCurrency(plan.precio)}
                    </p>
                    {plan.clases === alumno.plan_tipo && (
                      <p className="text-xs text-brand-600 font-bold mt-1">Tu plan</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {estado !== 'al_dia' && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
              💡 Para renovar tu cuota, contactate con el estudio por WhatsApp o durante tu próxima clase.
            </div>
          )}
        </div>
      </div>

      {/* Historial de pagos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <Calendar className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-gray-800">Historial de pagos</h2>
        </div>

        <div className="divide-y divide-gray-50">
          {!pagos || pagos.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-400 text-sm">Sin pagos registrados</p>
            </div>
          ) : (
            pagos.map(pago => (
              <div key={pago.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Plan {pago.plan_tipo} clases</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(pago.fecha_pago)} · {pago.metodo_pago || 'Efectivo'}
                  </p>
                </div>
                <span className="font-black text-brand-600 text-lg">{formatCurrency(pago.monto)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
