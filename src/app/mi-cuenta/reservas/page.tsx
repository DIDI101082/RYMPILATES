'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { format, parseISO, isFuture, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

export default function MisReservasPage() {
  const [reservas, setReservas] = useState<any[]>([])
  const [alumno, setAlumno] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'proximas' | 'pasadas'>('proximas')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: alumnoData } = await supabase
      .from('alumnos').select('*').eq('auth_user_id', user.id).single()
    if (!alumnoData) return
    setAlumno(alumnoData)

    const { data: reservasData } = await supabase
      .from('reservas')
      .select(`
        id, fecha, asistio,
        clases (id, nombre, disciplina, hora_inicio, hora_fin)
      `)
      .eq('alumno_id', alumnoData.id)
      .order('fecha', { ascending: false })

    setReservas(reservasData || [])
    setLoading(false)
  }

  async function cancelarReserva(reservaId: string) {
    if (!alumno) return
    setCancelando(reservaId)

    const { error } = await supabase.from('reservas').delete().eq('id', reservaId)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al cancelar' })
    } else {
      await supabase
        .from('alumnos')
        .update({ clases_restantes: alumno.clases_restantes + 1 })
        .eq('id', alumno.id)

      setMensaje({ tipo: 'ok', texto: 'Reserva cancelada. Se devolvió una clase a tu saldo.' })
      cargarDatos()
    }
    setCancelando(null)
    setTimeout(() => setMensaje(null), 4000)
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center h-64 items-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const hoy = format(new Date(), 'yyyy-MM-dd')
  const proximas = reservas.filter(r => r.fecha >= hoy)
  const pasadas = reservas.filter(r => r.fecha < hoy)
  const lista = filtro === 'proximas' ? proximas : pasadas

  const disciplinaColor: Record<string, string> = {
    Pilates: 'bg-brand-100 text-brand-700',
    Yoga: 'bg-green-100 text-green-700',
    Stretching: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Mis Reservas</h1>

      {mensaje && (
        <div className={`mb-4 px-5 py-3 rounded-xl text-sm font-semibold ${
          mensaje.tipo === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFiltro('proximas')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            filtro === 'proximas'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Próximas ({proximas.length})
        </button>
        <button
          onClick={() => setFiltro('pasadas')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            filtro === 'pasadas'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Historial ({pasadas.length})
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {lista.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">
              {filtro === 'proximas'
                ? 'No tenés clases reservadas'
                : 'No hay historial de clases'}
            </p>
          </div>
        )}

        {lista.map(reserva => {
          const clase = Array.isArray(reserva.clases) ? reserva.clases[0] : reserva.clases
          const esFutura = reserva.fecha >= hoy

          return (
            <div
              key={reserva.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4"
            >
              {/* Fecha */}
              <div className="text-center min-w-[52px] bg-gray-50 rounded-xl py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">
                  {format(parseISO(reserva.fecha), 'MMM', { locale: es })}
                </p>
                <p className="text-2xl font-black text-gray-900">
                  {format(parseISO(reserva.fecha), 'd')}
                </p>
                <p className="text-xs text-gray-400">
                  {format(parseISO(reserva.fecha), 'EEE', { locale: es })}
                </p>
              </div>

              {/* Info */}
              <div className="flex-1">
                <p className="font-bold text-gray-800">{clase?.nombre}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {clase?.hora_inicio?.slice(0, 5)} – {clase?.hora_fin?.slice(0, 5)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${disciplinaColor[clase?.disciplina] || 'bg-gray-100 text-gray-600'}`}>
                    {clase?.disciplina}
                  </span>
                  {!esFutura && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
                      reserva.asistio === true
                        ? 'bg-green-100 text-green-700'
                        : reserva.asistio === false
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {reserva.asistio === true && <><CheckCircle className="w-3 h-3" /> Asistí</>}
                      {reserva.asistio === false && <><XCircle className="w-3 h-3" /> Ausente</>}
                      {reserva.asistio === null && <><AlertCircle className="w-3 h-3" /> Sin confirmar</>}
                    </span>
                  )}
                </div>
              </div>

              {/* Acción */}
              {esFutura && (
                <button
                  onClick={() => cancelarReserva(reserva.id)}
                  disabled={cancelando === reserva.id}
                  className="text-sm px-4 py-2 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  {cancelando === reserva.id ? '...' : 'Cancelar'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
