# Roadmap del trabajo pendiente — Museo Piedra Pintada

Documento de traspaso. Describe **qué falta por hacer, en qué orden, y cómo verificar cada paso**. Cada sección referencia el paso correspondiente del plan F.R.A.M.E.

> Si llegas a este proyecto por primera vez: lee el `README.md` raíz para entender la estructura y dejar el entorno corriendo, luego `docs/PROGRESO.md` para ver el estado, y vuelve a este archivo para tomar el siguiente trabajo.

---

## Resumen del estado

- **Lo que está hecho:** toda la fase F (arquitectura), todas las pantallas de la fase R con sus animaciones (fase A integrada), y la base del backend M0–M3 (estructura, base de datos, servidor Express, autenticación con JWT + RBAC). Probado de extremo a extremo.
- **Lo que falta:** los endpoints CRUD de cada recurso (M4.1–M4.9), conectar el frontend a la API (M6), la capa PWA y offline (M7–M9), y todo el despliegue (fase E).
- **Avance global aproximado:** 37 de 54 pasos.

---

## La verdad importante sobre el frontend

El frontend está **visualmente completo y se ve funcional**, pero todavía **no consume el backend**:

- Cada pantalla tiene los datos en arrays JavaScript hardcodeados dentro del propio `<script>`. No hay ni una llamada `fetch()` en todo el frontend.
- El login muestra un toast y redirige, pero no llama a `/api/auth/login`.
- Los formularios (reseñas, reservas, preguntas) validan y muestran toast, pero no envían nada al servidor.
- El panel admin tiene botones decorativos sin lógica de persistencia.

Esto **no es un bug** — es exactamente como el plan F.R.A.M.E. lo planifica: la fase R construye prototipos navegables con datos simulados, y la fase M (Montaje) los conecta a datos reales. Es lo que sigue.

---

## M4 — Endpoints REST por recurso

**Patrón común para los 9 endpoints:** usar el `controller`/`route` de auth como plantilla. Cada recurso necesita:

1. Un archivo `src/controllers/<recurso>.controller.js` con funciones para cada operación.
2. Un archivo `src/routes/<recurso>.routes.js` con las rutas y validación.
3. Registrar el router en `src/routes/index.js`.
4. **Pruebas de integración** (Jest + Supertest + pg-mem). Hay un smoke test previo en la sesión que sirve de referencia.

**Reglas firmes para todos los endpoints:**
- Usar `db.query(texto, params)` con consultas parametrizadas — **nunca concatenar SQL**.
- Devolver respuestas con `exito()`, `creado()`, `error()` de `utils/respuestas.js`.
- Aplicar `requiereSesion` y `requiereRol(...)` donde corresponda.
- Validar entradas con `express-validator` y el middleware `validar`.
- Para acciones del admin: `requiereRol('admin')`.

### M4.1 — Petroglifos + estaciones

**Prioridad alta. Es el corazón del museo y desbloquea 4 pantallas.**

Endpoints:

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/petroglifos` | público | Listar (con filtros opcionales `?categoria=...&q=texto`) |
| GET | `/api/petroglifos/:id` | público | Detalle (incluyendo estación asociada y fotos) |
| POST | `/api/petroglifos` | admin | Crear |
| PUT | `/api/petroglifos/:id` | admin | Editar |
| DELETE | `/api/petroglifos/:id` | admin | Eliminar |
| GET | `/api/estaciones` | público | Listar todas (con lat/lng y petroglifo asociado) |
| GET | `/api/estaciones/qr/:codigo` | público | **Clave para el recorrido.** Busca por `codigo_qr` y devuelve estación + petroglifo + `texto_asistente` |
| POST | `/api/estaciones` | admin | Crear |
| PUT | `/api/estaciones/:id` | admin | Editar |
| DELETE | `/api/estaciones/:id` | admin | Eliminar |

**Pruebas mínimas:**
- Listar funciona y devuelve los 12 petroglifos del seed.
- Buscar por QR-005 devuelve "El Jaguar Celeste" con su `texto_asistente`.
- Buscar por QR-XXX inexistente da 404.
- Un visitante sin token no puede crear (401).
- Un usuario con rol `registrado` no puede crear (403).
- Un admin con token sí puede crear (201).

### M4.2 — Recorridos

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/recorridos` | público |
| GET | `/api/recorridos/:id` | público — devuelve el recorrido **con sus estaciones en orden** |
| POST/PUT/DELETE | `/api/recorridos[/:id]` | admin |

