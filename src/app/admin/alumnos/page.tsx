"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  Plus,
  Search,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Filter,
  AlertTriangle,
} from "lucide-react";
import {
  formatDate,
  formatCurrency,
  getPaymentStatus,
  diasHastaVencimiento,
  PLANES,
} from "@/lib/utils";
import type { Alumno } from "@/types";
import Link from "next/link";
import { addMonths, format } from "date-fns";

const estadoLabels = {
  al_dia: { label: "Al día", variant: "success" as const },
  proximo: { label: "Por vencer", variant: "warning" as const },
  vencido: { label: "Vencida", variant: "danger" as const },
};

export default function AlumnosPage() {
  const supabase = createClient();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    fecha_nacimiento: "",
    plan_id: "plan_4",
    notas: "",
  });

  async function loadAlumnos() {
    setLoading(true);
    const { data } = await supabase
      .from("alumnos")
      .select("*")
      .order("apellido");
    setAlumnos(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAlumnos();
  }, []);

  const filtrados = alumnos.filter((a) => {
    const matchSearch =
      `${a.nombre} ${a.apellido} ${a.email} ${a.telefono}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const estado = getPaymentStatus(a.fecha_vencimiento);
    const matchEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "activos" && a.activo) ||
      (filtroEstado === "inactivos" && !a.activo) ||
      filtroEstado === estado;
    return matchSearch && matchEstado;
  });

  async function handleSave() {
    if (!form.nombre || !form.apellido || !form.telefono) return;
    setSaving(true);
    const plan = PLANES.find((p) => p.id === form.plan_id)!;
    const vencimiento = format(addMonths(new Date(), 1), "yyyy-MM-dd");

    await supabase.from("alumnos").insert({
      ...form,
      activo: true,
      clases_restantes: plan.clases,
      fecha_vencimiento: vencimiento,
    });

    setSaving(false);
    setModalOpen(false);
    setForm({ nombre: "", apellido: "", telefono: "", email: "", fecha_nacimiento: "", plan_id: "plan_4", notas: "" });
    loadAlumnos();
  }

  async function toggleActivo(alumno: Alumno) {
    await supabase
      .from("alumnos")
      .update({ activo: !alumno.activo })
      .eq("id", alumno.id);
    loadAlumnos();
  }

  const vencidos = alumnos.filter((a) => getPaymentStatus(a.fecha_vencimiento) === "vencido" && a.activo).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alumnos</h1>
          <p className="text-sm text-gray-500 mt-1">{alumnos.filter(a => a.activo).length} activos · {vencidos > 0 && <span className="text-red-600 font-medium">{vencidos} con cuota vencida</span>}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Nuevo alumno
        </Button>
      </div>

      {/* Alerta global */}
      {vencidos > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{vencidos} alumno{vencidos > 1 ? "s" : ""}</strong> {vencidos > 1 ? "tienen" : "tiene"} la cuota vencida. Recordá contactarlos.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="vencido">Cuota vencida</option>
          <option value="proximo">Por vencer</option>
          <option value="al_dia">Al día</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <UserCheck size={40} className="mb-3 opacity-30" />
              <p>No hay alumnos que coincidan</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtrados.map((alumno) => {
                const estado = getPaymentStatus(alumno.fecha_vencimiento);
                const dias = diasHastaVencimiento(alumno.fecha_vencimiento);
                const plan = PLANES.find((p) => p.id === alumno.plan_id);
                return (
                  <div key={alumno.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${alumno.activo ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                      {alumno.nombre[0]}{alumno.apellido[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/alumnos/${alumno.id}`}
                          className="font-medium text-gray-900 hover:text-brand-600 transition-colors"
                        >
                          {alumno.apellido}, {alumno.nombre}
                        </Link>
                        {!alumno.activo && <Badge variant="default">Inactivo</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                        {alumno.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> {alumno.telefono}
                          </span>
                        )}
                        {alumno.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={11} /> {alumno.email}
                          </span>
                        )}
                        {plan && <span>{plan.nombre}</span>}
                      </div>
                    </div>

                    {/* Estado cuota */}
                    {alumno.activo && (
                      <div className="text-right shrink-0">
                        <Badge variant={estadoLabels[estado].variant}>
                          {estado === "vencido" && "⚠ "}
                          {estadoLabels[estado].label}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {estado === "vencido"
                            ? `Vencida hace ${Math.abs(dias)} días`
                            : estado === "proximo"
                            ? `Vence en ${dias} días`
                            : alumno.fecha_vencimiento ? formatDate(alumno.fecha_vencimiento) : ""}
                        </p>
                      </div>
                    )}

                    {/* Clases */}
                    <div className="hidden sm:block text-center shrink-0 w-14">
                      <p className="text-lg font-bold text-gray-900">{alumno.clases_restantes}</p>
                      <p className="text-xs text-gray-400">clases</p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/admin/alumnos/${alumno.id}`}>
                        <Button size="sm" variant="ghost">Ver</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActivo(alumno)}
                        title={alumno.activo ? "Desactivar" : "Activar"}
                      >
                        {alumno.activo ? <UserX size={15} className="text-gray-400" /> : <UserCheck size={15} className="text-green-600" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal nuevo alumno */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo alumno">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="María"
            />
            <Input
              label="Apellido *"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              placeholder="González"
            />
          </div>
          <Input
            label="Teléfono *"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="+54 11 1234-5678"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="maria@email.com"
          />
          <Input
            label="Fecha de nacimiento"
            type="date"
            value={form.fecha_nacimiento}
            onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
          />
          <Select
            label="Plan"
            value={form.plan_id}
            onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
            options={PLANES.map((p) => ({
              value: p.id,
              label: `${p.nombre} — ${formatCurrency(p.precio)}`,
            }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Observaciones adicionales..."
              rows={2}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} loading={saving}>
              Guardar alumno
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
