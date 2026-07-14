# Backend — Museo Arqueológico Piedra Pintada

API REST en Node.js + Express + PostgreSQL. Fase **M** del método F.R.A.M.E.

Estado actual: **M0, M1, M2, M3 completados** (estructura, base de datos, servidor y autenticación). Probado con 18/18 verificaciones de integración.

---

## Requisitos

- Node.js 18+ (probado en v22)
- PostgreSQL 14+ (local o en la nube: Neon/Supabase)

## Instalación

```bash
cd backend
npm install
cp .env.example .env      # edita .env con tus credenciales de BD
```

## Crear la base de datos

```bash
# 1. Crear la base (una vez)
createdb museo_piedra_pintada

# 2. Cargar esquema y datos de ejemplo
psql -d museo_piedra_pintada -f ../db/schema.sql
psql -d museo_piedra_pintada -f ../db/seed.sql
```

> Si usas una BD en la nube, en vez de lo anterior define `DATABASE_URL` en `.env` y corre los dos `psql ... -f` apuntando a esa URL.

## Arrancar

```bash
npm run dev     # desarrollo con recarga automática (nodemon)
npm start       # producción
```

Verifica que funciona:

```bash
curl http://localhost:3000/api/health
# → {"ok":true,"datos":{"estado":"ok","bd":"conectada","hora":"..."}}
```

---

## Endpoints disponibles (hasta M3)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/health` | público | Estado del servidor y la BD |
| POST | `/api/auth/registro` | público | Crear cuenta (rol `registrado` o `institucion`) |
| POST | `/api/auth/login` | público | Iniciar sesión, devuelve JWT |
| GET | `/api/auth/perfil` | con token | Datos del usuario autenticado |

### Ejemplos

```bash
# Registro
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","correo":"ana@example.com","contrasena":"Clave1234"}'

# Login (usuario admin del seed)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@piedrapintada.ve","contrasena":"Admin1234"}'

# Perfil (usa el token del login)
curl http://localhost:3000/api/auth/perfil \
  -H "Authorization: Bearer <TOKEN>"
```

### Usuarios del seed (para probar)

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| admin | admin@piedrapintada.ve | Admin1234 |
| registrado | maria@example.com | Admin1234 |
| institucion | liceo@institucion.ve | Admin1234 |

---

## Estructura

```
backend/
├── src/
│   ├── server.js              # arranque (conecta BD + escucha)
│   ├── app.js                 # config Express + middlewares de seguridad
│   ├── config/
│   │   ├── env.js             # variables de entorno centralizadas
│   │   └── db.js              # pool de PostgreSQL
│   ├── middlewares/
│   │   ├── auth.js            # JWT + RBAC (requiereSesion, requiereRol)
│   │   ├── validacion.js      # express-validator
│   │   └── errores.js         # 404 + manejo central de errores
│   ├── controllers/
│   │   └── auth.controller.js # registro, login, perfil
│   ├── routes/
│   │   ├── index.js           # router principal (+ /health)
│   │   └── auth.routes.js     # rutas de auth con validación
│   └── utils/
│       ├── jwt.js             # firmar/verificar tokens
│       └── respuestas.js      # formato uniforme { ok, datos } / { ok, error }
└── .env.example
```

## Decisiones técnicas

- **bcryptjs** en vez de `bcrypt`: es JavaScript puro, evita fallos de compilación nativa en despliegues gratuitos (Render/Railway) y es 100% compatible. Misma seguridad.
- **Respuestas uniformes**: toda la API devuelve `{ ok, datos }` en éxito o `{ ok, error, detalles? }` en fallo, para que el frontend maneje todo igual.
- **Seguridad por defecto**: helmet, CORS restringido por whitelist, rate-limit general (300/15min) y estricto en auth (20/15min), validación de entradas, consultas parametrizadas (anti inyección SQL).
- **Errores de BD traducidos**: violaciones de unicidad → 409, de FK → 409, de CHECK → 422.

## Próximos pasos (Fase M)

- **M4.1–M4.9**: endpoints CRUD por recurso (petroglifos, estaciones, recorridos, reservas, comentarios, fotos, preguntas, noticias, trivia, visitas).
- **M5**: suite de pruebas Jest + Supertest + pg-mem.
- **M6**: conectar el frontend (reemplazar datos simulados por la API).
- **M7–M9**: PWA, offline, integraciones de dispositivo.
