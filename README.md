# Museo Arqueológico Piedra Pintada — Página web + PWA

Sitio web y aplicación interactiva para el Museo Arqueológico Piedra Pintada (Venezuela). Construido con la metodología **F.R.A.M.E.** (Foundation · Render · Animation · Montaje · Entrega).

> **Para empezar a trabajar en el proyecto, lee este archivo y luego `docs/PROGRESO.md` (estado actual) y `docs/ROADMAP-PENDIENTE.md` (qué falta).**

---

## Estructura del repositorio

```
museo-piedra-pintada/
├── frontend/                     # Sitio HTML/CSS/JS vanilla (PWA-ready)
│   ├── index.html
│   ├── css/estilos.css           # Design system completo
│   ├── js/
│   │   ├── app.js                # Animaciones, validación, toasts, helpers
│   │   └── componentes.js        # Inyecta header/footer dinámicamente
│   ├── pages/                    # 11 pantallas (catálogo, recorrido, trivia, admin, ...)
│   └── assets/                   # Imágenes
├── backend/                      # API REST Node.js + Express
│   ├── src/
│   │   ├── server.js             # Punto de entrada
│   │   ├── app.js                # Configuración Express + middlewares
│   │   ├── config/               # env, db (pool PostgreSQL)
│   │   ├── middlewares/          # auth (JWT+RBAC), validación, errores
│   │   ├── controllers/          # Lógica por recurso
│   │   ├── routes/               # Rutas por recurso
│   │   └── utils/                # JWT, formato de respuestas
│   ├── package.json
│   ├── .env.example              # Plantilla de variables (copiar a .env)
│   └── README.md                 # Detalles del backend
├── db/
│   ├── schema.sql                # 13 tablas + índices
│   └── seed.sql                  # Datos de ejemplo alineados al frontend
└── docs/
    ├── PROGRESO.md               # Estado del proyecto (tablero F.R.A.M.E.)
    ├── ROADMAP-PENDIENTE.md      # Qué falta por hacer, con criterios de aceptación
    └── GUIA-INSTALACION.md       # Paso a paso largo y detallado (alternativa a este README)
```

---

## Arranque rápido — 6 pasos para tenerlo corriendo

### Requisitos

- **Node.js 18+** — https://nodejs.org (versión LTS)
- **PostgreSQL 14+** — https://www.postgresql.org/download/

Verifica que están:

```bash
node --version
psql --version
```

### 1. Instalar dependencias del backend

```bash
cd backend
npm install
```

*Esperado:* `added 433 packages` sin `npm ERR!`. Los `npm warn deprecated` y las "vulnerabilities" reportadas son de dependencias de testing — no afectan el código de producción. No corras `npm audit fix --force`.

### 2. Crear la base de datos

```bash
psql -U postgres -c "CREATE DATABASE museo_piedra_pintada;"
```

### 3. Cargar el esquema y los datos de ejemplo

```bash
psql -U postgres -d museo_piedra_pintada -f ../db/schema.sql
psql -U postgres -d museo_piedra_pintada -f ../db/seed.sql
```

*Esperado del schema:* 13 `CREATE TABLE` + 9 `CREATE INDEX`. Los `NOTICE: ... no existe, omitiendo` son normales en la primera carga.

*Esperado del seed:* exactamente esta secuencia de inserciones (en este orden):

```
INSERT 0 3     (usuarios)
INSERT 0 12    (petroglifos)
INSERT 0 12    (estaciones)
INSERT 0 1     (recorridos)
INSERT 0 12    (recorrido_estaciones)
INSERT 0 3     (noticias_eventos)
INSERT 0 2     (comentarios_resenas)
INSERT 0 4     (preguntas_respuestas)
INSERT 0 5     (preguntas_trivia)
INSERT 0 1     (visitas_sitio)
```

### 4. Configurar las variables de entorno

```bash
# Windows:
copy .env.example .env
# Linux/Mac:
cp .env.example .env
```

