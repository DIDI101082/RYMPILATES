'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { format, addDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Users, Clock, CheckCircle } from 'lucide-react'

const DISCIPLINA_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  Pilates: { bg: 'border-l-brand-500', text: 'text-brand-700', badge: 'bg-brand-100 text-brand-700' },
  Yoga: { bg: 'border-l-green-500', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  Stretching: { bg: 'border-l-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function HorariosPage() {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [clases, setClases] = useState<any[]>([])
  const [reservas, setReservas] = useState<any[]>([])
  const [alumno, setAlumno] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reservando, setReservando] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const inicioSemana = startOfWeek(addDays(new Date(), semanaOffset * 7), { weekStartsOn: 1 })

  useEffect(() => {
    cargarDatos()
  }, [semanaOffset])

  async function cargarDatos() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (!alumnoData) return
    setAlumno(alumnoData)

    const { data: clasesData } = await supabase
      .from('clases')
      .select('*')
      .eq('activa', true)
      .order('hora_inicio')

    setClases(clasesData || [])

    // Reservas de esta semana
    const fechaInicio = format(inicioSemana, 'yyyy-MM-dd')
    const fechaFin = format(addDays(inicioSemana, 6), 'yyyy-MM-dd')

    const { data: reservasData } = await supabase
      .from('reservas')
      .select('*')
      .eq('alumno_id', alumnoData.id)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)

    setReservas(reservasData || [])
    setLoading(false)
  }

  async function reservar(claseId: string, fecha: string) {
    if (!alumno) return
    setReservando(claseId + fecha)
    setMensaje(null)

    // Verificar capacidad
    const { data: ocupadas } = await supabase
      .from('reservas')
      .select('id', { count: 'exact' })
      .eq('clase_id', claseId)
      .eq('fecha', fecha)

    const clase = clases.find(c => c.id === claseId)
    if (ocupadas && clase && ocupadas.length >= clase.capacidad_maxima) {
      setMensaje({ tipo: 'error', texto: 'La clase está llena' })
      setReservando(null)
      return
    }

    if (alumno.clases_restantes <= 0) {
      setMensaje({ tipo: 'error', texto: 'No tenés clases disponibles. Renovar cuota.' })
      setReservando(null)
      return
    }

    const { error } = await supabase.from('reservas').insert({
      alumno_id: alumno.id,
      clase_id: claseId,
      fecha,
    })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al reservar. Intentá de nuevo.' })
    } else {
      // Descontar clase
      await supabase
        .from('alumnos')
        .update({ clases_restantes: alumno.clases_restantes - 1 })
        .eq('id', alumno.id)

      setMensaje({ tipo: 'ok', texto: '¡Reserva confirmada!' })
      cargarDatos()
    }
    setReservando(null)
    setTimeout(() => setMensaje(null), 3000)
  }

  async function cancelar(reservaId: string, claseId: string, fecha: string) {
    if (!alumno) return
    setReservando(claseId + fecha)
    setMensaje(null)

    const { error } = await supabase.from('reservas').delete().eq('id', reservaId)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al cancelar' })
    } else {
      await supabase
        .from('alumnos')
        .update({ clases_restantes: alumno.clases_restantes + 1 })
        .eq('id', alumno.id)

      setMensaje({ tipo: 'ok', texto: 'Reserva cancelada' })
      cargarDatos()
    }
    setReservando(null)
    setTimeout(() => setMensaje(null), 3000)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Horarios</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSemanaOffset(s => s - 1)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSemanaOffset(0)}
            className="px-4 py-2 text-sm font-semibold text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50"
          >
            Esta semana
          </button>
          <button
            onClick={() => setSemanaOffset(s => s + 1)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info alumno */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl px-5 py-3 mb-6 flex items-center gap-4">
        <div>
          <span className="text-sm text-brand-700 font-medium">Clases disponibles: </span>
          <span className={`font-black text-lg ${alumno?.clases_restantes <= 2 ? 'text-orange-600' : 'text-brand-700'}`}>
            {alumno?.clases_restantes}
          </span>
        </div>
        <div className="w-px h-5 bg-brand-200" />
        <div>
          <span className="text-sm text-brand-700 font-medium">Plan: </span>
          <span className="font-semibold text-brand-700">{alumno?.plan_tipo} clases</span>
        </div>
      </div>

      {/* Alerta */}
      {mensaje && (
        <div className={`mb-4 px-5 py-3 rounded-xl text-sm font-semibold ${
          mensaje.tipo === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Grid semanal */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {DIAS.map((dia, idx) => {
          const fecha = addDays(inicioSemana, idx)
          const fechaStr = format(fecha, 'yyyy-MM-dd')
          const hoy = format(new Date(), 'yyyy-MM-dd')
          const esPasado = fechaStr < hoy
          const clasesDelDia = clases.filter(c => c.dia_semana === dia)

          return (
            <div key={dia} className={`bg-white rounded-2xl border ${fechaStr === hoy ? 'border-brand-400 shadow-md' : 'border-gray-100'}`}>
              {/* Cabecera día */}
              <div className={`px-3 py-3 text-center border-b ${fechaStr === hoy ? 'bg-brand-600 rounded-t-2xl' : 'bg-gray-50 rounded-t-2xl'}`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${fechaStr === hoy ? 'text-white' : 'text-gray-500'}`}>
                  {dia.slice(0, 3)}
                </p>
                <p className={`text-lg font-black ${fechaStr === hoy ? 'text-white' : 'text-gray-800'}`}>
                  {format(fecha, 'd')}
                </p>
              </div>

              {/* Clases */}
              <div className="p-2 space-y-2">
                {clasesDelDia.length === 0 && (
                  <p className="text-xs text-gray-300 text-center py-3">—</p>
                )}
                {clasesDelDia.map(clase => {
                  const colors = DISCIPLINA_COLORS[clase.disciplina] || DISCIPLINA_COLORS.Pilates
                  const reservaExistente = reservas.find(
                    r => r.clase_id === clase.id && r.fecha === fechaStr
                  )

                  return (
                    <div
                      key={clase.id}
                      className={`border-l-2 ${colors.bg} bg-gray-50 rounded-r-lg p-2`}
                    >
                      <p className="text-xs font-bold text-gray-700 leading-tight">{clase.nombre}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-400">{clase.hora_inicio?.slice(0,5)}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${colors.badge}`}>
                        {clase.disciplina}
                      </span>

                      {!esPasado && (
                        <div className="mt-2">
                          {reservaExistente ? (
                            <button
                              onClick={() => cancelar(reservaExistente.id, clase.id, fechaStr)}
                              disabled={reservando === clase.id + fechaStr}
                              className="w-full text-xs py-1 px-2 bg-green-50 text-green-700 border border-green-200 rounded-lg font-semibold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors disabled:opacity-50"
                            >
                              {reservando === clase.id + fechaStr ? '...' : '✓ Cancelar'}
                            </button>
                          ) : (
                            <button
                              onClick={() => reservar(clase.id, fechaStr)}
                              disabled={
                                reservando === clase.id + fechaStr ||
                                alumno?.clases_restantes <= 0
                              }
                              className="w-full text-xs py-1 px-2 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {reservando === clase.id + fechaStr ? '...' : 'Reservar'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
