# Museo Arqueológico Piedra Pintada — Progreso del Proyecto

**Método:** F.R.A.M.E. | **Versión:** 1.0 | **Última actualización:** 2026-06-30

> Este documento es el **tablero vivo** del proyecto: refleja qué está hecho y qué no.
> - Para **arrancar el proyecto** en tu máquina: lee `README.md` en la raíz.
> - Para saber **qué trabajo queda y cómo abordarlo**: lee `docs/ROADMAP-PENDIENTE.md`.
> - Para entender **la arquitectura completa** (modelo de datos, contrato API, seguridad): `docs/arquitectura.md`.

---

## Estado General

| Fase | Pasos | Completados | Estado |
|------|-------|-------------|--------|
| F · Foundation | 10 | 10 | ✅ Completada |
| R · Render | 17 | 16 | ✅ Prácticamente completa (frontend del equipo) |
| A · Animation | 3 | 3 | ✅ Integrada en el frontend |
| M · Montaje | 16 | 13 | 🚀 En curso (M0–M4.9, M6 listos. Falta M5) |
| E · Entrega | 8 | 4 | 🚀 En curso (Pre-despliegue listo) |

**Avance global aproximado: 41/54 pasos.**

---

## Resumen del estado real

El **frontend** (carpeta `frontend/`, aportado por el equipo) está construido con calidad de producción y cubre toda la Fase R y la Fase A: tema oscuro con glassmorphism, tipografías Cinzel/Raleway, header/footer inyectados dinámicamente vía JS, todas las pantallas del plan, y ya integra Leaflet real, cámara (`getUserMedia`), voz (`speechSynthesis`) y GPS (`geolocation`) en el recorrido, además de animaciones (scroll-reveal, toasts, escaneo QR animado).

El **backend** (carpeta `backend/`) arrancó en esta sesión. Se completaron y **probaron con 18/18 verificaciones de integración** los pasos M0 (estructura), M1 (base de datos), M2 (servidor Express) y M3 (autenticación con bcrypt + JWT + RBAC).

La **base de datos** (`db/schema.sql` + `db/seed.sql`) implementa las 13 tablas del modelo F3, con datos de ejemplo alineados a lo que ya muestra el frontend (las 12 estaciones, sus códigos QR y coordenadas).

---

## Tablero de Progreso Detallado

### FASE F · FOUNDATION — ✅ Completada
Documento de arquitectura completo en `docs/arquitectura.md` (F1.1–F1.7, F2, F3, F4).

### FASE R · RENDER — ✅ 16/17 (en `frontend/`)

| ID | Paso | Estado | Archivo |
|----|------|--------|---------|
| R1 | Guía visual | ✅ | `frontend/css/estilos.css` (tokens + design system) |
| R2 | Inventario de imágenes | ⚠️ Parcial | Imágenes generadas en `assets/img/`; falta el doc de prompts |
| R3 | Componentes base | ✅ | `frontend/js/componentes.js` (header/footer dinámicos) |
| R4 | Inicio | ✅ | `frontend/index.html` |
| R5 | Información | ✅ | `frontend/pages/informacion.html` |
| R6 | Catálogo petroglifos | ✅ | `frontend/pages/petroglifos.html` |
| R7 | Detalle petroglifo | ✅ | `frontend/pages/petroglifo-detalle.html` |
| R8 | Recorrido interactivo | ✅ | `frontend/pages/recorrido.html` (Leaflet+cámara+voz+GPS) |
| R9 | Mapa del parque | ✅ | `frontend/pages/mapa.html` |
| R10 | Reserva institucional | ✅ | `frontend/pages/reservas.html` |
| R11 | Noticias | ✅ | `frontend/pages/noticias.html` |
| R12 | Preguntas y respuestas | ✅ | `frontend/pages/preguntas.html` |
| R13 | Reseñas | ✅ | `frontend/pages/resenas.html` |
| R14 | Trivia | ✅ | `frontend/pages/trivia.html` |
| R15 | Login / registro | ✅ | `frontend/pages/login.html` |
| R16 | Panel admin | ✅ | `frontend/pages/admin/dashboard.html` |
| R17 | Revisión responsive global | ⬜ Pendiente | Verificación final recomendada |

### FASE A · ANIMATION — ✅ Integrada

| ID | Paso | Estado | Evidencia |
|----|------|--------|-----------|
| A1 | Tokens de movimiento | ✅ | `--dur-*`, `--ease-*` en `estilos.css` |
| A2 | Catálogo de microinteracciones | ✅ | Toasts, scroll-reveal, hover, escaneo QR animado |
| A3 | Animaciones en prototipos | ✅ | Aplicadas en todas las páginas |

### FASE M · MONTAJE — 🚀 4/16