Edita `.env` y reemplaza `DB_PASSWORD=postgres` por la contraseña real que usaste al instalar PostgreSQL. El resto queda como está.

### 5. Arrancar el backend

```bash
npm run dev
```

*Esperado:*
```
[BD] Conectada (2026-...)
[API] Museo Piedra Pintada escuchando en http://localhost:3000
[API] Entorno: development · Salud: http://localhost:3000/api/health
```

Verifica en el navegador: `http://localhost:3000/api/health` debe responder:
```json
{"ok":true,"datos":{"estado":"ok","bd":"conectada","hora":"..."}}
```

**Deja esta terminal corriendo.** El servidor vive ahí.

### 6. Abrir el frontend

Doble clic en `frontend/index.html`, o (recomendado para funciones avanzadas) sirve la carpeta:

```bash
cd frontend
npx serve .
```

> **Nota importante:** el frontend está visualmente completo pero **todavía no consume el backend** (las pantallas usan datos hardcodeados internos). Conectar las dos piezas es el trabajo siguiente — ver `docs/ROADMAP-PENDIENTE.md`.

---

## Verificar que la autenticación funciona

Con el servidor corriendo, en otra terminal:

```bash
# Windows PowerShell:
curl.exe -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{\"correo\":\"admin@piedrapintada.ve\",\"contrasena\":\"Admin1234\"}'

# Linux/Mac:
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"correo":"admin@piedrapintada.ve","contrasena":"Admin1234"}'
```

Debe devolver `"ok":true` con un `"token":"eyJ..."`.

### Usuarios del seed (contraseña común: `Admin1234`)

| Rol | Correo |
|-----|--------|
| admin | admin@piedrapintada.ve |
| registrado | maria@example.com |
| institucion | liceo@institucion.ve |

---

## Endpoints disponibles (estado actual)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/health` | público | Estado del servidor y la BD |
| POST | `/api/auth/registro` | público | Crear cuenta (rol registrado o institución) |
| POST | `/api/auth/login` | público | Iniciar sesión, devuelve JWT |
| GET | `/api/auth/perfil` | con token | Datos del usuario autenticado |

Todos los demás endpoints (petroglifos, estaciones, recorridos, reservas, comentarios, fotos, preguntas, noticias, trivia, visitas) **están pendientes** — ver `docs/ROADMAP-PENDIENTE.md`.

---

## Pila tecnológica

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript vanilla, mobile-first |
| Frontend (futuro) | PWA con Service Worker + IndexedDB |
| Backend | Node.js 18+ · Express 4 |
| Base de datos | PostgreSQL 14+ |
| Seguridad | helmet · CORS whitelist · rate-limit · JWT · bcryptjs |
| Validación | express-validator |
| Mapa | Leaflet (online) + imagen georreferenciada (offline) |
| Escáner QR | `BarcodeDetector` del navegador (con fallback `html5-qrcode`) |
| Voz | Web Speech API (`speechSynthesis`) |
| GPS | `navigator.geolocation` |
| Pruebas backend | Jest + Supertest + pg-mem |

---

## Decisiones del proyecto (S1–S4, confirmadas)

- **S1 Contenido:** datos de ejemplo (placeholders) hasta que esté el contenido real; el panel admin permite cargarlo luego.
- **S2 Despliegue:** niveles gratuitos de nube — combinación a elegir entre Neon/Supabase (BD) + Render/Railway (backend) + Netlify/Vercel (frontend). Verificar acceso desde Venezuela antes de fijar proveedor.
- **S3 Reconocimiento:** por código QR (no reconocimiento visual puro del petroglifo).
- **S4 Idioma:** solo español. Versión bilingüe es mejora futura.

---


## Para profundizar

- **Estado actual detallado:** `docs/PROGRESO.md`
- **Qué falta por hacer:** `docs/ROADMAP-PENDIENTE.md`
- **Detalle del backend:** `backend/README.md`
- **Guía de instalación paso a paso (versión larga):** `docs/GUIA-INSTALACION.md`
