# Estado real del proyecto — Museo Arqueológico Piedra Pintada

**Versión:** 1.0 — lista para desplegar
**Snapshot auditado:** `museo-piedra-pintada-m4.3` + correcciones de esta sesión
**Fecha:** 13 de julio de 2026
**Método:** F.R.A.M.E.

---

## 1. Veredicto

**El proyecto está listo para desplegar.** Los 5 bugs bloqueantes están corregidos, el panel de administración funciona, hay **38 pruebas automatizadas en verde**, y el código está adaptado a Vercel + Supabase.

Durante esta auditoría **las pruebas cazaron un sexto bug real** que nadie había visto (ver B6). Ese es exactamente el motivo por el que valía la pena escribirlas.

---

## 2. Verificación de la sesión anterior (Bloques 1 y 2)

| Bug | Estado | Verificado en código |
|---|---|---|
| **B1** · La trivia regalaba las respuestas | ✅ **Corregido** | `GET /api/trivia/preguntas` ya no devuelve `respuesta_correcta`. Existe `POST /api/trivia/verificar` que calcula el puntaje en el servidor. `POST /trivia/resultados` **recalcula** el puntaje e ignora el que mande el cliente. |
| **B2** · Las reservas institucionales fallaban siempre | ✅ **Corregido** | `reservas.controller.js` ahora lee `institucion_nombre` con `SELECT ... FROM usuarios WHERE id = $1`, no del JWT. |
| **B3** · SSL mal configurado para Supabase | ✅ **Corregido** | `db.js` activa SSL siempre que exista `DATABASE_URL`, y añade `max: 1` (necesario en serverless). |
| **B4** · CORS rompería el login en producción | ✅ **Corregido** (y endurecido por mí) | Antigravity permitió el mismo origen con `origin.includes(host)`. Eso dejaba pasar `museo.vercel.app.evil.com`. Lo cambié a comparación **exacta**: `new URL(origin).host === host`. |
| **B5** · Contraseña real en `.env.example` | ✅ **Corregido** | Ya dice `tu_contraseña_aqui`. `backend/.env` fue eliminado. |
| **Panel de administración** | ✅ **Funciona** | `frontend/js/admin.js` (602 líneas, 28 llamadas a la API): petroglifos, estaciones, reservas, moderación, preguntas, noticias y trivia. |
| `index.html`, `mapa.html`, `petroglifo-detalle.html` | ✅ **Conectadas** | Ya consumen la API real (contador de visitas, estaciones, detalle). |

---

## 3. 🔴 B6 — Bug NUEVO encontrado por las pruebas

`src/controllers/comentarios.controller.js`, función `moderar()`:

```js
UPDATE comentarios SET estado_moderacion = $1 WHERE id = $2 RETURNING *
```

**La tabla no se llama `comentarios`. Se llama `comentarios_resenas`.**

Consecuencia: `PATCH /api/comentarios/:id/moderar` devolvía **500** siempre. El administrador **no podía aprobar ni rechazar ninguna reseña**. La moderación estaba 100 % rota, y nadie lo había notado porque nunca se había probado ese endpoint.

**Corregido.** Y ahora hay una prueba que garantiza que no vuelva a pasar.

---

## 4. Lo que hice en esta sesión

### Bloque 3 — Adaptación a Vercel + Supabase Storage
| Archivo | Cambio |
|---|---|
| `api/index.js` *(nuevo)* | Punto de entrada serverless para Vercel |
| `vercel.json` *(nuevo)* | `/api/*` → función; el resto → `frontend/` |
| `package.json` (raíz) *(nuevo)* | Dependencias para el build de Vercel |
| `.gitignore` (raíz) *(nuevo)* | Protege `.env`, `node_modules`, `uploads` |
| `backend/src/config/storage.js` *(nuevo)* | Sube las fotos a **Supabase Storage**. Si no hay credenciales, cae a disco local (para desarrollar sin configurar nada). |
| `backend/src/middlewares/upload.js` | `diskStorage` → **`memoryStorage`** (en Vercel el disco es de solo lectura) |
| `backend/src/controllers/fotos.controller.js` | Sube el buffer al almacenamiento; si la BD falla, borra la imagen para no dejarla huérfana |
| `backend/src/app.js` | `/uploads` solo se sirve en local; CORS endurecido; el rate-limit no estorba en las pruebas |
| `backend/scripts/init-db.js` *(nuevo)* | `npm run db:init` real (antes era un `node -e` frágil de una sola línea) |

