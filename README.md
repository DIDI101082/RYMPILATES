# 🧘 RYM Pilates — Sistema de gestión

App web completa para gestionar el estudio RYM Pilates (Pilates Reformer, Yoga y Stretching).

## ✨ Funcionalidades

- **Dashboard**: resumen del día con alertas de cuotas vencidas
- **Alumnos**: alta, baja, edición, búsqueda y filtrado por estado de cuota
- **Pagos**: registro de cobros, historial, alertas automáticas de vencimiento
- **Horarios**: gestión de clases semanales fijas (Lunes a Sábado)
- **Reservas**: reservar / cancelar turnos por día con control de capacidad (3 camas)
- **Asistencia**: marcar si el alumno asistió o estuvo ausente

---

## 🛠️ Stack tecnológico

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend / DB**: Supabase (PostgreSQL)
- **Deploy**: Vercel (recomendado)

---

## 🚀 Instalación paso a paso

### 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New project
2. Ir a **SQL Editor** → New Query
3. Pegar y ejecutar el contenido de `supabase/schema.sql`
4. Ir a **Project Settings → API** y copiar:
   - `Project URL`
   - `anon public key`

### 2. Configurar variables de entorno

Copiar el archivo de ejemplo:
```bash
cp .env.local.example .env.local
```

Editar `.env.local` con tus valores de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Instalar dependencias y correr

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### 4. Deploy en Vercel

1. Subir el proyecto a GitHub
2. Ir a [vercel.com](https://vercel.com) → Import Project
3. Configurar las mismas variables de entorno
4. Deploy ✅

---

## 📋 Planes configurados

| Plan | Clases/mes | Precio |
|------|-----------|--------|
| Plan 4 | 4 clases | $35.000 |
| Plan 8 | 8 clases | $45.000 |
| Plan 12 | 12 clases | $50.000 |

Para cambiar los precios, editar `src/lib/utils.ts` → array `PLANES`.

---

## ⚠️ Sistema de alertas de cuota

- **Rojo (VENCIDA)**: la fecha de vencimiento ya pasó
- **Amarillo (POR VENCER)**: vence en los próximos 5 días
- **Verde (AL DÍA)**: cuota vigente

Al registrar un pago, la cuota se renueva automáticamente por 1 mes y se restauran las clases del plan.

---

## 🏗️ Estructura del proyecto

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx          → Dashboard
│   │   ├── alumnos/
│   │   │   ├── page.tsx      → Lista de alumnos
│   │   │   └── [id]/page.tsx → Detalle de alumno
│   │   ├── horarios/page.tsx → Gestión de clases
│   │   ├── reservas/page.tsx → Reservas por día
│   │   └── pagos/page.tsx    → Gestión de pagos
│   └── layout.tsx
├── components/
│   ├── ui/                   → Botones, inputs, modales, etc.
│   └── layout/               → Sidebar de navegación
├── lib/
│   ├── supabase/             → Cliente de Supabase
│   └── utils.ts              → Helpers y constantes
└── types/index.ts            → TypeScript types
supabase/
└── schema.sql                → SQL completo para Supabase
```