Devolver `/api/recorridos/:id` con un JOIN a `recorrido_estaciones` + `estaciones` + `petroglifos`, ordenado por `recorrido_estaciones.orden`.

### M4.3 — Reservas institucionales

| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/api/reservas` | rol `institucion` |
| GET | `/api/reservas` | admin (con filtros `?estado=pendiente`) |
| GET | `/api/reservas/mias` | rol `institucion` (sus propias reservas) |
| PATCH | `/api/reservas/:id/estado` | admin — body `{estado: 'aprobada' | 'rechazada'}` |

**Validación crítica:** `fecha_visita >= hoy` y `0 < num_personas <= 200`. La BD ya lo refuerza, pero validar también en el backend para dar errores claros.

### M4.4 — Comentarios / reseñas

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/comentarios` | público — solo los aprobados |
| GET | `/api/comentarios/pendientes` | admin |
| POST | `/api/comentarios` | registrado/institucion |
| PATCH | `/api/comentarios/:id/moderar` | admin — body `{estado: 'aprobado' | 'rechazado'}` |

### M4.5 — Fotos (subida de archivos)

Usar `multer`. Validación: `image/jpeg`, `image/png`, `image/webp` máximo 5 MB.

| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/api/fotos` | registrado — multipart con campo `archivo`, query `?comentario_id=X` o `?petroglifo_id=Y` |
| GET | `/api/fotos/:id` | público — sirve el archivo |
| DELETE | `/api/fotos/:id` | admin |

**Almacenamiento:** en niveles gratuitos de hosting el filesystem suele ser efímero (Render reinicia y borra). Decidir entre: (a) usar un bucket externo (Cloudinary tiene plan gratis generoso), o (b) guardar las fotos como `bytea` en PostgreSQL (más simple, menos eficiente). Documentar la decisión.

### M4.6 — Preguntas y respuestas (FAQ)

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/preguntas` | público — solo publicadas |
| POST | `/api/preguntas` | público (anónimo) o registrado |
| PATCH | `/api/preguntas/:id/responder` | admin — body `{respuesta: '...', publicada: true}` |
| DELETE | `/api/preguntas/:id` | admin |

### M4.7 — Noticias y eventos

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/noticias` | público — solo activas, ordenadas por fecha desc |
| GET | `/api/noticias/:id` | público |
| POST/PUT/DELETE | `/api/noticias[/:id]` | admin |

### M4.8 — Trivia

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/trivia/preguntas` | público — devuelve preguntas **sin** la respuesta correcta |
| POST | `/api/trivia/respuestas` | público (mejor con sesión) — recibe `[{pregunta_id, respuesta}]`, calcula puntaje y lo guarda en `resultados_trivia` |
| POST/PUT/DELETE | `/api/trivia/preguntas[/:id]` | admin |

**Importante de seguridad:** `GET /api/trivia/preguntas` debe omitir el campo `respuesta_correcta` en la respuesta — solo se conoce en el servidor.

### M4.9 — Contador de visitas

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/visitas` | público — devuelve el contador |
| POST | `/api/visitas` | público — incrementa (con rate-limit estricto, p.ej. 1 por IP cada 24h, o aceptar inflación benigna) |

---

## M5 — Suite consolidada de pruebas del backend

- Estructurar pruebas con Jest + Supertest + pg-mem en `backend/__tests__/`.
- Una suite por recurso, más una suite de auth.
- `npm test` debe correr todo en verde antes de cerrar M5.
- Cobertura mínima esperada: 80% en `controllers/`.

**Criterio de aceptación:** flujos críticos cubiertos — auth, reservas (crear → moderar → estado), trivia (jugar → calcular puntaje), moderación de comentarios.

---

## M6 — Conectar el frontend a la API

Este es el bloque que convierte el sitio en un sistema real. Trabajo página por página.

### M6.0 — Cliente HTTP centralizado

Crear `frontend/js/api.js`:

```javascript
const BASE = 'http://localhost:3000/api';  // configurable

