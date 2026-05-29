# Plan de Migración de Dominio — Arte Brisa Patagonia

**De:** `https://ab.anduschile.com/` (staging)
**A:** `https://artebrisapatagonia.com/` (producción)
**Fecha del reporte:** 2026-05-25
**Stack:** Vite + React (SPA) en Vercel + Supabase

---

## TAREA 1 — Auditoría de referencias al dominio antiguo

### 1.1 Referencias **bloqueantes** (deben cambiar antes del corte)

Búsqueda ejecutada sobre todo el repo (`src/`, `supabase/`, `public/`, raíz, `.github/`):

| # | Archivo | Línea | Contenido actual | Debe quedar |
|---|---|---|---|---|
| 1 | [index.html](index.html#L13) | 13 | `<meta property="og:url" content="https://ab.anduschile.com/" />` | `<meta property="og:url" content="https://artebrisapatagonia.com/" />` |
| 2 | [index.html](index.html#L16) | 16 | `<meta property="og:image" content="https://ab.anduschile.com/og-image.png" />` | `<meta property="og:image" content="https://artebrisapatagonia.com/og-image.png" />` |
| 3 | [index.html](index.html#L22) | 22 | `<meta name="twitter:url" content="https://ab.anduschile.com/" />` | `<meta name="twitter:url" content="https://artebrisapatagonia.com/" />` |
| 4 | [index.html](index.html#L25) | 25 | `<meta name="twitter:image" content="https://ab.anduschile.com/og-image.png" />` | `<meta name="twitter:image" content="https://artebrisapatagonia.com/og-image.png" />` |

**No hay más referencias hardcodeadas a `ab.anduschile.com` en código de runtime.** Confirmado por:
```
grep -rni "anduschile" .   # solo 4 hits, todos en index.html
grep -rni "localhost" .    # 0 hits en código (solo node_modules)
grep -rni "127\.0\.0\.1" . # 0 hits
```

### 1.2 Referencias **a actualizar** post-corte (no bloquean, pero conviene)

| # | Archivo | Línea | Contenido | Acción |
|---|---|---|---|---|
| 5 | `AUDITORIA_TECNICA.md` | 4, 235 | menciona `ab.anduschile.com` | Reemplazar mención a sitio en docs |
| 6 | [src/data/unitDefaults.js](src/data/unitDefaults.js#L41) | 41 | `// Valores en CLP. Fuente: artebrisapatagonia.com` | ✓ Ya correcto (comentario, no código) |

### 1.3 URLs externas que **NO requieren cambio** (verificado uno por uno)

| Archivo | URL | Por qué no cambia |
|---|---|---|
| [src/config/contact.js:24](src/config/contact.js#L24) | `https://wa.me/${WHATSAPP_NUMBER}` | Es wa.me con número, no apunta al sitio |
| [src/components/ChatWidget.jsx:18](src/components/ChatWidget.jsx#L18) | `https://embed.tawk.to/...` | Provider externo, no usado (CHAT_PROVIDER='custom') |
| [src/components/ChatWidget.jsx:26](src/components/ChatWidget.jsx#L26) | `https://client.crisp.chat/l.js` | Provider externo, no usado |
| [src/components/Footer.jsx:4-5](src/components/Footer.jsx#L4) | Facebook + Instagram | Redes del cliente, ajenas |
| [src/data/subsiteSections.js:16,26](src/data/subsiteSections.js#L16) | `https://maps.app.goo.gl/...` | Google Maps shortlinks |
| [src/components/sections/LocationSection.jsx:6](src/components/sections/LocationSection.jsx#L6) | `https://www.openstreetmap.org/...` | OpenStreetMap embed |
| [src/lib/supabaseClient.js:13](src/lib/supabaseClient.js#L13) | `https://placeholder.supabase.co` | Fallback solo si falta `.env` |
| [supabase/functions/sync-ical/index.ts:20](supabase/functions/sync-ical/index.ts#L20) | `https://esm.sh/@supabase/supabase-js@2` | Import Deno, no del sitio |

### 1.4 Archivos **a crear** con URLs absolutas (post-corte)

| Archivo | URLs absolutas | Notas |
|---|---|---|
| `public/sitemap.xml` (a crear en Fase 1) | `https://artebrisapatagonia.com/`, `/cabanas`, `/departamentos`, `/unidad/{code}` | Generar con dominio nuevo |
| `public/robots.txt` (a crear en Fase 1) | `Sitemap: https://artebrisapatagonia.com/sitemap.xml` | |
| JSON-LD `LodgingBusiness` (cuando se agregue) | `@id`, `url`, `image` | Todos con dominio nuevo |

### 1.5 Configuraciones **fuera del repo** que también referencian el dominio

Estas no están en el código pero también requieren cambio:

| Lugar | Qué cambiar |
|---|---|
| Supabase Dashboard → Auth → URL Configuration → **Site URL** | `https://ab.anduschile.com` → `https://artebrisapatagonia.com` |
| Supabase Dashboard → Auth → URL Configuration → **Redirect URLs** | Agregar `https://artebrisapatagonia.com/**` |
| Vercel Project → Settings → Domains | Agregar `artebrisapatagonia.com` y `www.artebrisapatagonia.com` |
| Vercel Project → Environment Variables | Si hay alguna `VITE_SITE_URL` o similar (revisar dashboard) |
| Google Search Console | Agregar nueva propiedad `artebrisapatagonia.com` |
| Booking.com extranet → calendario iCal (cuando se publique export ICS) | URL del feed |
| Airbnb host calendar → iCal sync | URL del feed |
| Redes sociales (Facebook, Instagram bio) | Actualizar enlace al sitio |

---

## TAREA 2 — Checklist de migración paso a paso

### Pre-migración (T-7 a T-1 días) — sin tocar DNS

```markdown
## A) Preparación de código (T-7 días) — branch `domain-migration`

- [ ] **A1.** Crear rama `domain-migration` desde `main`
- [ ] **A2.** Actualizar las 4 meta tags en `index.html` (líneas 13, 16, 22, 25)
  - Reemplazar `https://ab.anduschile.com` → `https://artebrisapatagonia.com` (con `replace_all`)
- [ ] **A3.** Aplicar la configuración nueva de `vercel.json` (ver TAREA 3)
- [ ] **A4.** Hacer `pnpm build` local y verificar que el bundle no tiene strings `ab.anduschile`:
      `grep -r "anduschile" dist/`  → debe devolver 0 resultados
- [ ] **A5.** Commit + push de la rama (NO mergear todavía)

## B) Backup del sitio antiguo (T-5 días)

- [ ] **B1.** Identificar dónde está hospedada la versión antigua de `artebrisapatagonia.com`
      (¿WordPress? ¿HTML estático? ¿Otro hosting? Preguntar a la propietaria)
- [ ] **B2.** Descargar copia completa (FTP/cPanel) a una carpeta `backup-old-site-YYYYMMDD/`
- [ ] **B3.** Exportar base de datos si tiene CMS (WordPress: `wp-content/uploads` + dump SQL)
- [ ] **B4.** Anotar los DNS actuales del dominio:
      `dig artebrisapatagonia.com A`
      `dig artebrisapatagonia.com AAAA`
      `dig artebrisapatagonia.com CNAME`
      `dig www.artebrisapatagonia.com CNAME`
      → guardar la salida en `dns-snapshot-YYYYMMDD.txt`
- [ ] **B5.** Anotar el TTL actual de los registros (luego se baja)

## C) Vercel — agregar el dominio (T-3 días, sin cortar nada)

- [ ] **C1.** Vercel → Project → Settings → Domains → **Add Domain**
      Agregar `artebrisapatagonia.com` (Vercel mostrará "Invalid Configuration" porque el DNS aún apunta al hosting viejo — ESPERADO)
- [ ] **C2.** Agregar también `www.artebrisapatagonia.com` (forzar canonical: o www o sin-www, recomendado SIN www)
- [ ] **C3.** Anotar los registros que pide Vercel:
      - A record para apex: `76.76.21.21` (puede variar — copiar lo que Vercel muestre)
      - CNAME para `www`: `cname.vercel-dns.com`
- [ ] **C4.** **NO** quitar todavía el dominio `ab.anduschile.com` — lo necesitamos para el redirect

## D) Bajar TTL (T-2 días, 48h antes del corte)

- [ ] **D1.** En el panel del registrador donde está `artebrisapatagonia.com` (NIC.cl o donde se administre):
      bajar TTL de los registros A y CNAME actuales a **300 segundos** (5 min)
- [ ] **D2.** Esperar 24-48 h para que la propagación de TTL llegue a los resolvers
      (verificar con `dig artebrisapatagonia.com +noall +answer` que el TTL bajó)

## E) Supabase — actualizar Auth (T-1 día)

- [ ] **E1.** Supabase Dashboard → Authentication → URL Configuration
- [ ] **E2.** **Site URL**: agregar/cambiar a `https://artebrisapatagonia.com`
- [ ] **E3.** **Redirect URLs** (lista): agregar `https://artebrisapatagonia.com/**`
      (mantener `https://ab.anduschile.com/**` por ahora — se quita después del corte)
- [ ] **E4.** Guardar
- [ ] **E5.** Probar login en `https://ab.anduschile.com/admin` que sigue funcionando

## F) Mergear y desplegar el código (T-1 día, último paso pre-corte)

- [ ] **F1.** Code review del PR `domain-migration` → merge a `main`
- [ ] **F2.** Vercel auto-despliega; verificar deploy exitoso
- [ ] **F3.** Confirmar que `ab.anduschile.com` sigue cargando bien (debe — porque el dominio nuevo aún no resuelve)
- [ ] **F4.** Verificar en `ab.anduschile.com` con DevTools → Elements: que las meta tags `og:url` y `og:image` ya digan `artebrisapatagonia.com` (significa que el build está bien)
```

### Día del corte (T-0)

```markdown
## G) Cambio de DNS (en este orden estricto)

- [ ] **G1.** Ventana sugerida: martes-jueves 10:00-14:00 hora Chile
      (evitar viernes y fin de semana para tener soporte si algo falla)
- [ ] **G2.** En el panel del registrador del dominio (NIC.cl, GoDaddy, Namecheap, etc.):

      **Reemplazar el registro A apex:**
      - Tipo: `A`
      - Nombre: `@` (o vacío, depende del registrador)
      - Valor: `76.76.21.21`  (← el que mostró Vercel en paso C3)
      - TTL: `300`

      **Reemplazar/crear el CNAME www:**
      - Tipo: `CNAME`
      - Nombre: `www`
      - Valor: `cname.vercel-dns.com`
      - TTL: `300`

      **Borrar registros AAAA antiguos** (IPv6 del hosting viejo) si existen

- [ ] **G3.** Guardar y anotar la hora exacta del cambio: `__:__`

## H) Verificación de propagación (T+0 a T+30 min)

- [ ] **H1.** Esperar 5 min, luego verificar:
      `dig artebrisapatagonia.com @8.8.8.8`        → debe responder `76.76.21.21`
      `dig artebrisapatagonia.com @1.1.1.1`        → ídem
      `dig www.artebrisapatagonia.com @8.8.8.8`    → debe responder `cname.vercel-dns.com`
- [ ] **H2.** Verificar global: https://www.whatsmydns.net/#A/artebrisapatagonia.com
      (esperar mayoría de servidores en verde, ≥ 80 %)
- [ ] **H3.** Volver a Vercel → Domains → debe aparecer ✅ "Valid Configuration"
      Si tarda más de 15 min: clickear "Refresh"
- [ ] **H4.** Verificar emisión de SSL: `https://artebrisapatagonia.com` debe abrir SIN warning
      (Vercel emite Let's Encrypt automático en 1-2 min después de validar DNS)

## I) Smoke test post-corte (T+30 min)

- [ ] **I1.** Abrir `https://artebrisapatagonia.com` en navegador limpio (modo incógnito)
- [ ] **I2.** Verificar HTTPS verde, certificado emitido para `artebrisapatagonia.com`
- [ ] **I3.** Navegar: `/`, `/cabanas`, `/departamentos`, `/unidad/<id>` — todas deben cargar
- [ ] **I4.** Probar el widget de reserva (no enviar realmente, solo abrir y poner fechas)
- [ ] **I5.** Probar `/admin` → login con credenciales reales → debe llegar a `/admin/reservas`
      ⚠️ Si falla aquí: revisar Supabase Auth Site URL (paso E2)
- [ ] **I6.** En `/admin/reservas`, ejecutar botón "Sync ahora" del panel iCal — debe completar OK
- [ ] **I7.** Verificar meta tags con https://www.opengraph.xyz/url/https%3A%2F%2Fartebrisapatagonia.com
      → og:url y og:image deben mostrar el dominio nuevo
- [ ] **I8.** Compartir el link en WhatsApp (a uno mismo) → debe mostrar preview con la imagen correcta

## J) Activar el redirect del subdominio (T+1 h)

- [ ] **J1.** En este punto el redirect 301 del vercel.json ya está activo (desplegado en paso F)
- [ ] **J2.** Probar: abrir `https://ab.anduschile.com/cabanas` → debe redirigir a `https://artebrisapatagonia.com/cabanas`
- [ ] **J3.** Probar con `curl -I https://ab.anduschile.com/` → debe devolver `HTTP/2 301` + `location: https://artebrisapatagonia.com/`
- [ ] **J4.** Probar varias rutas: `/admin`, `/unidad/cualquier-id`, `/departamentos`
```

### Post-migración (T+1 día a T+7 días)

```markdown
## K) Actualizar integraciones externas

- [ ] **K1.** Booking.com extranet → Calendar sync:
      (sólo si la dueña ya pegó el iCal de la web; si no, esperar a que se implemente export ICS)
- [ ] **K2.** Airbnb host → Listing → Calendar → Sync calendars:
      reemplazar URL antigua por nueva si existe
- [ ] **K3.** Bio de Instagram → reemplazar link
- [ ] **K4.** Página de Facebook → "Sobre" → Sitio web
- [ ] **K5.** Google My Business / Perfil de Empresa → sitio web

## L) SEO y Search Console

- [ ] **L1.** Google Search Console → Add Property → `https://artebrisapatagonia.com`
      Verificar via DNS TXT o meta tag
- [ ] **L2.** Submit del sitemap: `https://artebrisapatagonia.com/sitemap.xml`
      (cuando exista — viene en Fase 1 de roadmap)
- [ ] **L3.** Google Search Console → propiedad vieja (si existía para `ab.anduschile.com`):
      ir a Settings → Change of address → indicar el dominio nuevo
- [ ] **L4.** Solicitar indexación de las URLs principales (Inspeccionar URL → Solicitar indexación):
      `/`, `/cabanas`, `/departamentos`
- [ ] **L5.** Esperar 7-30 días para que Google empiece a mostrar el dominio nuevo en SERPs

## M) Monitoreo (T+1 día a T+7 días)

- [ ] **M1.** Revisar `/admin/reservas` diariamente para confirmar que las inquiries llegan normalmente
- [ ] **M2.** Verificar logs de Vercel: no debe haber 404 masivos
- [ ] **M3.** Verificar que el cron de GitHub Actions `ical-sync.yml` sigue corriendo verde cada 30 min
- [ ] **M4.** Verificar Supabase → Logs → no debe haber spike de auth errors

## N) Cleanup (T+30 días, una vez verificado todo OK)

- [ ] **N1.** Supabase Auth → Redirect URLs → **quitar** `https://ab.anduschile.com/**`
      (NO antes — si la propietaria tiene un link viejo guardado y entra, debe redirigir bien)
- [ ] **N2.** Subir TTL del DNS a 3600 o 86400 (estable)
- [ ] **N3.** Vercel → Domains → considerar si mantener `ab.anduschile.com` o quitarlo:
      🔵 Recomendación: **MANTENERLO indefinidamente** con el redirect 301 activo.
      Es gratis y preserva el link juice. Solo quitar si necesitas el subdominio para otro proyecto.
- [ ] **N4.** Borrar el `backup-old-site-YYYYMMDD/` después de 60 días sin incidentes
```

---

## TAREA 3 — Configuración del redirect 301 en `vercel.json`

### Reemplazar el contenido completo de `vercel.json` por:

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "ab.anduschile.com"
        }
      ],
      "destination": "https://artebrisapatagonia.com/:path*",
      "permanent": true
    },
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "www.artebrisapatagonia.com"
        }
      ],
      "destination": "https://artebrisapatagonia.com/:path*",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/((?!.*\\.).*)",
      "destination": "/"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### Notas clave sobre esta configuración

1. **Redirects van antes que rewrites** — Vercel los procesa primero. El redirect del subdominio se evalúa y dispara antes de que la SPA reciba la request.
2. **`permanent: true` = HTTP 301** (no 302). Esto le dice a Google "transfiere todo el link juice al dominio nuevo".
3. **`has` con `type: host`** es la pieza crítica: aplica el redirect SOLO cuando el navegador pidió `ab.anduschile.com`. Si la request llega a `artebrisapatagonia.com`, el redirect NO se dispara.
4. **`/:path*` preserva el path completo**: `ab.anduschile.com/cabanas` → `artebrisapatagonia.com/cabanas`. También preserva la query string automáticamente.
5. **El segundo redirect (www → apex)** fuerza la versión canónica sin `www`. Si prefieres `www`, invertir la lógica.
6. **El `rewrite` cambió** de `"/(.*)"` a `"/((?!.*\\.).*)"`:
   - El viejo `"/(.*)"` reescribía TODO (incluso `/favicon.ico` y `/og-image.png`) a `/`, lo cual rompía los assets estáticos. Funcionaba por casualidad porque Vercel sirve estáticos antes que rewrites.
   - El nuevo regex `((?!.*\.).*)` solo aplica el rewrite a rutas SIN punto (es decir, rutas de SPA), dejando `/foo.png`, `/sitemap.xml`, etc., en paz.
7. **`headers`** agrega seguridad básica (recomendación de Fase 1 del roadmap). Si se prefiere postergar, dejar solo `redirects` y `rewrites`.

### Verificación manual del redirect después del deploy

```bash
# Test 1: redirect del subdominio antiguo
curl -I https://ab.anduschile.com/
# Esperado: HTTP/2 301 / location: https://artebrisapatagonia.com/

# Test 2: redirect preservando path
curl -I https://ab.anduschile.com/cabanas
# Esperado: HTTP/2 301 / location: https://artebrisapatagonia.com/cabanas

# Test 3: redirect preservando query string
curl -I "https://ab.anduschile.com/admin/reservas?status=inquiry"
# Esperado: HTTP/2 301 / location: https://artebrisapatagonia.com/admin/reservas?status=inquiry

# Test 4: www → apex
curl -I https://www.artebrisapatagonia.com/cabanas
# Esperado: HTTP/2 301 / location: https://artebrisapatagonia.com/cabanas

# Test 5: dominio nuevo NO se redirige a sí mismo (loop protection)
curl -I https://artebrisapatagonia.com/cabanas
# Esperado: HTTP/2 200 (sin location)
```

---

## TAREA 4 — Variables de entorno

### Inventario completo

| Variable | Lugar | Uso | ¿Cambia con dominio? | ¿Sensible? |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (Vite) | URL del proyecto Supabase. Usada en [src/lib/supabaseClient.js:3](src/lib/supabaseClient.js#L3) y [src/data/admin/icalSync.js:3](src/data/admin/icalSync.js#L3) | ❌ No (es URL de Supabase, no del sitio) | Pública (`VITE_*`) — OK exponer |
| `VITE_SUPABASE_ANON_KEY` | Frontend (Vite) | Anon key para PostgREST + Auth. Usada en [src/lib/supabaseClient.js:4](src/lib/supabaseClient.js#L4) | ❌ No | Pública (`VITE_*`) — OK exponer, es el diseño de Supabase. **Toda la seguridad depende de RLS** |
| `VITE_WHATSAPP` | Frontend (Vite) | Número WhatsApp para CTAs. [src/config/contact.js:13](src/config/contact.js#L13). Fallback: `'56950921745'` | ❌ No | Pública. Si cambia el número, actualizar aquí (o editar el fallback en `contact.js`) |
| `SUPABASE_URL` | Edge Function (Deno) | **Auto-inyectada** por Supabase en `Deno.env.get('SUPABASE_URL')`. [supabase/functions/sync-ical/index.ts:125](supabase/functions/sync-ical/index.ts#L125) | ❌ No | Pública. No configurable manualmente |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function (Deno) | Service role para bypass de RLS en el sync iCal. [supabase/functions/sync-ical/index.ts:126](supabase/functions/sync-ical/index.ts#L126) | ❌ No | **SECRETA — NUNCA exponer al frontend.** Solo Supabase secrets |
| `ICAL_CRON_TOKEN` | Edge Function (Deno) + GitHub Actions | Token compartido para autenticar el cron de GitHub vs Edge Function. [supabase/functions/sync-ical/index.ts:116](supabase/functions/sync-ical/index.ts#L116) | ❌ No | **SECRETA** — debe coincidir en Supabase secrets y GitHub Secrets |
| `SUPABASE_SYNC_ICAL_URL` | GitHub Actions | URL completa de la Edge Function `sync-ical`. [.github/workflows/ical-sync.yml:14](.github/workflows/ical-sync.yml#L14) | ❌ No (es URL de Supabase) | **SECRETA por convención**, aunque la URL en sí no es secreta |

### `.env.example` actualizado (sugerido)

```bash
# Arte Brisa Patagonia — Variables de entorno
# Copia este archivo como .env y completa con tus credenciales reales

# ── Supabase (frontend) ─────────────────────────────────────────────────
# Public Anon Key — segura para el cliente, toda protección es por RLS
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...TU_ANON_KEY

# ── WhatsApp para CTAs ──────────────────────────────────────────────────
# Formato internacional sin "+", sin espacios, sin guiones
# Chile: 56 + 9 + 8 dígitos = 56912345678
VITE_WHATSAPP=56950921745
```

### Variables en **Vercel** (Settings → Environment Variables)

Estas deben existir en los 3 entornos (Production, Preview, Development) o como mínimo en Production:

```
VITE_SUPABASE_URL          = https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJ...
VITE_WHATSAPP              = 56950921745
```

**Nada cambia en Vercel por la migración de dominio**, salvo que se decida agregar una variable nueva como `VITE_SITE_URL=https://artebrisapatagonia.com` para usar en JSON-LD / sitemap dinámico (recomendado para Fase 1).

### Variables en **Supabase secrets** (CLI: `supabase secrets list`)

```
SUPABASE_SERVICE_ROLE_KEY  (auto)
SUPABASE_URL               (auto)
ICAL_CRON_TOKEN            = <generar con: openssl rand -hex 32>
```

### Variables en **GitHub Actions** (Settings → Secrets and variables → Actions)

```
SUPABASE_SYNC_ICAL_URL     = https://<proyecto>.supabase.co/functions/v1/sync-ical
ICAL_CRON_TOKEN            = <mismo valor que en Supabase secrets>
```

### Riesgo de exposición evaluado

| Variable | Riesgo si se expone | Mitigación actual |
|---|---|---|
| `VITE_SUPABASE_ANON_KEY` | Bajo si RLS está bien | **Confirmar** que existen políticas RLS estrictas en `core_reservations`, `core_guests`, `core_unit_daily_rates`, `core_app_users`. Las migraciones del repo solo definen RLS en `core_unit_daily_rates` ([20260223_dynamic_rates.sql:41-50](supabase/migrations/20260223_dynamic_rates.sql#L41-L50)). Las demás tablas **deben** tener RLS configurado en el dashboard. |
| `SUPABASE_SERVICE_ROLE_KEY` | **CRÍTICO** — bypassa toda seguridad | Verificar que NO existe ninguna variable `VITE_*` que la contenga. ✓ Confirmado: no aparece en el cliente |
| `ICAL_CRON_TOKEN` | Medio — permitiría triggerar syncs (DoS bajo) | Solo se envía en header server-to-server. ✓ OK |
| `VITE_WHATSAPP` | Ninguno — es un número público | — |

### Checklist de variables para el día del corte

```markdown
- [ ] Verificar que las 3 `VITE_*` están en Vercel Production
- [ ] Verificar que `SUPABASE_SERVICE_ROLE_KEY` e `ICAL_CRON_TOKEN` están en Supabase secrets:
      `supabase secrets list --project-ref <PROJECT_REF>`
- [ ] Verificar que `SUPABASE_SYNC_ICAL_URL` e `ICAL_CRON_TOKEN` están en GitHub Secrets
      (ir a Settings → Secrets and variables → Actions)
- [ ] Ejecutar manualmente el workflow `ical-sync.yml` (Run workflow) para confirmar que sigue corriendo verde
- [ ] (Opcional, Fase 1) Agregar `VITE_SITE_URL=https://artebrisapatagonia.com` en Vercel para uso en sitemap/JSON-LD futuros
```

---

## Resumen ejecutivo (1 minuto)

| Elemento | Cantidad | Esfuerzo |
|---|---|---|
| Archivos de código con referencias hardcodeadas | **1** ([index.html](index.html)) — 4 líneas | 5 min |
| Cambios en `vercel.json` | 1 archivo, ~30 líneas nuevas | 5 min |
| Cambios en Supabase | Auth → Site URL + Redirect URLs | 5 min |
| Cambios DNS | 2 registros (A apex + CNAME www) | 5 min + 5-30 min de propagación |
| Variables de entorno | **0 cambian** | — |
| Downtime esperado | **~0** (TTL bajo + Vercel emite SSL automático) | — |
| Ventana total recomendada | **1.5 h** (incluye smoke test y verificación) | — |

### Orden recomendado para minimizar riesgo

1. **T-7 días:** rama `domain-migration` con los 4 cambios en `index.html` + nuevo `vercel.json`
2. **T-3 días:** agregar dominio en Vercel (no rompe nada, queda en "Invalid Configuration")
3. **T-2 días:** bajar TTL del DNS a 300
4. **T-1 día:** actualizar Supabase Auth + mergear PR
5. **T-0:** cambiar registros DNS, verificar SSL, smoke test (1.5 h)
6. **T+1 día:** verificar inquiries entrando, ejecutar `ical-sync` manual, monitorear
7. **T+7 días:** Google Search Console, actualizar integraciones externas
8. **T+30 días:** quitar `ab.anduschile.com` de Supabase redirect URLs (no del Vercel — eso se mantiene)

---

*Reporte generado el 2026-05-25 con base en el código de la rama `main`.*