| ID | Paso | Estado | Prueba |
|----|------|--------|--------|
| M0 | Estructura del proyecto + entorno | ✅ Hecho | npm install OK · app carga sin errores |
| M1 | Base de datos: schema.sql + seed.sql | ✅ Hecho | Carga + integridad referencial (pg-mem) ✓ |
| M2 | Backend base (Express + middlewares) | ✅ Hecho | GET /api/health 200 ✓ |
| M3 | Auth (bcrypt + JWT + RBAC) | ✅ Hecho | 12 verificaciones de auth/RBAC ✓ |
| M4.1 | API: Petroglifos + estaciones | ✅ Hecho | 10 verificaciones M4.1 pasadas ✓ |
| M4.2 | API: Recorridos | ✅ Hecho | Completado con JOIN de estaciones |
| M4.3 | API: Reservas institucionales | ✅ Hecho | Completado ✓ |
| M4.4 | API: Comentarios / reseñas | ✅ Hecho | Completado ✓ |
| M4.5 | API: Fotos | ✅ Hecho | Completado (con Multer) ✓ |
| M4.6 | API: Preguntas y respuestas | ✅ Hecho | Completado ✓ |
| M4.7 | API: Noticias y eventos | ✅ Hecho | Completado ✓ |
| M4.8 | API: Trivia | ✅ Hecho | Completado ✓ |
| M4.9 | API: Contador de visitas | ✅ Hecho | Completado ✓ |
| M5 | Suite de pruebas backend | ⬜ Pendiente | — |
| M6 | Frontend conectado a API | ✅ Hecho | Todas las páginas conectadas ✓ |
| M7 | Capa PWA | ⬜ Pendiente | — |
| M8 | Offline real + mapa descargable | ⬜ Pendiente | — |
| M9 | Integraciones de dispositivo | ⚠️ Parcial | Ya hay cámara/QR/voz/GPS en el frontend; falta conectar a datos reales |

### FASE E · ENTREGA — ⬜ 0/8
E1–E8 pendientes (repositorio, configuración de producción, despliegues, HTTPS/CORS, smoke test, documentación final).

---

## Historial de Cambios

### 2026-07-07 — Preparativos de Producción y Despliegue (Fase E)
- **Fase E (Despliegue Mundial):** Se omitieron las fases M7 y M8 (PWA offline) para priorizar el lanzamiento a producción.
- **Arquitectura Monolítica:** Se modificó `backend/src/app.js` para servir los archivos estáticos del frontend (`../../frontend`) y las fotos (`/uploads`).
- **Rutas Relativas:** Se actualizó `frontend/js/api.js` para usar la ruta relativa `/api`, garantizando el funcionamiento sin errores de CORS independientemente del dominio donde se aloje.
- **Seguridad (CSP):** Se desactivó temporalmente la política `contentSecurityPolicy` del middleware `helmet` en `app.js` para permitir la ejecución de los scripts y estilos inline que requiere la UI del frontend.
- **Automatización:** Se añadió soporte para múltiples motores Node.js (`engines`) y un script `db:init` en `package.json` para facilitar la inicialización automática de la base de datos PostgreSQL en plataformas como Render o Supabase.

### 2026-07-07 — M6 Implementado (Frontend conectado a API)
- **M6:** Se creó `frontend/js/api.js` para centralizar las peticiones (fetch) al backend.
- Se conectaron dinámicamente las páginas: `petroglifos.html`, `recorrido.html`, `noticias.html`, `trivia.html`, `resenas.html`, `preguntas.html`, `login.html`, `reservas.html`.
- Se eliminaron los datos mockeados en las páginas y ahora obtienen sus datos directamente de la base de datos PostgreSQL a través del backend en el puerto 3000.
- **Próximo paso:** M5 (Pruebas backend) o M7 (PWA).

### 2026-07-06 — M4.5 y M4.8 Implementados (Fotos y Trivia)
- **M4.5:** Módulo de Fotos integrado usando `multer` para subida de archivos (guardados en `public/uploads`) y `express.static` para servirlos.
- **M4.8:** Módulo de Trivia implementado (banco de preguntas aleatorias con `ORDER BY RANDOM()` y guardado de resultados en JSONB).
- **Hito:** FASE M4 (CONSTRUCCIÓN DE LA API) 100% COMPLETADA.

### 2026-07-06 — M4.3, M4.4 y M4.6 Implementados (Interactividad)
- **M4.3:** API de Reservas (uso de `req.usuario.institucion_nombre` para seguridad, validación de fechas futuras).
- **M4.4:** API de Comentarios (solo los aprobados son públicos, creación como pendiente por defecto).
- **M4.6:** API de Preguntas (soporte para usuarios anónimos o registrados, y respuestas del admin).
- **Próximo paso:** M4.5 (Fotos) y M4.8 (Trivia).

### 2026-07-06 — M4.7 y M4.9 Implementados (Noticias y Visitas)
- **M4.7:** API de Noticias y Eventos creada (listar públicas activas, y CRUD protegido para admin).
- **M4.9:** Contador de visitas creado con endpoints GET para consultar y POST para incrementar.
- **Próximo paso:** M4.3, M4.4 y M4.6 (Reservas, Comentarios, Preguntas).

