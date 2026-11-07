-- ============================================================
-- RYM PILATES - Schema de base de datos para Supabase
-- Ejecutar en: Supabase > SQL Editor > New Query
-- ============================================================

-- Tabla de alumnos
CREATE TABLE IF NOT EXISTS public.alumnos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  fecha_nacimiento DATE,
  plan_id TEXT NOT NULL DEFAULT 'plan_4',
  clases_restantes INTEGER NOT NULL DEFAULT 4,
  fecha_vencimiento DATE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de clases (horarios fijos semanales)
CREATE TABLE IF NOT EXISTS public.clases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  disciplina TEXT NOT NULL DEFAULT 'Pilates Reformer',
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 6), -- 1=Lunes, 6=Sábado
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  capacidad INTEGER NOT NULL DEFAULT 3,
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- Tabla de reservas
CREATE TABLE IF NOT EXISTS public.reservas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  clase_id UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'confirmada'
    CHECK (estado IN ('confirmada', 'cancelada', 'asistio', 'ausente')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  monto NUMERIC(12, 2) NOT NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  periodo TEXT NOT NULL, -- formato YYYY-MM
  plan_id TEXT NOT NULL,
  metodo TEXT NOT NULL DEFAULT 'efectivo'
    CHECK (metodo IN ('efectivo', 'transferencia', 'debito', 'credito')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_alumnos_activo ON public.alumnos(activo);
CREATE INDEX IF NOT EXISTS idx_alumnos_vencimiento ON public.alumnos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON public.reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_alumno ON public.reservas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_reservas_clase ON public.reservas(clase_id);
CREATE INDEX IF NOT EXISTS idx_pagos_alumno ON public.pagos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_periodo ON public.pagos(periodo);
CREATE INDEX IF NOT EXISTS idx_clases_dia ON public.clases(dia_semana);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- Policy: acceso público (sin autenticación por ahora)
-- Para producción, reemplazar por políticas autenticadas

CREATE POLICY "allow_all_alumnos" ON public.alumnos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_clases" ON public.clases
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_reservas" ON public.reservas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_pagos" ON public.pagos
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Datos de ejemplo (clases iniciales de RYM Pilates)
-- ============================================================

INSERT INTO public.clases (nombre, disciplina, dia_semana, hora_inicio, hora_fin, capacidad) VALUES
  ('Pilates Mañana', 'Pilates Reformer', 1, '08:00', '09:00', 3),
  ('Pilates Tarde', 'Pilates Reformer', 1, '18:00', '19:00', 3),
  ('Yoga Mañana', 'Yoga', 2, '09:00', '10:00', 3),
  ('Pilates Miércoles', 'Pilates Reformer', 3, '08:00', '09:00', 3),
  ('Stretching Tarde', 'Stretching', 3, '17:00', '18:00', 3),
  ('Pilates Jueves', 'Pilates Reformer', 4, '18:00', '19:00', 3),
  ('Yoga Tarde', 'Yoga', 4, '19:00', '20:00', 3),
  ('Pilates Viernes', 'Pilates Reformer', 5, '08:00', '09:00', 3),
  ('Pilates Sábado', 'Pilates Reformer', 6, '09:00', '10:00', 3),
  ('Yoga Sábado', 'Yoga', 6, '10:00', '11:00', 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Vista útil: alumnos con estado de cuota
-- ============================================================

CREATE OR REPLACE VIEW public.alumnos_con_estado AS
SELECT
  a.*,
  CASE
    WHEN a.fecha_vencimiento IS NULL THEN 'vencido'
    WHEN a.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
    WHEN a.fecha_vencimiento <= CURRENT_DATE + INTERVAL '5 days' THEN 'proximo'
    ELSE 'al_dia'
  END AS estado_cuota,
  (a.fecha_vencimiento - CURRENT_DATE) AS dias_hasta_vencimiento
FROM public.alumnos a
WHERE a.activo = TRUE;

-- ============================================================
-- Función: renovar cuota al registrar pago
-- (opcional, se puede usar desde la app también)
-- ============================================================

CREATE OR REPLACE FUNCTION public.renovar_cuota(
  p_alumno_id UUID,
  p_plan_id TEXT
) RETURNS void AS $$
DECLARE
  v_clases INTEGER;
BEGIN
  -- Obtener número de clases del plan
  v_clases := CASE p_plan_id
    WHEN 'plan_4' THEN 4
    WHEN 'plan_8' THEN 8
    WHEN 'plan_12' THEN 12
    ELSE 4
  END;

  UPDATE public.alumnos SET
    fecha_vencimiento = CURRENT_DATE + INTERVAL '1 month',
    clases_restantes = v_clases
  WHERE id = p_alumno_id;
END;
$$ LANGUAGE plpgsql;