const api = {
  async req(metodo, ruta, cuerpo, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(BASE + ruta, {
      method: metodo,
      headers,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data.datos;
  },
  get(ruta)             { return this.req('GET', ruta); },
  post(ruta, cuerpo)    { return this.req('POST', ruta, cuerpo); },
  put(ruta, cuerpo)     { return this.req('PUT', ruta, cuerpo); },
  patch(ruta, cuerpo)   { return this.req('PATCH', ruta, cuerpo); },
  delete(ruta)          { return this.req('DELETE', ruta); },
};
window.Museo.api = api;
```

Incluirlo desde `componentes.js` o un nuevo `<script>` global.

### M6.1 — Login real

En `pages/login.html` reemplazar el `simularCarga` por:

```javascript
const { usuario, token } = await window.Museo.api.post('/auth/login', {
  correo: emailInput.value,
  contrasena: passInput.value,
});
localStorage.setItem('token', token);
localStorage.setItem('usuario', JSON.stringify(usuario));
window.location.href = '../index.html';
```

Manejar errores 401 mostrando el toast de error en vez de redirigir.

Hacer lo mismo para el formulario de registro.

### M6.2 — Header reactivo a la sesión

En `js/componentes.js`, leer `localStorage.usuario` y mostrar "Hola, X · Salir" en vez de "Ingresar" cuando hay sesión. Implementar el botón "Salir" que vacía localStorage y recarga.

### M6.3 — Pantallas de lectura (sin sesión)

Reemplazar los arrays hardcoded en orden:

1. `petroglifos.html` → `await api.get('/petroglifos')`
2. `petroglifo-detalle.html` → `await api.get('/petroglifos/' + id)`
3. `recorrido.html` y `mapa.html` → `await api.get('/estaciones')` (y `api.get('/recorridos/1')` para el orden)
4. `noticias.html` → `await api.get('/noticias')`
5. `preguntas.html` → `await api.get('/preguntas')`
6. `index.html` → `await api.get('/visitas')` para el contador

En cada una, agregar estados de carga ("Cargando…") y error ("No se pudieron cargar los datos").

### M6.4 — Escaneo QR conectado

En `recorrido.html`, cuando el `BarcodeDetector` lea un código:
```javascript
try {
  const datos = await api.get('/estaciones/qr/' + codigoLeido);
  // datos = { estacion, petroglifo: { nombre, texto_asistente, ... } }
  mostrarPanelAsistente(datos);
  hablar(datos.petroglifo.texto_asistente);
} catch (e) {
  toast('Código QR no reconocido', 'error');
}
```

### M6.5 — Formularios de escritura (con sesión)

Conectar:
- `reservas.html` → `api.post('/reservas', {...})` (requiere rol institución)
- `resenas.html` → `api.post('/comentarios', {...})` + subida de foto
- `preguntas.html` → `api.post('/preguntas', {pregunta: '...'})`
- `trivia.html` → al terminar, `api.post('/trivia/respuestas', [...])` y mostrar puntaje del servidor

### M6.6 — Admin funcional

En cada pestaña de `admin/dashboard.html`:
- Cargar la lista real del recurso.
- Botones "Aprobar/Rechazar" llaman al endpoint correspondiente.
- Botones "Editar/Eliminar" abren modal con `api.put` / `api.delete`.
- Verificar al entrar que `usuario.rol === 'admin'`, si no, redirigir.

### M6.7 — Prueba end-to-end (Playwright)

Escribir un test que cubra el flujo completo:
1. Registrar usuario nuevo
2. Login → obtener token
3. Leer petroglifos
4. Dejar reseña
5. Como admin: aprobar la reseña
6. Jugar trivia y ver puntaje

---

## M7 — Capa PWA

1. Crear `frontend/manifest.json`:
```json
{
  "name": "Museo Piedra Pintada",
  "short_name": "MPP",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#d4a574",
  "icons": [
    {"src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png"}
  ]
}
```

2. Crear iconos PNG (192x192 y 512x512) y ponerlos en `frontend/assets/icons/`.

3. Registrar un Service Worker básico (`frontend/sw.js`) con política:
   - `cache-first` para `/css/*`, `/js/*`, `/assets/*`
   - `network-first` con fallback a cache para `/api/*`

4. Verificación: Lighthouse en Chrome DevTools debe marcar la app como instalable.

---

## M8 — Offline real + mapa descargable

1. Cachear el app shell + datos clave (petroglifos, estaciones, recorrido completo) al instalar el SW.
2. Implementar botón "Descargar mapa" en `mapa.html` que:
   - Descarga una imagen georreferenciada del parque.
   - Guarda en IndexedDB: la imagen como blob + un array con `{estacion_id, lat, lng, nombre, petroglifo_qr}`.
3. En modo offline, Leaflet usa esa imagen como tile layer estático.
4. Criterio: con el modo avión activado, la app abre, muestra contenido cacheado, dibuja el mapa descargado y la posición GPS sigue actualizándose.

---

## M9 — Conectar dispositivos al contenido real

El frontend **ya tiene** activadas cámara, QR, voz y GPS — falta enlazar el resultado del QR al endpoint real (eso se hace en M6.4). Una vez hecho M6.4 y M8, este paso es básicamente verificación en un teléfono real:

- El QR de la estación 5 narra "El Jaguar Celeste" desde el `texto_asistente` que viene de la BD.
- Cuando el GPS se mueve, el marcador se mueve en el mapa.
- Si se niega permiso de cámara, aparece un mensaje claro y opción manual.

---

## Fase E — Despliegue (8 pasos)

### E1 — Repositorio GitHub
- Crear repo público o privado.
- Asegurar que `.env` está en `.gitignore` (ya lo está).
- README con instrucciones de despliegue.

### E2 — Variables de entorno de producción
- Decidir si se generará un `JWT_SECRET` real (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
- Cargar variables en el panel del proveedor, nunca en el repo.

### E3 — Base de datos en la nube
- **Neon (recomendado)** o **Supabase**. Plan gratuito suficiente.
- Cargar `schema.sql` y `seed.sql` con `psql` apuntando a la URL remota.
- **Antes de fijar proveedor**, verificar acceso desde Venezuela (decisión S2).

### E4 — Backend en la nube
- **Render** o **Railway**. Conectar al repositorio, configurar build (`npm install`) y start (`npm start`).
- Configurar `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` apuntando al frontend de producción.

### E5 — Frontend en la nube
- **Netlify** o **Vercel**. Subir la carpeta `frontend/` como sitio estático.
- Configurar la URL base de la API en `js/api.js` (variable de build o configuración en runtime).

### E6 — HTTPS, CORS, dominios
- Verificar que todo va por HTTPS (los proveedores lo dan automático).
- Ajustar `CORS_ORIGINS` del backend para que solo permita el dominio del frontend.

### E7 — Pruebas de humo en producción
- Repetir los flujos críticos (registro/login, recorrido con QR, trivia, reserva, reseña, admin) en la URL pública.
- Instalar la PWA en un teléfono real y probar modo offline.

### E8 — Documentación final
- `MANUAL.md` para administradores: cómo cargar petroglifos/QR, aprobar reservas, moderar comentarios, publicar noticias, cargar preguntas de trivia.
- Notas de mantenimiento.

---

## Cronograma sugerido

Si lo organizas por bloques de medio día:

| Bloque | Trabajo |
|--------|---------|
| 1 | M4.1 (petroglifos + estaciones) con pruebas |
| 2 | M4.2 + M4.7 + M4.9 (recorridos, noticias, visitas) |
| 3 | M4.3 + M4.4 + M4.6 (reservas, comentarios, preguntas) |
| 4 | M4.5 + M4.8 (fotos, trivia) |
| 5 | M5 (suite consolidada de pruebas) |
| 6 | M6.0–M6.3 (cliente HTTP + login + pantallas lectura) |
| 7 | M6.4–M6.6 (QR conectado, formularios, admin) |
| 8 | M6.7 (E2E Playwright) + M7 (PWA) |
| 9 | M8 (offline + mapa) + M9 (verificación en teléfono) |
| 10 | E1–E6 (despliegue) |
| 11 | E7 + E8 (smoke test producción + manual) |

---

## Glosario para no perderse

- **F.R.A.M.E.** — Foundation, Render, Animation, Montaje, Entrega. Cinco fases del plan.
- **RBAC** — Role-Based Access Control. En este proyecto: cuatro roles (visitante, registrado, institución, admin).
- **PWA** — Progressive Web App. Una página web que se puede instalar como app y funciona offline.
- **App shell** — HTML/CSS/JS base de la PWA que se cachea para que abra sin red.
- **JWT** — JSON Web Token. Token firmado que el cliente envía en `Authorization: Bearer <token>` para autenticarse.
- **pg-mem** — Base de datos PostgreSQL emulada en memoria para pruebas. No 100% compatible, pero suficiente para pruebas de integración.

---

## A quién consultar / dónde mirar

- Documento de arquitectura completo: `docs/arquitectura.md` (si está en el repo; si no, reconstruir desde `PROGRESO.md`)
- Estado vivo: `docs/PROGRESO.md`
- Backend: `backend/README.md`
- Decisiones S1–S4: `README.md` raíz
