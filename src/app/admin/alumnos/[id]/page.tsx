"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
} from "lucide-react";
import {
  formatDate,
  formatCurrency,
  getPaymentStatus,
  diasHastaVencimiento,
  PLANES,
} from "@/lib/utils";
import type { Alumno, Pago, Reserva, Clase } from "@/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { addMonths, format } from "date-fns";

export default function AlumnoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [reservas, setReservas] = useState<(Reserva & { clase: Clase })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pagoModal, setPagoModal] = useState(false);
  const [pago, setPago] = useState({ monto: "", metodo: "efectivo", notas: "" });

  async function load() {
    const [{ data: a }, { data: p }, { data: r }] = await Promise.all([
      supabase.from("alumnos").select("*").eq("id", id).single(),
      supabase.from("pagos").select("*").eq("alumno_id", id).order("fecha_pago", { ascending: false }),
      supabase
        .from("reservas")
        .select("*, clase:clases(*)")
        .eq("alumno_id", id)
        .order("fecha", { ascending: false })
        .limit(20),
    ]);
    setAlumno(a);
    setPagos(p || []);
    setReservas(r as any || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleSaveAlumno() {
    if (!alumno) return;
    setSaving(true);
    await supabase.from("alumnos").update({
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      telefono: alumno.telefono,
      email: alumno.email,
      plan_id: alumno.plan_id,
      notas: alumno.notas,
    }).eq("id", id);
    setSaving(false);
    setEditing(false);
    load();
  }

  async function handleRegistrarPago() {
    if (!alumno || !pago.monto) return;
    setSaving(true);
    const plan = PLANES.find((p) => p.id === alumno.plan_id)!;
    const nuevaFecha = format(addMonths(new Date(), 1), "yyyy-MM-dd");
    const periodo = format(new Date(), "yyyy-MM");

    await supabase.from("pagos").insert({
      alumno_id: id,
      monto: Number(pago.monto),
      fecha_pago: format(new Date(), "yyyy-MM-dd"),
      periodo,
      plan_id: alumno.plan_id,
      metodo: pago.metodo,
      notas: pago.notas,
    });

    // Renovar cuota del alumno
    await supabase.from("alumnos").update({
      fecha_vencimiento: nuevaFecha,
      clases_restantes: plan.clases,
    }).eq("id", id);

    setSaving(false);
    setPagoModal(false);
    setPago({ monto: "", metodo: "efectivo", notas: "" });
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!alumno) return <p className="text-center text-gray-500">Alumno no encontrado</p>;

  const estado = getPaymentStatus(alumno.fecha_vencimiento);
  const dias = diasHastaVencimiento(alumno.fecha_vencimiento);
  const plan = PLANES.find((p) => p.id === alumno.plan_id);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link href="/admin/alumnos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Volver a alumnos
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-brand-100 flex items-center justify-center text-xl font-bold text-brand-700">
            {alumno.nombre[0]}{alumno.apellido[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{alumno.nombre} {alumno.apellido}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={!alumno.activo ? "default" : "success"}>{alumno.activo ? "Activo" : "Inactivo"}</Badge>
              <Badge variant={estado === "vencido" ? "danger" : estado === "proximo" ? "warning" : "success"}>
                {estado === "vencido" ? "⚠ Cuota vencida" : estado === "proximo" ? "Por vencer" : "Al día"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit2 size={15} /> Editar
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleSaveAlumno} loading={saving}>
                <Save size={15} /> Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alerta vencimiento */}
      {estado === "vencido" && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-red-700">
            ⚠ La cuota venció hace <strong>{Math.abs(dias)} días</strong>
            {alumno.fecha_vencimiento ? ` (${formatDate(alumno.fecha_vencimiento)})` : ""}.
          </p>
          <Button size="sm" onClick={() => setPagoModal(true)}>
            <CreditCard size={14} /> Registrar pago
          </Button>
        </div>
      )}
      {estado === "proximo" && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-yellow-700">
            La cuota vence en <strong>{dias} días</strong>
            {alumno.fecha_vencimiento ? ` (${formatDate(alumno.fecha_vencimiento)})` : ""}.
          </p>
          <Button size="sm" onClick={() => setPagoModal(true)}>
            <CreditCard size={14} /> Registrar pago
          </Button>
        </div>
      )}

      {/* Datos principales */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Datos personales</h2>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombre" value={alumno.nombre} onChange={(e) => setAlumno({ ...alumno, nombre: e.target.value })} />
              <Input label="Apellido" value={alumno.apellido} onChange={(e) => setAlumno({ ...alumno, apellido: e.target.value })} />
            </div>
            <Input label="Teléfono" value={alumno.telefono} onChange={(e) => setAlumno({ ...alumno, telefono: e.target.value })} />
            <Input label="Email" value={alumno.email} onChange={(e) => setAlumno({ ...alumno, email: e.target.value })} />
            <Select
              label="Plan"
              value={alumno.plan_id}
              onChange={(e) => setAlumno({ ...alumno, plan_id: e.target.value })}
              options={PLANES.map((p) => ({ value: p.id, label: `${p.nombre} — ${formatCurrency(p.precio)}` }))}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {alumno.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={15} className="text-gray-400" />
                <span>{alumno.telefono}</span>
              </div>
            )}
            {alumno.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={15} className="text-gray-400" />
                <span>{alumno.email}</span>
              </div>
            )}
            {alumno.fecha_nacimiento && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={15} className="text-gray-400" />
                <span>{formatDate(alumno.fecha_nacimiento)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <CreditCard size={15} className="text-gray-400" />
              <span>{plan?.nombre} — {formatCurrency(plan?.precio || 0)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Cuota y clases */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-gray-500 mb-1">Vencimiento cuota</p>
          <p className="text-xl font-bold text-gray-900">
            {alumno.fecha_vencimiento ? formatDate(alumno.fecha_vencimiento) : "Sin fecha"}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => setPagoModal(true)}
          >
            <CreditCard size={14} /> Registrar pago
          </Button>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Clases restantes</p>
          <p className="text-4xl font-bold text-brand-600">{alumno.clases_restantes}</p>
          <p className="text-xs text-gray-400 mt-1">de {plan?.clases} del plan</p>
        </Card>
      </div>

      {/* Historial de pagos */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Historial de pagos</h2>
          <Button size="sm" onClick={() => setPagoModal(true)}>
            <CreditCard size={14} /> Nuevo pago
          </Button>
        </div>
        {pagos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(p.monto)}</p>
                  <p className="text-xs text-gray-500">{formatDate(p.fecha_pago)} · {p.metodo}</p>
                </div>
                <Badge variant="success">Pago {p.periodo}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Historial de reservas */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Últimas reservas</h2>
        {reservas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin reservas</p>
        ) : (
          <div className="space-y-2">
            {reservas.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.clase?.nombre}</p>
                  <p className="text-xs text-gray-500">{formatDate(r.fecha)} · {r.clase?.hora_inicio.slice(0, 5)}</p>
                </div>
                <Badge
                  variant={
                    r.estado === "asistio" ? "success" :
                    r.estado === "cancelada" ? "danger" : "info"
                  }
                >
                  {r.estado === "asistio" ? "Asistió" :
                   r.estado === "cancelada" ? "Cancelada" :
                   r.estado === "ausente" ? "Ausente" : "Confirmada"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal registrar pago */}
      <Modal open={pagoModal} onClose={() => setPagoModal(false)} title="Registrar pago">
        <div className="space-y-4">
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
            <strong>{alumno.nombre} {alumno.apellido}</strong> · {plan?.nombre}
            <br />
            Al pagar se renovará la cuota por 1 mes y se restaurarán {plan?.clases} clases.
          </div>
          <Input
            label="Monto *"
            type="number"
            value={pago.monto}
            onChange={(e) => setPago({ ...pago, monto: e.target.value })}
            placeholder={formatCurrency(plan?.precio || 0).replace("$ ", "")}
          />
          <Select
            label="Método de pago"
            value={pago.metodo}
            onChange={(e) => setPago({ ...pago, metodo: e.target.value })}
            options={[
              { value: "efectivo", label: "Efectivo" },
              { value: "transferencia", label: "Transferencia" },
              { value: "debito", label: "Tarjeta de débito" },
              { value: "credito", label: "Tarjeta de crédito" },
            ]}
          />
          <Input
            label="Notas"
            value={pago.notas}
            onChange={(e) => setPago({ ...pago, notas: e.target.value })}
            placeholder="Opcional"
          />
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setPagoModal(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleRegistrarPago} loading={saving}>
              Confirmar pago
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
