"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { DIAS_SEMANA, DISCIPLINAS } from "@/lib/utils";
import type { Clase } from "@/types";

export default function HorariosPage() {
  const supabase = createClient();
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Clase | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    disciplina: "Pilates Reformer",
    dia_semana: "1",
    hora_inicio: "08:00",
    hora_fin: "09:00",
    capacidad: "3",
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("clases").select("*").order("dia_semana").order("hora_inicio");
    setClases(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setForm({ nombre: "", disciplina: "Pilates Reformer", dia_semana: "1", hora_inicio: "08:00", hora_fin: "09:00", capacidad: "3" });
    setModalOpen(true);
  }

  function abrirEditar(c: Clase) {
    setEditando(c);
    setForm({
      nombre: c.nombre,
      disciplina: c.disciplina,
      dia_semana: String(c.dia_semana),
      hora_inicio: c.hora_inicio,
      hora_fin: c.hora_fin,
      capacidad: String(c.capacidad),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      disciplina: form.disciplina,
      dia_semana: Number(form.dia_semana),
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      capacidad: Number(form.capacidad),
      activa: true,
    };
    if (editando) {
      await supabase.from("clases").update(payload).eq("id", editando.id);
    } else {
      await supabase.from("clases").insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta clase? Se eliminarán también sus reservas futuras.")) return;
    await supabase.from("clases").delete().eq("id", id);
    load();
  }

  async function toggleActiva(c: Clase) {
    await supabase.from("clases").update({ activa: !c.activa }).eq("id", c.id);
    load();
  }

  // Agrupar por día
  const porDia = DIAS_SEMANA.map((d) => ({
    ...d,
    clases: clases.filter((c) => c.dia_semana === d.value),
  }));

  const disciplinaColor: Record<string, string> = {
    "Pilates Reformer": "bg-brand-100 text-brand-700",
    "Yoga": "bg-green-100 text-green-700",
    "Stretching": "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
          <p className="text-sm text-gray-500 mt-1">{clases.filter(c => c.activa).length} clases activas</p>
        </div>
        <Button onClick={abrirNuevo}>
          <Plus size={16} /> Nueva clase
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {porDia.filter((d) => d.clases.length > 0).map((dia) => (
            <div key={dia.value} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-700">{dia.label}</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {dia.clases.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)).map((clase) => (
                  <div key={clase.id} className={`flex items-center gap-4 px-5 py-4 ${!clase.activa ? "opacity-50" : ""}`}>
                    <div className="flex h-12 w-20 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <span className="text-sm font-bold">{clase.hora_inicio.slice(0, 5)}</span>
                      <span className="text-xs text-brand-500">{clase.hora_fin.slice(0, 5)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{clase.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${disciplinaColor[clase.disciplina] || "bg-gray-100 text-gray-600"}`}>
                          {clase.disciplina}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={11} /> {clase.capacidad} camas
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={clase.activa ? "success" : "default"}>
                        {clase.activa ? "Activa" : "Inactiva"}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => abrirEditar(clase)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEliminar(clase.id)}>
                        <Trash2 size={14} className="text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {clases.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Clock size={40} className="mb-3 opacity-30" />
              <p>No hay clases configuradas todavía</p>
              <Button className="mt-4" onClick={abrirNuevo}>
                <Plus size={16} /> Agregar primera clase
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? "Editar clase" : "Nueva clase"}
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la clase *"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Pilates Mañana"
          />
          <Select
            label="Disciplina"
            value={form.disciplina}
            onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
            options={DISCIPLINAS.map((d) => ({ value: d, label: d }))}
          />
          <Select
            label="Día de la semana"
            value={form.dia_semana}
            onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}
            options={DIAS_SEMANA.map((d) => ({ value: String(d.value), label: d.label }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hora inicio"
              type="time"
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
            />
            <Input
              label="Hora fin"
              type="time"
              value={form.hora_fin}
              onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
            />
          </div>
          <Select
            label="Capacidad (camas)"
            value={form.capacidad}
            onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
            options={[
              { value: "1", label: "1 cama" },
              { value: "2", label: "2 camas" },
              { value: "3", label: "3 camas (máximo)" },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} loading={saving}>
              {editando ? "Guardar cambios" : "Crear clase"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
