"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatCard, Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  AlertTriangle,
  Calendar,
  DollarSign,
  Clock,
  TrendingUp,
  Bell,
} from "lucide-react";
import { formatCurrency, formatDate, getPaymentStatus, PLANES } from "@/lib/utils";
import Link from "next/link";
import type { Alumno, Pago, Reserva, Clase } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [reservasHoy, setReservasHoy] = useState<(Reserva & { alumno: Alumno; clase: Clase })[]>([]);
  const [clasesHoy, setClasesHoy] = useState<Clase[]>([]);
  const [ingresosMes, setIngresosMes] = useState(0);

  const hoy = format(new Date(), "yyyy-MM-dd");
  const diaSemana = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const mesActual = format(new Date(), "yyyy-MM");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: alumnosData }, { data: clasesData }, { data: reservasData }, { data: pagosData }] =
        await Promise.all([
          supabase.from("alumnos").select("*").eq("activo", true),
          supabase.from("clases").select("*").eq("dia_semana", diaSemana).eq("activa", true),
          supabase
            .from("reservas")
            .select("*, alumno:alumnos(*), clase:clases(*)")
            .eq("fecha", hoy)
            .neq("estado", "cancelada"),
          supabase
            .from("pagos")
            .select("monto")
            .eq("periodo", mesActual),
        ]);

      setAlumnos(alumnosData || []);
      setClasesHoy(clasesData || []);
      setReservasHoy(reservasData as any || []);
      setIngresosMes(
        (pagosData || []).reduce((sum: number, p: { monto: number }) => sum + p.monto, 0)
      );
      setLoading(false);
    }
    load();
  }, []);

  const alumnosVencidos = alumnos.filter(
    (a) => getPaymentStatus(a.fecha_vencimiento) === "vencido"
  );
  const alumnosProximos = alumnos.filter(
    (a) => getPaymentStatus(a.fecha_vencimiento) === "proximo"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">
          {format(new Date(), "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Alertas de vencimiento */}
      {(alumnosVencidos.length > 0 || alumnosProximos.length > 0) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} className="text-red-600" />
            <h2 className="font-semibold text-red-800">Alertas de cuota</h2>
          </div>
          <div className="space-y-2">
            {alumnosVencidos.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                    {a.nombre[0]}{a.apellido[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.nombre} {a.apellido}</p>
                    <p className="text-xs text-gray-500">Venció: {a.fecha_vencimiento ? formatDate(a.fecha_vencimiento) : "Sin fecha"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="danger">VENCIDA</Badge>
                  <Link href={`/admin/alumnos/${a.id}`} className="text-xs text-brand-600 hover:underline">Ver</Link>
                </div>
              </div>
            ))}
            {alumnosProximos.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-700">
                    {a.nombre[0]}{a.apellido[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.nombre} {a.apellido}</p>
                    <p className="text-xs text-gray-500">Vence: {a.fecha_vencimiento ? formatDate(a.fecha_vencimiento) : "Sin fecha"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">POR VENCER</Badge>
                  <Link href={`/admin/alumnos/${a.id}`} className="text-xs text-brand-600 hover:underline">Ver</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Alumnos activos"
          value={alumnos.length}
          icon={<Users size={22} />}
          color="default"
        />
        <StatCard
          title="Cuotas vencidas"
          value={alumnosVencidos.length}
          icon={<AlertTriangle size={22} />}
          color="danger"
          subtitle={`${alumnosProximos.length} próximas a vencer`}
        />
        <StatCard
          title="Clases hoy"
          value={clasesHoy.length}
          icon={<Clock size={22} />}
          color="success"
        />
        <StatCard
          title="Ingresos del mes"
          value={formatCurrency(ingresosMes)}
          icon={<DollarSign size={22} />}
          color="success"
        />
      </div>

      {/* Clases de hoy */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={18} className="text-brand-600" />
            Clases de hoy
          </h2>
          <Link href="/admin/horarios" className="text-sm text-brand-600 hover:underline">
            Ver horarios →
          </Link>
        </div>
        {clasesHoy.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No hay clases programadas para hoy</p>
        ) : (
          <div className="space-y-3">
            {clasesHoy.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)).map((clase) => {
              const reservasDeLaClase = reservasHoy.filter((r) => r.clase_id === clase.id);
              const ocupacion = reservasDeLaClase.length;
              const pct = (ocupacion / clase.capacidad) * 100;
              return (
                <div key={clase.id} className="flex items-center gap-4 rounded-xl border border-gray-100 p-3">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <span className="text-xs font-bold">{clase.hora_inicio.slice(0, 5)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{clase.nombre}</p>
                    <p className="text-xs text-gray-500">{clase.disciplina}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{ocupacion}/{clase.capacidad}</p>
                    <div className="mt-1 h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 66 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Reservas de hoy */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-brand-600" />
            Reservas de hoy
          </h2>
          <Link href="/admin/reservas" className="text-sm text-brand-600 hover:underline">
            Ver todas →
          </Link>
        </div>
        {reservasHoy.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No hay reservas para hoy</p>
        ) : (
          <div className="space-y-2">
            {reservasHoy.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                    {r.alumno?.nombre[0]}{r.alumno?.apellido[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.alumno?.nombre} {r.alumno?.apellido}</p>
                    <p className="text-xs text-gray-500">{r.clase?.nombre} · {r.clase?.hora_inicio.slice(0, 5)}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    r.estado === "confirmada" ? "info" :
                    r.estado === "asistio" ? "success" : "default"
                  }
                >
                  {r.estado === "confirmada" ? "Confirmada" :
                   r.estado === "asistio" ? "Asistió" : r.estado}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
