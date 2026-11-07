"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Users, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate, formatDateLong, DIAS_SEMANA } from "@/lib/utils";
import type { Alumno, Clase, Reserva } from "@/types";
import { format, addDays, subDays, parseISO, getDay } from "date-fns";
import { es } from "date-fns/locale";

export default function ReservasPage() {
  const supabase = createClient();
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [clases, setClases] = useState<Clase[]>([]);
  const [reservas, setReservas] = useState<(Reserva & { alumno: Alumno; clase: Clase })[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [claseSeleccionada, setClaseSeleccionada] = useState<Clase | null>(null);
  const [alumnoId, setAlumnoId] = useState("");
  const [saving, setSaving] = useState(false);

  const diaSemana = (() => {
    const d = getDay(parseISO(fecha));
    return d === 0 ? 7 : d;
  })();

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: r }, { data: a }] = await Promise.all([
      supabase.from("clases").select("*").eq("dia_semana", diaSemana).eq("activa", true).order("hora_inicio"),
      supabase.from("reservas").select("*, alumno:alumnos(*), clase:clases(*)").eq("fecha", fecha),
      supabase.from("alumnos").select("*").eq("activo", true).order("apellido"),
    ]);
    setClases(c || []);
    setReservas(r as any || []);
    setAlumnos(a || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [fecha]);

  function prevDay() { setFecha(format(subDays(parseISO(fecha), 1), "yyyy-MM-dd")); }
  function nextDay() { setFecha(format(addDays(parseISO(fecha), 1), "yyyy-MM-dd")); }

  function abrirReserva(clase: Clase) {
    setClaseSeleccionada(clase);
    setAlumnoId("");
    setModalOpen(true);
  }

  async function handleReservar() {
    if (!claseSeleccionada || !alumnoId) return;
    setSaving(true);
    // Verificar que no tenga ya reserva
    const existente = reservas.find(r => r.alumno_id === alumnoId && r.clase_id === claseSeleccionada.id && r.estado !== "cancelada");
    if (existente) {
      alert("Este alumno ya tiene reserva para esta clase.");
      setSaving(false);
      return;
    }
    // Verificar capacidad
    const ocupadas = reservas.filter(r => r.clase_id === claseSeleccionada.id && r.estado !== "cancelada").length;
    if (ocupadas >= claseSeleccionada.capacidad) {
      alert("La clase está completa.");
      setSaving(false);
      return;
    }
    await supabase.from("reservas").insert({
      alumno_id: alumnoId,
      clase_id: claseSeleccionada.id,
      fecha,
      estado: "confirmada",
    });
    // Descontar clase
    const alumno = alumnos.find(a => a.id === alumnoId);
    if (alumno && alumno.clases_restantes > 0) {
      await supabase.from("alumnos").update({ clases_restantes: alumno.clases_restantes - 1 }).eq("id", alumnoId);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleCancelar(reserva: Reserva) {
    if (!confirm("¿Cancelar esta reserva?")) return;
    await supabase.from("reservas").update({ estado: "cancelada" }).eq("id", reserva.id);
    // Devolver clase
    const alumno = alumnos.find(a => a.id === reserva.alumno_id);
    if (alumno) {
      await supabase.from("alumnos").update({ clases_restantes: alumno.clases_restantes + 1 }).eq("id", reserva.alumno_id);
    }
    load();
  }

  async function handleMarcarAsistencia(reserva: Reserva, estado: "asistio" | "ausente") {
    await supabase.from("reservas").update({ estado }).eq("id", reserva.id);
    load();
  }

  const alumnosDisponibles = alumnos.filter(a =>
    !reservas.find(r => r.alumno_id === a.id && r.clase_id === claseSeleccionada?.id && r.estado !== "cancelada")
  );

  return (
    <div className="space-y-6">
      {/* Header con navegación de fecha */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1">
          <button
            onClick={prevDay}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col items-center px-3 min-w-0">
            <span className="text-sm font-semibold text-gray-900 capitalize">
              {format(parseISO(fecha), "EEEE", { locale: es })}
            </span>
            <span className="text-xs text-gray-500">
              {format(parseISO(fecha), "dd/MM/yyyy")}
            </span>
          </div>
          <button
            onClick={nextDay}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFecha(format(new Date(), "yyyy-MM-dd"))}
            className="text-xs"
          >
            Hoy
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-600" />
        </div>
      ) : clases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <AlertCircle size={40} className="mb-3 opacity-30" />
          <p>No hay clases programadas para este día</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clases.map((clase) => {
            const reservasClase = reservas.filter(r => r.clase_id === clase.id && r.estado !== "cancelada");
            const canceladas = reservas.filter(r => r.clase_id === clase.id && r.estado === "cancelada");
            const ocupacion = reservasClase.length;
            const pct = (ocupacion / clase.capacidad) * 100;
            const llena = ocupacion >= clase.capacidad;

            return (
              <div key={clase.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                {/* Cabecera de clase */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-14 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <span className="text-sm font-bold">{clase.hora_inicio.slice(0, 5)}</span>
                      <span className="text-xs text-brand-400">{clase.hora_fin.slice(0, 5)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{clase.nombre}</h3>
                      <p className="text-xs text-gray-500">{clase.disciplina}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className={`text-sm font-bold ${llena ? "text-red-600" : "text-gray-900"}`}>
                          {ocupacion}/{clase.capacidad}
                        </span>
                        <Users size={14} className="text-gray-400" />
                      </div>
                      <div className="mt-1 h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 66 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={llena}
                      onClick={() => abrirReserva(clase)}
                    >
                      <Plus size={14} />
                      {llena ? "Llena" : "Reservar"}
                    </Button>
                  </div>
                </div>

                {/* Reservas de la clase */}
                {reservasClase.length === 0 && canceladas.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-gray-400 text-center">
                    Sin reservas todavía
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {reservasClase.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                          {r.alumno?.nombre[0]}{r.alumno?.apellido[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {r.alumno?.nombre} {r.alumno?.apellido}
                          </p>
                          <p className="text-xs text-gray-400">{r.alumno?.plan_id}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={r.estado === "asistio" ? "success" : r.estado === "ausente" ? "danger" : "info"}>
                            {r.estado === "confirmada" ? "Confirmada" : r.estado === "asistio" ? "Asistió" : "Ausente"}
                          </Badge>
                          {r.estado === "confirmada" && (
                            <>
                              <button
                                onClick={() => handleMarcarAsistencia(r, "asistio")}
                                className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                                title="Marcar asistencia"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                onClick={() => handleMarcarAsistencia(r, "ausente")}
                                className="rounded-lg p-1.5 text-orange-500 hover:bg-orange-50 transition-colors"
                                title="Marcar ausencia"
                              >
                                <AlertCircle size={16} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleCancelar(r)}
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 transition-colors"
                            title="Cancelar reserva"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {canceladas.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 px-5 py-3 opacity-40">
                        <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                          {r.alumno?.nombre[0]}{r.alumno?.apellido[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 line-through">
                            {r.alumno?.nombre} {r.alumno?.apellido}
                          </p>
                        </div>
                        <Badge variant="default">Cancelada</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva reserva */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva reserva">
        <div className="space-y-4">
          {claseSeleccionada && (
            <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
              <strong>{claseSeleccionada.nombre}</strong><br />
              {format(parseISO(fecha), "EEEE dd/MM/yyyy", { locale: es })} · {claseSeleccionada.hora_inicio.slice(0, 5)}
            </div>
          )}
          <Select
            label="Alumno *"
            value={alumnoId}
            onChange={(e) => setAlumnoId(e.target.value)}
            placeholder="Seleccionar alumno..."
            options={alumnosDisponibles.map((a) => ({
              value: a.id,
              label: `${a.apellido}, ${a.nombre} (${a.clases_restantes} clases restantes)`,
            }))}
          />
          {alumnosDisponibles.length === 0 && (
            <p className="text-xs text-gray-500">Todos los alumnos activos ya tienen reserva para esta clase.</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleReservar} loading={saving} disabled={!alumnoId}>
              Confirmar reserva
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