### Cambio de calidad — SQL portable
`row_to_json(tabla.*)` no es probable ni portable. Lo reemplacé en `estaciones`, `petroglifos` y `recorridos` por columnas explícitas + un helper `src/utils/anidar.js` que arma el objeto anidado en JavaScript.

**El contrato de la API no cambia:** el frontend sigue recibiendo `{ ...estacion, petroglifo: { ... } }`. Lo verifiqué contra `recorrido.html`, que usa `est.petroglifo.descripcion`.

### Bloque 4 — Suite de pruebas: **38 pruebas, 7 suites, todas en verde**

```
PASS tests/salud.test.js
PASS tests/auth.test.js
PASS tests/petroglifos.test.js
PASS tests/trivia.test.js
PASS tests/reservas.test.js
PASS tests/comentarios.test.js
PASS tests/contenido.test.js

Test Suites: 7 passed, 7 total
Tests:       38 passed, 38 total
Time:        7.8 s
```

Corren con **pg-mem** (PostgreSQL en memoria): **no hace falta tener PostgreSQL instalado**. Cargan el `schema.sql` y el `seed.sql` reales.

**Pruebas de regresión** (las que impiden que los bugs vuelvan):
- B1 → el set público de trivia no contiene `respuesta_correcta`, ni siquiera en el JSON en crudo; y un cliente que envía `puntaje: 999` recibe el puntaje real (0).
- B2 → un usuario `institucion` crea una reserva y recibe **201**.
- B6 → el admin aprueba una reseña y esta aparece en el listado público.

---

## 5. Tablero F.R.A.M.E.

| Fase | Estado |
|---|---|
| **F** · Foundation (F1.1–F4) | ✅ Completa |
| **R** · Render (R1–R17) | ✅ Completa |
| **A** · Animation (A1–A3) | ✅ Completa |
| **M** · Montaje (M0–M6) | ✅ Completa |
| **M7 / M8** · PWA y offline | ⛔ **Descartados por decisión de alcance** |
| **M9** · Cámara / QR / voz / GPS | ✅ Implementado (requiere prueba en teléfono real) |
| **E** · Entrega (E1–E8) | ⏳ **Es lo único que falta** |

---

## 6. Lo que queda (solo despliegue)

- [ ] **E1** · Subir a GitHub (borra `backend/.env` antes; revisa `git status`)
- [ ] **E3** · Supabase: crear el proyecto, pegar `schema.sql` y `seed.sql` en el **SQL Editor**, crear el bucket público `fotos`
- [ ] **E4/E5** · Vercel: importar el repo y configurar las 5 variables de entorno
- [ ] **E6** · Verificar HTTPS y CORS
- [ ] **E7** · Smoke test en producción (checklist en `PLAN-PRUEBAS.md`, nivel 3)
- [ ] **E8** · Manual de administrador para el museo
- [ ] **S2** · Verificar el acceso desde Venezuela y **dejarlo documentado por escrito**

Instrucciones exactas: **`PLAN-DESPLIEGUE-SUPABASE-VERCEL.md`**.

---

## 7. Deuda técnica (declararla al cliente, no esconderla)

| # | Asunto | Por qué se acepta |
|---|---|---|
| 1 | Sin PWA ni modo offline (M7/M8) | Decisión de alcance. Documentar como **mejora futura**. |
| 2 | `helmet` con `contentSecurityPolicy: false` | El frontend usa scripts inline. Aceptable para entregar; mejorable después. |
| 3 | Contenido de ejemplo (decisión S1) | El museo debe cargar sus textos y fotos reales **desde el panel de administración**, que ahora sí funciona. |
| 4 | La contraseña del admin del seed es `Admin1234` | **Hay que cambiarla en el primer inicio de sesión en producción.** |
| 5 | Reconocimiento visual sin QR / versión en inglés | Mejoras futuras (S3, S4). |

---

## 8. Cómo correr y probar en local

```bash
# Pruebas automatizadas (NO requiere PostgreSQL)
cd backend
npm install
npm test           # → 38 pruebas en verde

# Levantar el sitio completo (SÍ requiere PostgreSQL)
psql -U postgres -c "CREATE DATABASE museo_piedra_pintada;"
psql -U postgres -d museo_piedra_pintada -f ../db/schema.sql
psql -U postgres -d museo_piedra_pintada -f ../db/seed.sql
copy .env.example .env      # y edita la contraseña
npm run dev                 # → http://localhost:3000
```

**Cuentas del seed** (contraseña de las tres: `Admin1234`):
- `admin@piedrapintada.ve` → admin
- `maria@example.com` → registrado
- `liceo@institucion.ve` → institución
