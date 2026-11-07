export type EstadoPago = "al_dia" | "proximo" | "vencido";
export type Disciplina = "Pilates Reformer" | "Yoga" | "Stretching";

export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fecha_nacimiento?: string;
  plan_id: string;
  clases_restantes: number;
  fecha_vencimiento: string | null;
  activo: boolean;
  notas?: string;
  created_at: string;
}

export interface Clase {
  id: string;
  nombre: string;
  disciplina: Disciplina;
  dia_semana: number; // 1=Lunes, 6=Sábado
  hora_inicio: string; // HH:MM
  hora_fin: string;
  capacidad: number; // máx 3 (camas reformer)
  activa: boolean;
}

export interface Reserva {
  id: string;
  alumno_id: string;
  clase_id: string;
  fecha: string; // YYYY-MM-DD
  estado: "confirmada" | "cancelada" | "asistio" | "ausente";
  created_at: string;
  alumno?: Alumno;
  clase?: Clase;
}

export interface Pago {
  id: string;
  alumno_id: string;
  monto: number;
  fecha_pago: string;
  periodo: string; // "2024-11" (YYYY-MM)
  plan_id: string;
  metodo: "efectivo" | "transferencia" | "debito" | "credito";
  notas?: string;
  alumno?: Alumno;
}

export interface DashboardStats {
  total_alumnos: number;
  alumnos_activos: number;
  pagos_vencidos: number;
  pagos_proximos: number;
  clases_hoy: number;
  reservas_hoy: number;
  ingresos_mes: number;
}
