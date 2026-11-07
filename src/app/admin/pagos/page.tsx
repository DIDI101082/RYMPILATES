"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, StatCard } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  DollarSign,
} from "lucide-react";
import {
  formatDate,
  formatCurrency,
  getPaymentStatus,
  diasHastaVencimiento,
  PLANES,
} from "@/lib/utils";
import type { Alumno, Pago } from "@/types";
import { format, addMonths } from "date-fns";

export default function PagosPage() {
  const supabase = createClient();
  const [pagos, setPagos] = useState<(Pago & { alumno: Alumno })[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState(format(new Date(), "yyyy-MM"));
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    alumno_id: "",
    monto: "",
    metodo: "efectivo",
    notas: "",
  });

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase
        .from("pagos")
        .select("*, alumno:alumnos(*)")
        .order("fecha_pago", { ascending: false }),
      supabase.from("alumnos").select("*").eq("activo", true).order("apellido"),
    ]);
    setPagos(p as any || []);
    setAlumnos(a || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleRegistrarPago() {
    if (!form.alumno_id || !form.monto) return;
    setSaving(true);
    const alumno = alumnos.find(a => a.id === form.alumno_id)!;
    const plan = PLANES.find(p => p.id === alumno.plan_id)!;
    const periodo = format(new Date(), "yyyy-MM");
    const nuevaFecha = format(addMonths(new Date(), 1), "yyyy-MM-dd");

    await Promise.all([
      supabase.from("pagos").insert({
        alumno_id: form.alumno_id,
        monto: Number(form.monto),
        fecha_pago: format(new Date(), "yyyy-MM-dd"),
        periodo,
        plan_id: alumno.plan_id,
        metodo: form.metodo,
        notas: form.notas,
      }),
      supabase.from("alumnos").update({
        fecha_vencimiento: nuevaFecha,
        clases_restantes: plan.clases,
      }).eq("id", form.alumno_id),
    ]);

    setSaving(false);
    setModalOpen(false);
    setForm({ alumno_id: "", monto: "", metodo: "efectivo", notas: "" });
    load();
  }

  // Pagos filtrados
  const pagosFiltrados = pagos.filter(p => {
    const matchSearch = `${p.alumno?.nombre} ${p.alumno?.apellido}`.toLowerCase().includes(search.toLowerCase());
    const matchPeriodo = !filtroPeriodo || p.periodo === filtroPeriodo;
    return matchSearch && matchPeriodo;
  });

  // Stats del período
  const totalPeriodo = pagosFiltrados.reduce((sum, p) => sum + p.monto, 0);

  // Alumnos con estado
  const alumnosVencidos = alumnos.filter(a => getPaymentStatus(a.fecha_vencimiento) === "vencido");
  const alumnosProximos = alumnos.filter(a => getPaymentStatus(a.fecha_vencimiento) === "proximo");
  const alumnosAlDia = alumnos.filter(a => getPaymentStatus(a.fecha_vencimiento) === "al_dia");

  // Generar últimos 6 meses para el select
  const periodos = Array.from({ length: 6 }, (_, i) => {
    const d = addMonths(new Date(), -i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: undefined }) };
  });

  const selectedAlumno = alumnos.find(a => a.id === form.alumno_id);
  const selectedPlan = PLANES.find(p => p.id === selectedAlumno?.plan_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de cuotas y cobros</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Registrar pago
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Ingresos del período"
          value={formatCurrency(totalPeriodo)}
          icon={<DollarSign size={22} />}
          color="success"
        />
        <StatCard
          title="Al día"
          value={alumnosAlDia.length}
          icon={<CheckCircle2 size={22} />}
          color="success"
        />
        <StatCard
          title="Por vencer (5 días)"
          value={alumnosProximos.length}
          icon={<CreditCard size={22} />}
          color="warning"
        />
        <StatCard
          title="Cuotas vencidas"
          value={alumnosVencidos.length}
          icon={<AlertTriangle size={22} />}
          color="danger"
        />
      </div>

      {/* Alumnos con alerta */}
      {(alumnosVencidos.length > 0 || alumnosProximos.length > 0) && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Requieren atención
          </h2>
          <div className="space-y-2">
            {[...alumnosVencidos, ...alumnosProximos].map((a) => {
              const estado = getPaymentStatus(a.fecha_vencimiento);
              const dias = diasHastaVencimiento(a.fecha_vencimiento);
              return (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${estado === "vencido" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {a.nombre[0]}{a.apellido[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.nombre} {a.apellido}</p>
                      <p className="text-xs text-gray-500">
                        {estado === "vencido"
                          ? `Vencida hace ${Math.abs(dias)} días`
                          : `Vence en ${dias} días (${formatDate(a.fecha_vencimiento!)})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={estado === "vencido" ? "danger" : "warning"}>
                      {estado === "vencido" ? "VENCIDA" : "POR VENCER"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setForm({ alumno_id: a.id, monto: String(PLANES.find(p => p.id === a.plan_id)?.precio || ""), metodo: "efectivo", notas: "" });
                        setModalOpen(true);
                      }}
                    >
                      Cobrar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Historial de pagos */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Historial de pagos</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Buscar alumno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm focus:border-brand-500 focus:outline-none w-44"
              />
            </div>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Todos los períodos</option>
              {periodos.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" />
          </div>
        ) : pagosFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay pagos registrados para este período</p>
        ) : (
          <div className="divide-y divide-gray-50 -mx-5">
            {pagosFiltrados.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                  {p.alumno?.nombre[0]}{p.alumno?.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.alumno?.nombre} {p.alumno?.apellido}</p>
                  <p className="text-xs text-gray-500">{formatDate(p.fecha_pago)} · {p.metodo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(p.monto)}</p>
                  <p className="text-xs text-gray-400">{p.periodo}</p>
                </div>
                <Badge variant="success">Pagado</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal registrar pago */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar pago">
        <div className="space-y-4">
          <Select
            label="Alumno *"
            value={form.alumno_id}
            onChange={(e) => {
              const a = alumnos.find(x => x.id === e.target.value);
              const plan = PLANES.find(p => p.id === a?.plan_id);
              setForm({ ...form, alumno_id: e.target.value, monto: String(plan?.precio || "") });
            }}
            placeholder="Seleccionar alumno..."
            options={alumnos.map(a => ({
              value: a.id,
              label: `${a.apellido}, ${a.nombre}${getPaymentStatus(a.fecha_vencimiento) === "vencido" ? " ⚠" : ""}`,
            }))}
          />
          {selectedAlumno && (
            <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
              Plan: <strong>{selectedPlan?.nombre}</strong> · Precio sugerido: <strong>{formatCurrency(selectedPlan?.precio || 0)}</strong><br />
              Vencimiento actual: {selectedAlumno.fecha_vencimiento ? formatDate(selectedAlumno.fecha_vencimiento) : "Sin fecha"}
            </div>
          )}
          <Input
            label="Monto *"
            type="number"
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
            placeholder="45000"
          />
          <Select
            label="Método de pago"
            value={form.metodo}
            onChange={(e) => setForm({ ...form, metodo: e.target.value })}
            options={[
              { value: "efectivo", label: "Efectivo" },
              { value: "transferencia", label: "Transferencia" },
              { value: "debito", label: "Tarjeta de débito" },
              { value: "credito", label: "Tarjeta de crédito" },
            ]}
          />
          <Input
            label="Notas"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            placeholder="Opcional"
          />
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleRegistrarPago}
              loading={saving}
              disabled={!form.alumno_id || !form.monto}
            >
              Confirmar pago
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
