import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, differenceInDays, isPast } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy", { locale: es });
}

export function formatDateLong(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEEE dd 'de' MMMM", { locale: es });
}

export function formatTime(time: string) {
  return time.slice(0, 5); // HH:MM
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getPaymentStatus(vencimiento: string | null): "al_dia" | "proximo" | "vencido" {
  if (!vencimiento) return "vencido";
  const diff = differenceInDays(parseISO(vencimiento), new Date());
  if (diff < 0) return "vencido";
  if (diff <= 5) return "proximo";
  return "al_dia";
}

export function diasHastaVencimiento(vencimiento: string | null): number {
  if (!vencimiento) return -999;
  return differenceInDays(parseISO(vencimiento), new Date());
}

export const PLANES = [
  { id: "plan_4", nombre: "4 clases/mes", clases: 4, precio: 35000 },
  { id: "plan_8", nombre: "8 clases/mes", clases: 8, precio: 45000 },
  { id: "plan_12", nombre: "12 clases/mes", clases: 12, precio: 50000 },
];

export const DISCIPLINAS = ["Pilates Reformer", "Yoga", "Stretching"];

export const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];
