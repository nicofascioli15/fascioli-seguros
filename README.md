# Fascioli Seguros — Intranet

Sistema interno de gestión para Fascioli Administraciones (corredor de seguros).

## Stack
- **Next.js 14** (App Router) + TypeScript
- **Supabase** (auth + PostgreSQL + Storage)
- **Vercel** (deploy)
- **Tailwind CSS + CSS Variables** (design system navy/gold)

## Módulos

| Módulo | Ruta | Descripción |
|---|---|---|
| Dashboard | `/dashboard` | Métricas generales y resumen |
| Clientes | `/clientes` | Gestión de clientes y sus pólizas |
| Pólizas | `/polizas` | Vista global de toda la cartera |
| Pagos | `/pagos` | Seguimiento de cobros por cuota |
| Vencimientos | `/vencimientos` | Alertas de pólizas próximas a vencer |
| Siniestros | `/siniestros` | Gestión de siniestros |
| Documentos | `/documentos` | Archivo de PDFs y documentos |
| Configuración | `/configuracion` | Ramos, compañías, métodos de pago |

## Setup

### 1. Clonar e instalar
```bash
git clone https://github.com/nicofascioli15/fascioli-seguros
cd fascioli-seguros
npm install
```

### 2. Variables de entorno
Crear `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Supabase — ejecutar schema
En el SQL Editor de Supabase ejecutar `/supabase/schema.sql`

### 4. Crear usuario de acceso
Supabase → Authentication → Users → Add user

### 5. Deploy
```bash
vercel --prod
```

## Pendiente post-MVP
- Conectar clientes/pólizas/pagos a Supabase real (hoy usan estado local)
- Configuración: ramos, compañías y catálogos editables desde UI
- Subida real de documentos a Supabase Storage
- Notificaciones de vencimientos por email