### 2026-07-06 — M4.2 Implementado (Recorridos)
- **M4.2:** Se implementaron los controladores y rutas para `recorridos`.
- Endpoint `GET /api/recorridos/:id` realiza un JOIN con `recorrido_estaciones` y `estaciones` para devolver el recorrido en orden.
- Lógica transaccional (BEGIN/COMMIT) para crear y editar recorridos junto con sus estaciones.
- **Próximo paso:** M4.7 — Noticias y Eventos, M4.9 — Visitas.

### 2026-07-06 — M4.1 Implementado (Petroglifos + Estaciones)
- **M4.1:** Se implementaron los controladores y rutas para `petroglifos` y `estaciones`.
- Rutas públicas: lectura y filtrado.
- Búsqueda por código QR en estaciones implementada.
- Rutas protegidas (admin) creadas para CRUD completo, validadas con JWT, RBAC y express-validator.
- Se verificaron los 10 criterios de aceptación de M4.1.
- **Próximo paso:** M4.2 — Endpoints de Recorridos.

### 2026-06-30 — Verificación end-to-end en máquina real + documentos de traspaso
- Backend probado en Windows + PostgreSQL real: `npm install` OK, schema y seed cargados sin errores (3+12+12+1+12+3+2+4+5+1 inserts), `/api/health` responde `ok:true` con conexión a BD, login del admin devuelve JWT válido.
- Generados los documentos de traspaso a otro desarrollador: `README.md` raíz consolidado, `docs/ROADMAP-PENDIENTE.md` (qué falta, cómo hacerlo, criterios de aceptación por paso), `docs/GUIA-INSTALACION.md` (paso a paso largo).
- **Próximo paso:** M4.1 — Endpoints de petroglifos y estaciones.

### 2026-06-28 — Fase M arrancada: M0 + M1 + M2 + M3 (backend base)
- **M0:** Estructura `backend/` (config, middlewares, controllers, routes, utils), `package.json`, `.env.example`, `.gitignore`.
- **M1:** `db/schema.sql` (13 tablas, claves, CHECK, índices) + `db/seed.sql` (datos alineados al frontend: 12 estaciones/petroglifos, QR, trivia, noticias, FAQ).
- **M2:** Servidor Express con helmet, CORS por whitelist, rate-limit (general + estricto en auth), validación, manejo central de errores, `GET /api/health`.
- **M3:** Autenticación: registro (bcrypt), login (JWT), `/perfil`, middlewares `requiereSesion` y `requiereRol` (RBAC).
- **Pruebas:** smoke test de integración con pg-mem → **18/18 OK** (carga de schema+seed, integridad, health, registro, duplicados 409, validación 422, login ok/mal, rutas protegidas 401, RBAC 403/200).
- **Decisión:** se usa `bcryptjs` (JS puro) en vez de `bcrypt` para evitar fallos de compilación nativa en hosting gratuito. Compatible y misma seguridad.
- **Próximo paso:** M4.1 — API de Petroglifos + estaciones (CRUD admin + lectura pública + lectura por código QR).

### 2026-06-28 — Diagnóstico del frontend aportado
- Se integró la carpeta `frontend/` del equipo como fuente canónica. Cubre R1, R3–R16 y A1–A3 con calidad de producción.

### 2026-06-28 — Fase F completa
- Documento de arquitectura `docs/arquitectura.md` (F1.1–F4).

---

## Para otro agente de IA o desarrollador

**Contexto:** Sitio web + PWA para el Museo Arqueológico Piedra Pintada (Venezuela). Método F.R.A.M.E.

**Pila:** Frontend HTML/CSS/JS vanilla (tema oscuro, Leaflet, voz, cámara, GPS) · Backend Node.js + Express · PostgreSQL · JWT + bcryptjs · helmet/cors/rate-limit.

**Decisiones S1–S4:** S1 contenido placeholder hasta tener el real · S2 despliegue en nube gratuita (verificar acceso desde Venezuela) · S3 reconocimiento por QR · S4 solo español.

**Estado actual:** Frontend completo (R/A). Backend con base, BD y auth listos y probados (M0–M3). 

**Cómo correr el backend:** ver `backend/README.md`. Resumen: `cd backend && npm install`, configurar `.env`, cargar `db/schema.sql` + `db/seed.sql` en PostgreSQL, `npm run dev`, probar `GET /api/health`.

**Siguiente trabajo (en orden):**
1. M4.1–M4.9: los 9 grupos de endpoints REST (CRUD + permisos por rol).
2. M5: suite Jest + Supertest + pg-mem (ya hay un smoke test de referencia que se puede formalizar).
3. M6: conectar el frontend a la API (hoy usa datos hardcodeados en cada página).
4. M7–M9: PWA (manifest + service worker), offline real (IndexedDB + mapa descargable), y enganchar cámara/QR/voz/GPS a los datos reales.
5. Fase E: despliegue.

**Archivos clave:**
- `docs/arquitectura.md` — Arquitectura completa (modelo de datos, contrato API, seguridad).
- `docs/PROGRESO.md` — Este archivo.
- `backend/README.md` — Cómo correr y probar el backend.
- `db/schema.sql`, `db/seed.sql` — Base de datos.
- `frontend/` — Sitio completo.
