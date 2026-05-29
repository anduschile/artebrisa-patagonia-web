# Auditoría Técnica y Estratégica — Arte Brisa Patagonia

**Fecha:** 2026-05-25
**Sitio:** https://ab.anduschile.com/
**Repositorio:** artebrisa-patagonia (rama `main`)
**Auditor:** Análisis automatizado sobre el código fuente del proyecto

---

## Índice

1. [Parte 1 — Auditoría Técnica del Código](#parte-1--auditoría-técnica-del-código)
2. [Parte 2 — Auditoría Funcional (qué existe y qué falta)](#parte-2--auditoría-funcional-qué-existe-y-qué-falta)
3. [Parte 3 — Evaluación de lo Pendiente](#parte-3--evaluación-de-lo-pendiente)
4. [Parte 4 — Fortalezas, Debilidades y Riesgos](#parte-4--fortalezas-debilidades-y-riesgos)
5. [Parte 5 — Plan de Trabajo Sugerido](#parte-5--plan-de-trabajo-sugerido)
6. [Executive Summary (para el cliente)](#executive-summary-para-el-cliente)

---

# PARTE 1 — AUDITORÍA TÉCNICA DEL CÓDIGO

## 1.1 Stack y arquitectura

### Stack identificado
- **Framework**: **Vite 6** + **React 18.3** (no es Next.js ni Astro — es SPA cliente puro)
- **Lenguaje**: **JavaScript (no TypeScript)** en el frontend; **TypeScript + Deno** únicamente en la Edge Function
- **Routing**: `react-router-dom` v7
- **Animaciones**: `framer-motion` v11
- **Backend**: **Supabase** (PostgreSQL + Auth + Edge Functions)
- **Estilos**: **Tailwind CSS 3.4** + `index.css` con clases custom para los hero
- **Despliegue**: **Vercel** (con `vercel.json` que reescribe todo a `/` para soportar SPA)
- **CI**: GitHub Actions con un único workflow (`sync-ical`) que invoca la Edge Function cada 30 minutos por cron

Stack confirmado en [package.json](package.json) y [vite.config.js](vite.config.js).

### Estructura de carpetas

```
src/
├── App.jsx                  # Definición de rutas
├── main.jsx                 # Entry React + BrowserRouter
├── index.css                # Tailwind + estilos hero custom
├── components/
│   ├── Layout.jsx           # Navbar + Footer + StickyCTA + ChatWidget
│   ├── Navbar.jsx, Footer.jsx, HeroSection.jsx
│   ├── UnitCard.jsx, ImageCarousel.jsx
│   ├── ReservationWidget.jsx  # Widget de reserva (Supabase)
│   ├── ChatWidget.jsx         # Chatbot FAQ con derivación a WhatsApp
│   ├── StickyCTA.jsx, ScrollToTop.jsx, FilterBar.jsx, GalleryGlobal.jsx
│   ├── admin/
│   │   ├── AdminGuard.jsx, AdminLayout.jsx
│   │   ├── DashboardKPIs.jsx, MonthCalendar.jsx, WeekAgenda.jsx
│   │   ├── ReservationDetailDrawer.jsx, RateEditModal.jsx
│   └── sections/
│       └── ContactSection.jsx, FaqSection.jsx, GallerySection.jsx,
│         LocationSection.jsx, RatesSection.jsx, ServicesSection.jsx
├── pages/
│   ├── HomePage.jsx, CabanasPage.jsx, DepartamentosPage.jsx, UnitDetailPage.jsx
│   └── admin/
│       └── AdminLoginPage.jsx, AdminReservationsPage.jsx, AdminRatesPage.jsx
├── data/                    # Capa de datos (cliente Supabase)
│   ├── units.js, reservations.js, guests.js, channels.js
│   ├── unitDefaults.js, unitImages.js, subsiteSections.js
│   └── admin/  (reservations.js, units.js, icalSync.js)
├── lib/supabaseClient.js
├── config/                  # Constantes
│   ├── contact.js, chatBot.js, chatWidget.js
└── content/faq_es.js

supabase/
├── functions/sync-ical/     # Edge Function (Deno + TS)
│   ├── index.ts, deno.json
└── migrations/              # 4 migraciones SQL
    ├── 20260222_ical_sync.sql
    ├── 20260223_dynamic_rates.sql
    ├── 20260223_reservation_quotes.sql
    └── 20260224_units_is_active.sql

public/
├── images/  (60 MB — ver §1.3)
└── og-image.png
```

### Sistema de rutas

Definido en [src/App.jsx](src/App.jsx):

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `HomePage` | Público |
| `/cabanas` | `CabanasPage` | Público |
| `/departamentos` | `DepartamentosPage` | Público |
| `/unidad/:id` | `UnitDetailPage` | Público |
| `/admin` | `AdminLoginPage` | Público (login) |
| `/admin/reservas` | `AdminReservationsPage` | Protegido por `AdminGuard` |
| `/admin/tarifas` | `AdminRatesPage` | Protegido por `AdminGuard` |

El sitio es **SPA pura sin SSR**: ningún contenido se renderiza en servidor, todo se hidrata en cliente. `vercel.json` redirige todas las rutas a `/` para que React Router las maneje. Esto **es la limitación más relevante para SEO** (ver §1.4).

### Sistema de estilos

- **Tailwind** ([tailwind.config.js](tailwind.config.js)) con paleta `primary` extendida (azul cyan `#0891b2`) e Inter como fuente
- Estilos puntuales adicionales en [src/index.css](src/index.css) (28-161): clases `.hero`, `.hero--home`, `.hero--listing` con `background-image` apuntando a `/images/common/*.png`
- Iconografía **inline SVG** repetida en múltiples componentes (no se usa una librería tipo `lucide-react` ni un Iconset compartido) — ver §1.2

---

## 1.2 Calidad del código

### Lo bueno
- Estructura clara y predecible (`data/`, `components/`, `pages/`, `config/`, `content/`)
- Buen uso de `useMemo`/`useCallback` donde corresponde (admin, GalleryGlobal)
- Capa de datos centralizada por dominio en [src/data/](src/data/); los componentes no hablan directo con Supabase salvo casos puntuales
- Logging de errores en consola al menos consistente (`console.error('Error fetching ...')`)
- Helpers reutilizables: `formatCLP`, `getUnitImage`, `buildWaUrl`, `nightCount`

### Problemas detectados

#### a) Sin TypeScript pese a tener `@types/react` instalado
- [package.json](package.json) declara `@types/react` y `@types/react-dom` pero **no hay un solo `.ts`/`.tsx`** en `src/`
- El único TS del proyecto es la Edge Function (que no comparte tipos con el frontend)
- Esto es coherente con el tamaño del proyecto, pero el dominio (reservas, fechas, estados) ganaría mucho con tipos: hay 4 estados de reserva manejados como strings sueltos y al menos **dos nombres distintos** para el campo de capacidad (`capacidad_total` y `capacity_total`) que conviven en el código

#### b) Código duplicado — íconos SVG
Los mismos SVG (wifi, kitchen, heat, parking, tv, etc.) están inlineados al menos en:
- [src/components/UnitCard.jsx:13-71](src/components/UnitCard.jsx#L13-L71)
- [src/components/sections/ServicesSection.jsx:5-19](src/components/sections/ServicesSection.jsx#L5-L19)
- [src/pages/UnitDetailPage.jsx:19-77](src/pages/UnitDetailPage.jsx#L19-L77)
- [src/components/Navbar.jsx](src/components/Navbar.jsx) (logo + whatsapp inline)
- [src/components/Footer.jsx](src/components/Footer.jsx) (facebook + instagram inline)
- Más repeticiones del SVG completo de WhatsApp (el `<path d="M.057 24l...">`) en al menos **6 archivos**

**Recomendación**: extraer a `src/components/icons/` o instalar `lucide-react` (~6 KB tree-shaken).

#### c) Lógica casi idéntica en CabanasPage y DepartamentosPage
[src/pages/CabanasPage.jsx](src/pages/CabanasPage.jsx) y [src/pages/DepartamentosPage.jsx](src/pages/DepartamentosPage.jsx) son **clones 95 % idénticos** (mismo skeleton, misma carga, mismo grid, mismo filtro, mismo empty state). Diferencias reales: `variant`, capacidades y servicios.

**Recomendación**: unificar en un único `<UnitListingPage variant="cabana|departamento" />` parametrizable; sería un ahorro de ~100 líneas y elimina riesgo de divergencia.

#### d) Inconsistencia en nombres de campos del DB
- [src/components/ReservationWidget.jsx:357](src/components/ReservationWidget.jsx#L357) usa `unit.capacidad_total`
- [src/data/units.js:11](src/data/units.js#L11) selecciona `capacity_total` desde Postgres
- [src/data/units.js:33-46](src/data/units.js#L33-L46) selecciona `capacidad_total` (en español)
- [src/pages/CabanasPage.jsx:60](src/pages/CabanasPage.jsx#L60) hace `unit.capacidad_total ?? unit.capacity_total ?? unit.capacity` (✓ defensivo, pero síntoma del problema)

Esto sugiere que la columna real en Postgres se llama de una forma y el código intenta cubrirse contra ambas. **Conviene auditar el schema real y unificar a una sola convención** (probablemente `capacity_total` en inglés, alineado con `unit_type`, `base_price`, `is_active`).

#### e) `getConflicts` tiene una optimización incompleta
[src/data/reservations.js:14-32](src/data/reservations.js#L14-L32): consulta con `.lt('check_in', check_out)` y luego filtra en memoria por `check_out > check_in`. Está documentado y es correcto, pero también trae filas viejas con `check_in < new_check_out` y `check_out <= new_check_in` (que ya quedaron en el pasado), aumentando el payload con el tiempo. Conviene agregar `.gt('check_out', check_in)` adicional aunque PostgREST no compare columnas — al menos sirve para acotar por `check_out > now()`.

#### f) IDs hardcodeados en producción
[supabase/functions/sync-ical/index.ts:312](supabase/functions/sync-ical/index.ts#L312):
```ts
const guestId = 'c7782684-5e23-44b7-957a-4bfa5c41a7d2'
```
Y [supabase/functions/sync-ical/index.ts:328-331](supabase/functions/sync-ical/index.ts#L328-L331):
```ts
if (provider === 'airbnb') channelId = 'd7e30a58-...'
else if (provider === 'booking') channelId = '68df4842-...'
```
Estos UUIDs son específicos del proyecto Supabase actual. Si se restaura una BD desde otro entorno o se migra, los IDs cambian y la sincronización rompe en silencio. **Mejor**: resolver vía RPC/select con `code='AIRBNB' / 'BOOKING' / 'WEB'` al inicio de la función.

#### g) Manejo de errores: usa `alert()` en el panel admin
[src/pages/admin/AdminReservationsPage.jsx:181, 244](src/pages/admin/AdminReservationsPage.jsx#L181) y [src/components/admin/ReservationDetailDrawer.jsx:93](src/components/admin/ReservationDetailDrawer.jsx#L93) usan `alert(\`Error: ${e.message}\`)`. Funciona, pero **rompe el flujo móvil** y muestra el mensaje de error de Postgres al usuario admin. Un toast (`sonner`, `react-hot-toast`) sería mucho más profesional.

#### h) Archivos / código sin usar (dead code)
- [src/components/sections/GallerySection.jsx](src/components/sections/GallerySection.jsx) **existe pero no se importa en ningún lado** — fue reemplazado por `GalleryGlobal.jsx`. Eliminar.
- [src/data/subsiteSections.js:35-57](src/data/subsiteSections.js#L35-L57) define `SERVICES` muy similar al `SERVICES_BY_TYPE` de [src/data/unitDefaults.js:8-28](src/data/unitDefaults.js#L8-L28) — dos fuentes de verdad para los mismos íconos. Se usan en componentes distintos. **Unificar**.
- `objects.txt` (14 KB en la raíz) — parece un dump que no debería estar versionado.
- En [src/data/unitImages.js:21-25](src/data/unitImages.js#L21-L25) el mapeo de departamentos asigna nombres de carpeta (matrimonial/cuadruple-familiar/triple/cuadruple) que **no coinciden** con la convención `DEP-N`. Verificar que las carpetas existen.

#### i) Manejo de errores no propaga
Casi todas las funciones de `src/data/*.js` **devuelven `[]` o `null` ante error** y solo loguean (`console.error`). El componente nunca se entera del error real. Caso típico: [src/data/units.js:8-22](src/data/units.js#L8-L22). En cambio `reservations.js` sí hace `throw new Error(...)`, lo cual es la convención correcta. Conviene homogeneizar.

---

## 1.3 Performance

### El problema más grave de toda la web: **imágenes sin optimizar**

| Hallazgo | Detalle |
|---|---|
| Tamaño total de `public/` | **60 MB** |
| `public/images/common/` solo | **42 MB** (¡70 % del total!) |
| Imágenes PNG > 2 MB | **9 archivos** (`hero_cabanasa_artebrisa*.png` y `hero_departamentos_patagonia*.png`) |
| Formato | Todas son **PNG / JPG**, **ninguna WebP/AVIF** |
| `<img loading="lazy">` | Solo en [GalleryGlobal.jsx:39](src/components/GalleryGlobal.jsx#L39); el resto **no** |
| `<picture>` / `srcset` | **No se usa en ningún lugar** del proyecto |

**Hero PNG de 3.4 MB** se carga en cada visita a la home. En 3G/4G chileno fuera del centro (incluido Magallanes), esto es ≥ **6-8 segundos** de LCP solo por la imagen. El logo `/logo.svg` que se referencia en [index.html:5](index.html#L5) **ni siquiera existe** — devuelve 404 (el favicon real es `og-image.png`).

Además, hay duplicados sin uso: `hero_cabanasa_artebrisa0.png`, `1.png`, `2.png`, ..., `7.png` — solo se usa la versión sin sufijo. **Borrar suma ≥ 25 MB de menos en el repo**.

### Otros problemas de performance

- **Sin code splitting**: `App.jsx` importa estáticamente las páginas admin y públicas; el bundle baja completo incluso para visitantes que solo ven la home. Falta `React.lazy()` para `pages/admin/*`.
- **Framer Motion en todo**: 11.18 ocupa ~50 KB minified+gzipped; se usa para animaciones cosméticas (cards `whileInView`). Es aceptable, pero conviene saber el costo.
- **No hay `Cache-Control` configurado** en [vercel.json](vercel.json) ni `Content-Security-Policy`. Vercel pone defaults sensatos para assets, pero los HTML salen con `s-maxage=0`, lo que hace cada navegación un round-trip completo.
- **Google Fonts via `<link>`** ([index.html:27-29](index.html#L27-L29)) bloquea el render. Considerar `font-display: swap` o auto-hospedar Inter en `/public/fonts/` con `preload`.

### Core Web Vitals — predicción

| Métrica | Predicción móvil 4G | Causa principal |
|---|---|---|
| **LCP** (Largest Contentful Paint) | **5-9 s** ⚠️ | Hero PNG de 3.4 MB sin priorizar ni optimizar |
| **CLS** (Cumulative Layout Shift) | bueno (≤ 0.1) | Skeletons en cargas asíncronas |
| **FID/INP** | bueno | Pocos handlers pesados |
| **TBT** | medio | Framer Motion + react-router |

---

## 1.4 SEO y Metadatos

### Lo que existe (bien)
- Meta description, Open Graph y Twitter Card configurados correctamente en [index.html:9-25](index.html#L9-L25)
- `<title>` específico y descriptivo
- `og:image` con `og-image.png` 1200×630 que existe
- `<html lang="es">` correcto
- Footer con datos de contacto y dirección física (microseñal de SEO local)

### Lo que falta (urgente)
- **No hay `sitemap.xml`** en `public/`
- **No hay `robots.txt`** en `public/`
- **Sin Schema.org / JSON-LD**. Para un alojamiento turístico debería existir al menos `LodgingBusiness`, `Hotel` o `Place` con coordenadas, dirección y rating. En el HTML actual no hay **ni una línea de JSON-LD**.
- **Sin meta dinámicas por página**: como es SPA, `/cabanas`, `/departamentos`, `/unidad/:id` **comparten el mismo `<title>` y `<meta description>`** del `index.html`. Esto es el problema #1 de SEO en el sitio. Para resolverlo sin migrar de Vite hay opciones:
  - `react-helmet-async` (manipula `<head>` en cliente, parcialmente útil para crawlers modernos como Googlebot pero no para Facebook/Twitter scrapers)
  - **Mejor**: migrar a SSR/SSG. **Astro** o **Next.js 15** serían naturales y permitirían generar HTML estático por unidad — esto debería estar en el roadmap a 6 meses.
  - Alternativa intermedia: usar `vite-plugin-ssr` o `vite-plugin-prerender` para pre-renderizar las 3-4 rutas críticas.
- **H1 múltiples por página**: `HeroSection` siempre renderiza `<h1>` ([src/components/HeroSection.jsx:16](src/components/HeroSection.jsx#L16)), y en `CabanasPage`/`DepartamentosPage` el siguiente bloque arranca con `<h2>` que sí es correcto. Pero en `UnitDetailPage` también hay `<h1>` propio. ✓ Está OK por página.
- **URLs**: `/unidad/:id` usa **UUID** (`/unidad/c7782684-5e23-...`) — esto es **muy malo para SEO**. Debería ser `/cabanas/ciruelillo` o al menos `/unidad/cab-ciruelillo`. La columna `code` ya existe en el schema; solo hay que enrutar por `code` en vez de `id`.
- **Alt text en imágenes**: ✓ Mayormente OK (`UnitCard`, `ImageCarousel`, `GalleryGlobal`). Sin embargo, los hero backgrounds en `index.css` son `background-image` (no `<img>`) y por tanto **no aportan alt** — el SEO de imagen de cordillera/cabaña se pierde.

### Detalle: nuevo dominio aparente
El sitio se sirve desde `ab.anduschile.com` (subdominio de la agencia/desarrollador) y no desde un dominio propio tipo `artebrisapatagonia.com`. Si el negocio ya tiene presencia con ese otro dominio (la propia `unitDefaults.js:42` comenta "Fuente: artebrisapatagonia.com"), conviene **migrar la web nueva a ese dominio** y planificar redirects 301 desde el viejo — caso contrario se diluye SEO entre dos sitios.

---

## 1.5 Accesibilidad

| Aspecto | Estado | Comentario |
|---|---|---|
| Contraste | Mayoritariamente bueno | El `text-white/80` sobre slate-900 cumple WCAG AA |
| Navegación por teclado | Parcial | Los botones tienen focus visible (Tailwind default); pero hay `<div onClick>` sin `role="button"` (ej. [UnitCard.jsx:119](src/components/UnitCard.jsx#L119)) |
| Labels en formularios | ✓ Sí | `ReservationWidget`, `ContactSection`, `AdminLoginPage` tienen `<label>` por input |
| ARIA | Mínimo | Solo `aria-label` en algunos botones (carrusel, menu hamburger). Falta `aria-current` en navegación activa |
| HTML semántico | Bueno | `<header>`, `<main>`, `<footer>`, `<section>` correctamente usados |
| Lightbox | Mejorable | Cierre con ESC ✓, pero no se atrapa el foco (tab fuera del modal) |
| `prefers-reduced-motion` | ❌ No respetado | Framer Motion hace animaciones sin checkear esta media query |
| Form `<input type="date">` en móvil | Aceptable | Comportamiento nativo del browser; no hay date picker custom |

**Recomendación**: pasar el sitio por Lighthouse + axe DevTools. Espero score de A11Y entre 80-90.

---

## 1.6 Seguridad

### Lo que está bien
- `.env` correctamente excluido del repo ([.gitignore:4](.gitignore#L4))
- Variables públicas usan prefijo `VITE_` (anon key, WhatsApp) — esto es estándar de Vite, **pero ojo: la anon key SÍ va al cliente**, por diseño
- Autorización doble en la Edge Function `sync-ical`: token cron O JWT de admin ([supabase/functions/sync-ical/index.ts:115-154](supabase/functions/sync-ical/index.ts#L115-L154))
- `AdminGuard` verifica rol contra `core_app_users` y rechaza si no es `admin`/`superadmin` ([src/components/admin/AdminGuard.jsx:5,49](src/components/admin/AdminGuard.jsx#L5))

### Lo que preocupa o conviene mejorar
- **Sin headers de seguridad HTTP** ([vercel.json](vercel.json) está vacío de headers). No hay `Content-Security-Policy`, ni `X-Content-Type-Options`, ni `Referrer-Policy`, ni `Permissions-Policy`. Solución de 10 minutos en Vercel.
- **No se observa validación server-side de los datos del formulario de reserva**. El widget llama directo a Supabase con `insert({...})` confiando en RLS para limitar. Es OK siempre que RLS permita solo `INSERT` con `status='inquiry'` y restrinja columnas. **Hay que confirmar las políticas RLS** — no están en este repo (las migrations que sí existen no las definen).
- **Sin rate limit en el endpoint de reservas**. Un bot podría crear 10 000 inquiries con datos basura. Mitigación mínima: agregar Cloudflare Turnstile / hCaptcha al formulario, o un campo honeypot. Hoy no hay nada.
- **CORS de la Edge Function en `*`** ([supabase/functions/sync-ical/index.ts:108, 161, 502](supabase/functions/sync-ical/index.ts#L108)). Para un endpoint admin, conviene restringir al origen del sitio.
- **`alert()` muestra mensajes de Postgres** al admin ([AdminReservationsPage.jsx:181](src/pages/admin/AdminReservationsPage.jsx#L181)) — eso filtra detalles del schema en pantalla. Filtrar y mostrar mensaje genérico.
- **Sin protección CSRF explícita** en formularios, pero Supabase usa JWT en header (no cookie), así que en la práctica no es vulnerable. ✓

---

## 1.7 Mobile / Responsive

- ✓ `<meta name="viewport" content="width=device-width, initial-scale=1.0">` correcto
- ✓ Tailwind breakpoints usados (`sm:`, `md:`, `lg:`) consistentemente
- ✓ `StickyCTA` se muestra solo en mobile (`md:hidden`) — buen UX
- ✓ Touch targets en botones cumplen 44×44 px (`py-2.5`, `py-3` predominantes)
- ⚠️ Hero `60vh` en home puede dejar la CTA bajo el fold en pantallas pequeñas — verificar en 360×640
- ⚠️ Pasaje admin (`/admin/*`) **no es responsive completo** — tablas (`AdminReservationsPage` table, `AdminRatesPage` grid) usan `overflow-x-auto` pero la experiencia tablet/móvil es secundaria. Aceptable si la dueña usa desktop.

---

# PARTE 2 — AUDITORÍA FUNCIONAL (qué existe y qué falta)

## 2.1 Sistema de reservas actual — **YA EXISTE Y FUNCIONA**

Esto es lo más importante que detectar: **el sitio NO es una landing estática**. Es una pequeña plataforma de booking con flujo completo a Supabase.

### Lo que está implementado

- **Formulario de reserva**: [src/components/ReservationWidget.jsx](src/components/ReservationWidget.jsx) — 2 pasos (fechas+huéspedes → datos contacto)
- **Verificación de disponibilidad en tiempo real**: `getConflicts()` consulta `core_reservations` excluyendo fechas ocupadas ([src/data/reservations.js:14-32](src/data/reservations.js#L14-L32))
- **Cálculo de precio noche por noche** usando overrides de `core_unit_daily_rates` con fallback a `base_price` ([src/components/ReservationWidget.jsx:141-180](src/components/ReservationWidget.jsx#L141-L180))
- **Creación de reserva con status `inquiry`** que queda registrada en `core_reservations` para que la dueña la procese desde el admin ([src/data/reservations.js:49-87](src/data/reservations.js#L49-L87))
- **Búsqueda o creación de huésped via RPC** `find_or_create_guest` ([src/data/guests.js:15-19](src/data/guests.js#L15-L19))
- **Confirmación final por WhatsApp**: tras crear la reserva, se arma un mensaje pre-poblado con el ID y se abre wa.me ([src/components/ReservationWidget.jsx:29-48, 100-108](src/components/ReservationWidget.jsx#L29-L48))
- **Lógica de bloqueo de fechas**: ✓ Funciona — estados `inquiry`, `confirmed`, `blocked` bloquean
- **Sincronización iCal**: ✓ Existe Edge Function que lee Airbnb + Booking y crea reservas con `status='blocked'`

### Cómo se comunica al propietario
- **Email**: ❌ No automático. La reserva queda en la base de datos esperando que la dueña entre al admin
- **WhatsApp**: ✓ El cliente envía el mensaje desde su propio teléfono al WhatsApp de la cabaña
- **Push/notification al admin**: ❌ No existe. Si la dueña no abre el panel, las inquiries se acumulan sin aviso

**Gap crítico**: no hay notificación automática para la dueña cuando entra una `inquiry` nueva. Esto debería ser una funcionalidad de Fase 1 (un trigger Supabase + email vía SendGrid/Resend o un webhook a WhatsApp Business).

## 2.2 Sistema de precios actual — **DINÁMICO**

- **Precio base por unidad**: columna `base_price` en `core_units` (migración [20260223_dynamic_rates.sql:6-8](supabase/migrations/20260223_dynamic_rates.sql#L6))
- **Overrides por fecha y unidad**: tabla `core_unit_daily_rates` permite tarifa distinta por día específico
- **Editor visual de tarifas**: [src/pages/admin/AdminRatesPage.jsx](src/pages/admin/AdminRatesPage.jsx) + [src/components/admin/RateEditModal.jsx](src/components/admin/RateEditModal.jsx) permiten editar:
  - Un solo día
  - Un rango de fechas
  - Días específicos de la semana dentro de un rango (ej: solo fines de semana en enero)
- **Snapshot del precio cotizado**: cada reserva guarda `quoted_total`, `quoted_nights`, `quoted_currency` para que cambios futuros de tarifa no afecten reservas pasadas ([20260223_reservation_quotes.sql](supabase/migrations/20260223_reservation_quotes.sql))

### Lo que NO hay (importante)
- ❌ **Concepto de "temporada alta/media/baja"** como entidad — el archivo [src/data/unitDefaults.js:42-58](src/data/unitDefaults.js#L42-L58) hardcodea precios por temporada pero **solo se usa como fallback de display**, no como lógica de cálculo. Los precios reales vienen de `core_unit_daily_rates`. Aún así, la dueña debe pintar manualmente la temporada alta día por día.
- ❌ **Precios diferenciados por canal** (Booking / Airbnb / WEB). El campo `channel_id` existe en `core_reservations`, pero el cálculo de cotización **no consulta el canal** — siempre devuelve el precio base. Es decir: hoy las reservas directas y las que vienen de Booking se cotizan igual.

## 2.3 Panel de administración — **EXISTE Y ES RICO**

Es el segundo gran descubrimiento. Implementado en [src/pages/admin/AdminReservationsPage.jsx](src/pages/admin/AdminReservationsPage.jsx) y [src/pages/admin/AdminRatesPage.jsx](src/pages/admin/AdminRatesPage.jsx):

### Capacidades actuales
- **Login con Supabase Auth** (email/password) — [AdminLoginPage.jsx](src/pages/admin/AdminLoginPage.jsx)
- **Verificación de rol** en `core_app_users` (`admin` o `superadmin`) — [AdminGuard.jsx](src/components/admin/AdminGuard.jsx)
- **KPIs en tiempo real**: ocupación 7/14/30 días, consultas pendientes, check-ins/check-outs hoy y mañana — [DashboardKPIs.jsx](src/components/admin/DashboardKPIs.jsx)
- **3 vistas de reservas**:
  - **Lista** (tabla con filtros por estado, unidad, fechas)
  - **Calendario mensual** ([MonthCalendar.jsx](src/components/admin/MonthCalendar.jsx))
  - **Agenda semanal** ([WeekAgenda.jsx](src/components/admin/WeekAgenda.jsx))
- **Drawer de detalle por reserva** con cambio de estado, copiar resumen, ver datos del huésped y `quoted_total` — [ReservationDetailDrawer.jsx](src/components/admin/ReservationDetailDrawer.jsx)
- **Crear bloqueo manual** (vacaciones, mantenimiento) seleccionando unidad+fechas+notas
- **Cambiar estado de reserva**: `inquiry → confirmed / cancelled / blocked`
- **Editor de tarifas tipo "Booking extranet"** con sticky column de unidad y celda por día
- **Panel de iCal Sync** integrado en la página de reservas: ver calendarios configurados, activar/desactivar, ejecutar sync manual

### Lo que NO hay
- ❌ Edición de **contenido editorial** (textos del hero, FAQ, descripciones de unidades) — todo está hardcodeado en `.js`
- ❌ Edición de **imágenes** de las cabañas (hay que subir vía FTP a `public/images/...`)
- ❌ Edición de **datos de contacto / WhatsApp** (en `.env` y `src/config/contact.js`)
- ❌ Gestión visual de **calendarios externos** (agregar/quitar URLs iCal de Booking/Airbnb se hace por SQL Editor)
- ❌ Reportes / exportación a Excel/PDF
- ❌ Multi-usuario con permisos granulares
- ❌ Historial de cambios / auditoría

## 2.4 Pasarela de pago

**❌ No existe.** Ninguna integración de Stripe, MercadoPago, Flow, Webpay o equivalente. El flujo termina en una "consulta" (`inquiry`) que se confirma manualmente por WhatsApp, y el pago se gestiona offline (transferencia / efectivo / link manual de Webpay).

---

# PARTE 3 — EVALUACIÓN DE LO PENDIENTE

## 3.1 Integración Booking.com vía iCal — **YA ESTÁ IMPLEMENTADA EN UN 80 %**

### Lo que ya existe
- ✓ Tabla `core_external_calendars` con `ics_url`, `unit_id`, `is_active`, `last_synced_at` ([20260222_ical_sync.sql:8-27](supabase/migrations/20260222_ical_sync.sql#L8-L27))
- ✓ Edge Function `sync-ical` que parsea ICS sin dependencias externas ([supabase/functions/sync-ical/index.ts:62-101](supabase/functions/sync-ical/index.ts#L62-L101))
- ✓ Upsert idempotente por `(external_source, external_uid, external_calendar_id)` con índice único
- ✓ Cron de GitHub Actions cada 30 minutos ([.github/workflows/](.github/workflows/))
- ✓ Detección automática del provider por la URL o el UID del VEVENT
- ✓ Logging de errores en `core_ical_sync_errors`
- ✓ Botón "Sync ahora" en el admin con resultado por calendario

### Lo que falta para completar
1. **Exportar el iCal del sitio** (.ics) para que Booking y Airbnb puedan leer las reservas directas. **Esto no existe**. Hay que crear una segunda Edge Function `export-ical/index.ts` (o ruta pública firmada) que genere un VCALENDAR con todas las reservas `confirmed` + `blocked` de una unidad determinada. Es ~80 líneas de TS.
2. **UI para administrar calendarios externos**: hoy se editan por SQL Editor. Agregar formulario en el admin para `INSERT/UPDATE/DELETE` filas de `core_external_calendars`.
3. **Mapear UUIDs hardcodeados a un lookup**: los `guest_id` y `channel_id` constantes en `index.ts:312, 328-331` deberían resolverse vía `select id from core_channels where code='BOOKING'` al arrancar.
4. **Schema de `core_ical_sync_errors`**: la Edge Function lo usa pero **no hay migración** que lo cree. O existe en otra parte (manual en el SQL Editor) o hay un bug latente. **Verificar y crear migración formal**.

### Complejidad estimada para terminar Booking
- **Export ICS**: 4-6 horas
- **UI admin de calendarios**: 4 horas
- **Refactor de IDs hardcodeados + tests**: 3 horas
- **Total**: ~1.5-2 días de trabajo

### Librería / enfoque
La función actual **parsea ICS a mano** y funciona bien. Para *exportar*, también se puede hacer a mano (formato simple) o usar [`ics`](https://www.npmjs.com/package/ics) o [`ical-generator`](https://www.npmjs.com/package/ical-generator) si se quiere generar desde el frontend. Para Edge Functions Deno, lo más sencillo es seguir el patrón actual (concatenación de strings VCALENDAR/VEVENT).

## 3.2 Integración Airbnb vía iCal — **YA FUNCIONA igual que Booking**

El código de [supabase/functions/sync-ical/index.ts:316-332](supabase/functions/sync-ical/index.ts#L316-L332) **ya distingue Airbnb vs Booking** y asigna `channel_id` distinto. La sincronización es exactamente la misma; solo cambia el `ics_url` que se carga en `core_external_calendars`.

### Consideraciones especiales para Airbnb
- Airbnb actualiza su iCal cada **2-3 horas** (no en tiempo real); aceptar lag de hasta 3 h
- El UID de Airbnb tiene formato `UUID@airbnb.com` — ya se detecta en el código
- Los summaries de Airbnb suelen decir `"Reserved"` sin nombre del huésped (por privacidad); el código lo guarda como nota `[AIRBNB] Reserved`
- **Importante**: para que Airbnb importe el iCal del sitio (cuando se construya), Airbnb cachea pesadamente; no esperar sync inmediato

## 3.3 Sistema de precios diferenciados por canal

### Análisis del estado actual
El campo `channel_id` ya existe en `core_reservations` y hay tabla `core_channels`. **Falta la pieza del cálculo de cotización por canal**. El widget público hoy no consulta el canal porque siempre es WEB.

### Diseño recomendado

**Opción A — Markup % por canal (simple, recomendada para empezar)**
1. Agregar columna `commission_pct numeric` a `core_channels` (ej: Booking 18 %, Airbnb 15 %, WEB 0 %)
2. Tabla nueva o columnas en `core_units`: `commission_strategy text default 'absorb'|'pass-through'`
3. Función SQL `calc_quote(unit_id, check_in, check_out, channel_id) → numeric` que calcule las noches sumadas y aplique el markup
4. El widget público sigue cotizando WEB (precio base); pero si el operador quiere ver el precio Booking equivalente, se llama con `channel_id` distinto desde el admin

**Opción B — Precios independientes por canal (flexible, complejo)**
- Tabla `core_unit_channel_rates(unit_id, channel_id, date, price)` 
- Mayor flexibilidad pero más trabajo de mantenimiento

**Recomendación**: empezar por Opción A. Es 1 día de trabajo, da el comportamiento esperado (precio Booking = base + comisión Booking), y es reversible.

### Variación por temporada
**Ya está cubierta por `core_unit_daily_rates`** — la dueña pinta los días de temporada alta con tarifa más alta usando [RateEditModal.jsx](src/components/admin/RateEditModal.jsx). No necesitamos una tabla de "Seasons" formal; el modelo actual es más granular y permite cualquier patrón (incluido eventos puntuales tipo "carrera Patagonia").

### Variación por habitación/cabaña
**Ya está**: cada `core_unit` tiene su `base_price` y sus overrides propios en `core_unit_daily_rates`.

### ¿Base de datos, CMS o config?
**Quedarse con Supabase tal como está.** Ya tenemos:
- DB con la lógica
- Editor de tarifas funcional en `/admin/tarifas`
- Snapshot de precio cotizado en cada reserva

Agregar un CMS sería redundante para precios. Para textos editoriales (FAQ, descripciones), sí puede tener sentido un CMS (ver §3.4).

## 3.4 Panel de control para el propietario — **YA EXISTE EN UN 70 %**

### Lo que ya puede hacer la dueña sin tocar código
1. ✓ Ver y gestionar reservas entrantes
2. ✓ Cambiar estado (inquiry → confirmed / cancelled)
3. ✓ Bloquear fechas manualmente
4. ✓ Ver calendario consolidado (mensual + semanal)
5. ✓ Editar tarifas por noche y por unidad
6. ✓ Sincronizar Booking/Airbnb manualmente
7. ✓ Ver KPIs de ocupación

### Lo que falta (priorizado)
| # | Funcionalidad | Esfuerzo | Recomendación |
|---|---|---|---|
| 1 | UI para agregar/quitar calendarios iCal de Booking/Airbnb | 4 h | Construir nativo en `/admin` |
| 2 | Notificación automática a la dueña cuando entra una `inquiry` | 4 h | Edge Function + Resend/SendGrid + email |
| 3 | Editar precios por canal | 1 d | Ver §3.3 |
| 4 | Editar textos del sitio (FAQ, descripciones de unidades) | 2 d | Mover textos de `data/*.js` a tablas Supabase + UI |
| 5 | Subir imágenes desde el admin | 2 d | Supabase Storage + uploader |
| 6 | Editar datos de contacto (WhatsApp, dirección) | 4 h | Tabla `core_settings` |

### CMS headless externo (Sanity / Payload / Directus) — ¿conviene?
**No para este proyecto**. Pros: editor "WYSIWYG" más amigable. Contras: añade otro servicio, otro stack, otra cuenta, otra factura. **Lo recomendado es seguir creciendo el `/admin` existente** — ya está hecho con la misma estética del panel de reservas y la dueña ya tiene el hábito de entrar ahí.

## 3.5 Pasarela de pago — **DECISIÓN ESTRATÉGICA**

### Análisis comparativo para Chile

| Pasarela | Tarjetas | Webpay | Transfer | Comisión típica | Integr. React | Cobro parcial | Comprobante |
|---|---|---|---|---|---|---|---|
| **Mercado Pago** | ✓ | ✗ | ✓ (MercadoPago) | 3.49 % + IVA | Excelente (SDK web) | ✓ (preferences) | ✓ Email automático |
| **Flow** | ✓ | ✓ (incluye) | ✓ | 2.99 % + IVA | Buena (API REST) | ✓ | ✓ |
| **Kushki** | ✓ | ✓ | ✗ | Negociable (≈ 2.5-3 %) | Buena | ✓ (preauth) | Configurable |
| **Transbank Webpay Plus directo** | ✓ | ✓ | ✗ | ~1.99 % + UF afiliación | Media (SDK PHP/Java/Node, no React directo) | Solo via REST avanzado | Manual |
| **Stripe** | ✓ (USD/CLP via Stripe Chile) | ✗ (no oficialmente en CL) | ✗ | 3.6 % + 30 ¢ USD | Excelente | ✓ | ✓ |
| **PayU LATAM** | ✓ | ✗ | ✓ | 3-4 % | Aceptable | ✓ | ✓ |

### Recomendación fundada: **Flow** (recomendada) o **Mercado Pago** (alternativa)

**Flow** es la mejor opción para este caso porque:
1. ✓ **Soporta Webpay (Transbank) y tarjetas internacionales** en una sola integración — los turistas extranjeros (mucho mercado para Torres del Paine) usan tarjetas internacionales, los chilenos prefieren Webpay
2. ✓ **Comisiones competitivas** (~2.99 %) — la más baja del comparativo manteniendo Webpay
3. ✓ **API REST simple**: 4 endpoints (createPayment, getStatus, refund, webhook). Integra perfecto con la Edge Function de Supabase + cliente React
4. ✓ **Cobros parciales/señas** soportados nativamente (parámetro `amount`)
5. ✓ **Comprobante automático por email** + URL de pago única
6. ✓ Empresa **chilena**, soporte en español, factura en CLP
7. ✓ KYC más rápido que Transbank directo (no requiere afiliación previa)

**Mercado Pago** queda como alternativa si la dueña ya tiene cuenta o si el público es 100 % latino sin extranjeros. Su gran punto débil es que **no integra Webpay**, así que se pierde un porcentaje importante del público chileno que paga con débito Redcompra/Webpay.

### Plan de integración Flow (estimado: 2-3 días)
1. Crear cuenta Flow + obtener API keys (sandbox + producción)
2. Migration: agregar columnas a `core_reservations` → `payment_id`, `payment_status`, `payment_method`, `paid_amount`, `payment_url`
3. Edge Function `create-payment` que recibe `{ reservation_id, amount }`, llama a Flow, devuelve URL de pago
4. Edge Function `payment-webhook` que recibe la notificación de Flow, valida firma, actualiza `core_reservations.payment_status` y cambia `status` a `confirmed`
5. Reemplazar el botón "Confirmar por WhatsApp" del `ReservationWidget` por dos opciones: "Pagar 30 % seña ahora (Flow)" o "Pagar por WhatsApp / transferencia"
6. Email transaccional vía Resend cuando el pago se confirma

---

# PARTE 4 — FORTALEZAS, DEBILIDADES Y RIESGOS

## Fortalezas

### Técnicas
- **Stack moderno y mantenible**: Vite + React 18 + Supabase es una combinación productiva y barata
- **Capa de datos centralizada** en `src/data/*` — fácil de auditar y refactorizar
- **Edge Function bien construida**: parser de ICS propio sin dependencias, manejo de errores granular, autorización dual cron+JWT
- **Sistema de tarifas dinámico ya funcional** con snapshot por reserva — evita el clásico bug de "subí el precio y se le aplicó a una reserva ya cotizada"
- **Panel admin completo** que ya cubre el 70 % de las necesidades operativas reales del negocio
- **iCal sync funcionando bidireccionalmente para import** — solo falta el export
- **Cron automatizado** vía GitHub Actions (gratis, robusto)

### Funcionales
- WhatsApp como CTA dominante — coherente con el comportamiento real del público chileno
- Chatbot custom con derivación inteligente a WhatsApp para temas sensibles (precios, reservas) — buen UX
- Mapa OSM embed (sin costo Google Maps) y enlace a Google Maps para navegación
- Información clara y completa de contactos, ubicación, FAQ

## Debilidades

### Críticas (bloquean SEO y performance)
1. **Imágenes hero PNG sin optimizar** (3.4 MB c/u, 9 PNG sin uso real) — destruye LCP móvil
2. **SPA sin SSR**: `<title>` y `<meta>` son los mismos en todas las rutas
3. **URLs con UUID** en `/unidad/:id` — pésimo para SEO y para compartir
4. **Sin `sitemap.xml` ni `robots.txt`**
5. **Sin Schema.org / JSON-LD** para alojamiento turístico
6. **Logo `/logo.svg` referenciado no existe** — 404 en cada carga

### Importantes
7. **No hay notificación automática a la dueña** cuando entra una `inquiry`
8. **Editor de calendarios externos solo por SQL** — la dueña no puede agregar un nuevo iCal de Booking sin desarrollador
9. **IDs UUID hardcodeados** en la Edge Function — bloquean migración entre entornos
10. **Migración SQL faltante** para `core_ical_sync_errors`
11. **CabanasPage / DepartamentosPage clonadas** — divergencia eventual asegurada
12. **`alert()` para errores admin** — mensajes técnicos de Postgres expuestos al usuario
13. **Sin headers de seguridad HTTP** en Vercel

### Menores
14. SVG iconográficos duplicados en 6+ archivos
15. `GallerySection.jsx` muerto + dos fuentes de servicios (`SERVICES` vs `SERVICES_BY_TYPE`)
16. `objects.txt` versionado innecesariamente
17. Sin tipos TS aunque `@types/react` instalado
18. Inconsistencia `capacidad_total` vs `capacity_total`
19. Framer Motion sin `prefers-reduced-motion`

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Una `inquiry` entra y la dueña no se entera por 24 h | Alta | Alto (pérdida de venta) | Notificación email/WhatsApp automática (Fase 1) |
| Booking + Airbnb + Web doble-bookean una fecha | Media | Alto (cancelación + mala reseña) | Sync iCal cada 30 min ya ayuda; export pendiente cierra el círculo |
| Google indexa `/unidad/:uuid` con título de la home | Alta | Alto (SEO) | Pre-render por ruta o migrar a Astro/Next |
| Pico de tráfico hace LCP > 8 s en 4G | Media | Alto (rebote) | Convertir hero a WebP/AVIF, agregar `loading=lazy` y `<picture>` |
| Bots crean `inquiry` masivamente y saturan el panel | Baja-Media | Medio | Honeypot + rate limit + Turnstile |
| Migrar de proyecto Supabase rompe sync por IDs hardcoded | Baja | Alto | Refactor: resolver IDs por `code` al arrancar |
| Pierde credenciales `.env` por desarrollador rotativo | Baja | Alto | Documentar en gestor de secretos del cliente |
| `core_ical_sync_errors` no existe en BD y la función falla en silencio | Media | Medio | Crear migración formal y validar |

---

# PARTE 5 — PLAN DE TRABAJO SUGERIDO

## Fase 1 — Correcciones inmediatas (estimado: 5-7 días hábiles)

**Objetivo**: dejar el sitio en estado SEO/performance/operativo aceptable antes de agregar features nuevos. **Bloquean cualquier campaña de marketing**.

| # | Tarea | Esfuerzo | Dependencias |
|---|---|---|---|
| 1.1 | **Optimizar imágenes**: convertir PNG hero a WebP + redimensionar a 1920×1080 + borrar duplicados sin uso (sufijos 0-7). Esperado: 60 MB → 8 MB. | 4 h | — |
| 1.2 | Agregar `loading="lazy"` en `UnitCard`, `ImageCarousel` y backgrounds CSS | 1 h | — |
| 1.3 | Crear `/public/sitemap.xml` y `/public/robots.txt` | 2 h | Decisión sobre dominio final |
| 1.4 | Crear/subir `/public/logo.svg` (referenciado pero ausente) | 30 min | — |
| 1.5 | Agregar **JSON-LD `LodgingBusiness`** en `index.html` (estático) + por unidad si se migra a SSR luego | 3 h | — |
| 1.6 | Cambiar `/unidad/:id` → `/unidad/:code` (slug humano usando `code` o nombre kebab) | 4 h | Confirmar `code` único en `core_units` |
| 1.7 | Configurar headers de seguridad HTTP en `vercel.json` (CSP, X-CTO, Referrer-Policy) | 2 h | — |
| 1.8 | **Notificación automática a la dueña** al entrar `inquiry` (Edge Function + Resend) | 6 h | Cuenta Resend (free 100/día) |
| 1.9 | Reemplazar `alert()` por `react-hot-toast` en admin | 2 h | — |
| 1.10 | Eliminar dead code (`GallerySection.jsx`, `objects.txt`, mergear `SERVICES`) | 2 h | — |
| 1.11 | Crear migración formal para `core_ical_sync_errors` si no existe | 2 h | Verificar schema actual |
| 1.12 | Unificar `capacidad_total` ↔ `capacity_total` (auditar BD y código) | 3 h | — |
| 1.13 | Refactorizar IDs hardcoded en `sync-ical/index.ts` (resolver via `code`) | 3 h | — |
| 1.14 | Honeypot + rate limit básico en `createInquiryReservation` | 4 h | — |
| 1.15 | UI admin para CRUD de `core_external_calendars` (agregar iCal sin SQL) | 4 h | — |

**Total**: ~42 horas (~5-6 días de un desarrollador full-time).

## Fase 2 — Integración de calendarios iCal completa (estimado: 2-3 días)

**Objetivo**: cerrar el círculo de sincronización bidireccional con Booking y Airbnb.

| # | Tarea | Esfuerzo | Dependencias |
|---|---|---|---|
| 2.1 | Edge Function `export-ical/:unit_code` que genera el `.ics` con todas las reservas `confirmed + blocked` de la unidad | 6 h | Fase 1.6 (URLs por code) |
| 2.2 | URL pública firmada (token o `service_role` por path) para que Booking/Airbnb puedan leer sin login | 2 h | 2.1 |
| 2.3 | UI admin para mostrar las **URLs de export** por unidad con botón "Copiar" — la dueña las pega en Booking/Airbnb | 3 h | 2.1, 2.2 |
| 2.4 | Documentación step-by-step para la dueña: "Cómo pegar el iCal de la web en Booking" | 2 h | — |
| 2.5 | Validar end-to-end: reservar en Web → aparece bloqueada en Booking en ≤ 2 h | 4 h | Cuenta Booking real |
| 2.6 | Validar end-to-end: bloquear en Airbnb → aparece como `blocked` en /admin/reservas tras el cron | 2 h | — |
| 2.7 | Mejorar logs en `core_ical_sync_errors` con email diario de resumen si hay errores | 3 h | Fase 1.8 (Resend) |

**Total**: ~22 horas (~3 días).

### Dependencias críticas
- **Antes de 2.1**: terminar Fase 1.6 (rutas por slug) — porque las URLs de export deben ser amigables y estables
- **Antes de 2.5**: la dueña necesita estar lista para desvincular su plataforma actual (Aloha) de Booking

## Fase 3 — Panel de control + precios + pasarela de pago (estimado: 8-12 días)

**Objetivo**: convertir el sitio en una plataforma completamente autónoma para la dueña.

### 3A — Precios diferenciados por canal (1.5 días)
- Migration: `core_channels.commission_pct` + `core_units.commission_strategy`
- Función SQL `calc_quote(unit_id, ci, co, channel_id)`
- Actualizar widget para usar canal WEB explícitamente
- En el admin: mostrar precio Web / Booking / Airbnb lado a lado

### 3B — Editor de contenido editorial (2.5 días)
- Migration: tabla `core_unit_content(unit_id, locale, name, description, services_md, policies_md)`
- Migration: tabla `core_settings(key, value)` para WhatsApp, email, dirección, horarios
- Mover textos de `src/data/subsiteSections.js` y `src/data/unitDefaults.js` a las tablas
- UI admin con editor markdown ([Tiptap](https://tiptap.dev) liviano)

### 3C — Subida de imágenes (1.5 días)
- Migración a **Supabase Storage** (bucket `unit-images` público)
- Migration: tabla `core_unit_images(unit_id, storage_path, sort_order, alt_text)`
- UI admin con drag-and-drop, reordenable
- Actualizar `getUnitImage()` para leer de la tabla

### 3D — Pasarela de pago Flow (3 días)
- Cuenta Flow + sandbox keys
- Migration: campos de pago en `core_reservations`
- Edge Functions `create-payment` + `payment-webhook` + validación de firma
- UI cliente: 2 botones tras crear inquiry → "Pagar 30 % ahora con tarjeta/Webpay" o "Coordinar pago por WhatsApp"
- UI admin: ver estado de pago, monto pagado, link a comprobante Flow
- Email transaccional al confirmar pago

### 3E — Notificaciones avanzadas (1 día)
- Email a huésped al confirmar la reserva (con datos de contacto, ubicación, cómo llegar)
- Recordatorio a 48 h antes del check-in
- (Opcional) Webhook a WhatsApp Business API para la dueña

**Total**: ~9-10 días (más buffer 2 días para QA y ajustes).

### Dependencias críticas
- 3D requiere 3A para que los precios cobrados sean los correctos por canal
- 3D requiere Fase 1.8 (sistema de email Resend) ya configurado
- 3B/3C se pueden hacer en paralelo si hay 2 desarrolladores

---

## Resumen visual del roadmap

```
                                                            
  FASE 1 (5-7 d)        FASE 2 (2-3 d)        FASE 3 (8-12 d)
  ─────────────         ─────────────         ──────────────
  • Imágenes WebP       • Export iCal         • Precios x canal
  • SEO básico          • UI calendarios      • Editor contenido
  • Slug URLs           • Tests E2E           • Subida imágenes
  • Notif. email                              • Flow (pagos)
  • UI iCal CRUD                              • Notif. avanzadas
  • Headers HTTP
  • Cleanup dead code
```

**Recomendación de orden**: NO saltar Fase 1 → Fase 3 directo. La Fase 1 paga sola en performance y SEO; la Fase 3 sin Fase 1 deja la web "rápida por dentro, lenta por fuera".

---

# EXECUTIVE SUMMARY (para el cliente)

> **Para: Propietaria — Arte Brisa Patagonia**
> **Asunto: Resumen del estado actual de la web y plan recomendado**

### Lo que ya tienes (y muchas veces no se ve)

Tu web **no es una página estática** como las que hace la competencia local. Tiene un **sistema completo de reservas online** conectado a una base de datos:
- Los huéspedes pueden ver disponibilidad y precio en tiempo real para cualquier fecha
- Cuando solicitan reservar, queda registrado en tu panel `/admin`
- Tú puedes **editar precios día por día y unidad por unidad** desde tu navegador
- Las reservas de **Booking y Airbnb se sincronizan automáticamente** cada 30 minutos, bloqueando esas fechas en tu sitio
- Tienes un **chatbot** que responde las dudas frecuentes y deriva a tu WhatsApp lo que requiere conversación

Esto es valioso y único — la mayoría de cabañas en Puerto Natales solo tienen una landing con WhatsApp.

### Lo que urge corregir antes de cualquier nueva inversión

1. **Las imágenes pesan demasiado**: los fondos principales son archivos de 3 MB sin optimizar. En celulares con 4G la página tarda 6-9 segundos en cargar — la mitad de tus visitantes se va antes de verla. **Solucionable en medio día**.
2. **Google no entiende bien tus páginas**: cuando alguien busca "cabañas Puerto Natales", todas tus páginas se ven iguales en los resultados. Hay que agregar información estructurada (`Schema.org`) y un mapa del sitio (`sitemap.xml`).
3. **Cuando entra una reserva nueva, nadie te avisa**: tienes que abrir el panel manualmente. **Hay que configurar un email o WhatsApp automático** — 4 horas de trabajo.
4. **Las URLs de tus unidades son códigos sin sentido** (`/unidad/c7782684-5e23-...`) — debería ser `/cabanas/ciruelillo`. Esto se nota cuando alguien comparte el link.

### Lo que falta para autonomía total

| Área | Estado hoy | Lo que falta |
|---|---|---|
| Reservas directas | ✅ Funcional | Notificación automática |
| Sincronización Booking/Airbnb | ✅ Importa | Falta **exportar** (1.5 días) |
| Precios | ✅ Día por día | Diferenciar Booking vs directo (1.5 días) |
| Pasarela de pago | ❌ No existe | Recomendamos **Flow** (3 días) |
| Editar textos del sitio | ❌ Requiere desarrollador | 2-3 días para que lo puedas hacer tú |

### Recomendación sobre pasarela de pago

Para Chile, **Flow** es la mejor opción: acepta tarjetas nacionales e internacionales, Webpay incluido, comisión ~3 %, permite cobrar señas parciales (30 %-50 %), emite comprobante automático. Mejor que Mercado Pago para tu caso porque sí integra Webpay (importante para clientes chilenos).

### Cronograma sugerido

- **Mes 1**: Correcciones críticas (imágenes, SEO, notificaciones, slugs)
- **Mes 2**: Cerrar el círculo Booking/Airbnb (exportar iCal de la web)
- **Mes 3**: Panel para editar contenido + sistema de pagos online

### Inversión estimada

| Fase | Trabajo | Tiempo | Resultado para tu negocio |
|---|---|---|---|
| 1 | Correcciones críticas | 5-7 días | Web rápida, indexable en Google, no pierdes reservas por no enterarte |
| 2 | iCal bidireccional | 2-3 días | Cero riesgo de doble-booking; desligar Aloha sin perder sincronización |
| 3 | Autonomía + pagos | 8-12 días | Editas todo tú; cobras señas con tarjeta/Webpay automáticamente |

**Total: ~3-4 semanas de desarrollo** para tener una plataforma 100 % autónoma, optimizada para SEO local de Patagonia y con cobro online integrado.

---

*Reporte generado el 2026-05-25 a partir del código en rama `main`. Para consultas o ampliación de cualquier punto, contactar al equipo técnico.*
