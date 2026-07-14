# Arquitectura — Museo Arqueológico Piedra Pintada

**Versión:** 1.0 | **Fecha:** 2026-06-28 | **Cubre:** F1.1 – F1.7, F2, F3, F4

---

## F1.1 — Arquitectura de Información

### Mapa del Sitio

```
Inicio (/)
├── Información del museo (/info)
├── Catálogo de petroglifos (/petroglifos)
│   └── Detalle de petroglifo (/petroglifos/:id)
├── Recorrido interactivo (/recorrido)
├── Mapa del parque (/mapa)
├── Noticias y eventos (/noticias)
│   └── Detalle de noticia (/noticias/:id)
├── Preguntas y respuestas (/preguntas)
├── Reseñas y comentarios (/resenas)
├── Trivia (/trivia)
├── Reserva institucional (/reservas)
├── Login / Registro (/login, /registro)
└── Panel de administración (/admin)
    ├── Gestionar petroglifos/estaciones
    ├── Gestionar recorridos
    ├── Aprobar/rechazar reservas
    ├── Moderar comentarios
    ├── Responder preguntas
    ├── Publicar noticias
    └── Cargar preguntas de trivia
```

### Menú Principal
Inicio | Petroglifos | Recorrido | Mapa | Trivia | Noticias | Más (Reseñas, Preguntas, Reservas, Info)

### Menú Secundario (usuario)
Login/Registro | Mi perfil | Cerrar sesión

### Flujos de Usuario Clave

**a) Recorrido con QR:**
Inicio → Recorrido → Activar cámara → Escanear QR de estación → Ver contenido + asistente habla → Siguiente estación → Fin del recorrido

**b) Trivia:**
Inicio → Trivia → Pregunta 1 (4 opciones) → Feedback verde/rojo → ... → Pregunta N → Pantalla resultado con puntaje

**c) Reserva institucional:**
Inicio → Reservas → Formulario (institución, contacto, fecha, personas) → Enviar → Ver estado (pendiente/aprobada/rechazada)

**d) Reseña con foto:**
Petroglifos o Reseñas → "Dejar reseña" → Login si no autenticado → Formulario (texto, calificación, foto) → Enviar → Esperar moderación

**e) Registro/Login:**
Cualquier pantalla → Login → Formulario email+contraseña → JWT → Redirigir a pantalla anterior

---

## F1.2 — Arquitectura de Datos

### 12 Entidades y Relaciones

```
usuarios (1) ──→ (N) comentarios_resenas
usuarios (1) ──→ (N) resultados_trivia
usuarios (1) ──→ (N) reservas
usuarios (1) ──→ (N) preguntas_respuestas
usuarios (1) ──→ (N) fotos

petroglifos (1) ──→ (N) fotos
petroglifos (1) ──→ (1) estaciones

estaciones (N) ←──→ (N) recorridos  [tabla intermedia: recorrido_estaciones]

noticias_eventos          (independiente, admin crea)
preguntas_trivia (1) ──→ (N) resultados_trivia
visitas_sitio             (contador global)
```

### Cardinalidades
- Un usuario puede tener N comentarios, N resultados de trivia, N reservas, N fotos
- Un petroglifo pertenece a 1 estación; una estación tiene 1 petroglifo principal
- Un recorrido tiene N estaciones (ordenadas); una estación puede estar en N recorridos
- Una foto pertenece a 1 comentario O a 1 petroglifo
- Una pregunta de trivia tiene 4 opciones, 1 correcta

---

## F1.3 — Arquitectura de Software

### Frontend (HTML/CSS/JS → PWA con Vite)

Módulos:
- **Navegación:** Menú responsive, routing por hash (#/ruta)
- **Mapa:** Leaflet online + imagen offline en IndexedDB
- **Recorrido:** Cámara + escáner QR + panel asistente + voz
- **Trivia:** Motor de preguntas con puntaje
- **Formularios:** Login, registro, reseña, reserva, pregunta
- **Admin:** CRUD de todas las entidades
- **PWA:** Service Worker, cache, manifest

### Backend (Node.js + Express)

Módulos:
- **Auth:** Registro, login, JWT, RBAC middleware
- **API REST:** Endpoints por recurso (ver contrato abajo)
- **Uploads:** multer para fotos
- **Seguridad:** helmet, cors, rate-limit, validación

### Contrato General de la API

| Método | Ruta | Rol mínimo | Descripción |
|--------|------|-----------|-------------|
| POST | /api/auth/registro | público | Crear cuenta |
| POST | /api/auth/login | público | Obtener JWT |
| GET | /api/petroglifos | público | Listar petroglifos |
| GET | /api/petroglifos/:id | público | Detalle petroglifo |
| POST | /api/petroglifos | admin | Crear petroglifo |
| PUT | /api/petroglifos/:id | admin | Editar petroglifo |
| DELETE | /api/petroglifos/:id | admin | Eliminar petroglifo |
| GET | /api/estaciones | público | Listar estaciones |
| GET | /api/estaciones/qr/:codigo | público | Buscar por código QR |
| POST | /api/estaciones | admin | Crear estación |
| PUT | /api/estaciones/:id | admin | Editar estación |
| DELETE | /api/estaciones/:id | admin | Eliminar estación |
| GET | /api/recorridos | público | Listar recorridos |
| GET | /api/recorridos/:id | público | Recorrido con estaciones ordenadas |
| POST | /api/recorridos | admin | Crear recorrido |
| PUT | /api/recorridos/:id | admin | Editar recorrido |
| DELETE | /api/recorridos/:id | admin | Eliminar recorrido |
| GET | /api/reservas | admin | Listar reservas |
| POST | /api/reservas | institución | Crear solicitud de reserva |
| PATCH | /api/reservas/:id/estado | admin | Aprobar/rechazar reserva |
| GET | /api/comentarios | público | Listar aprobados |
| POST | /api/comentarios | registrado | Crear comentario/reseña |
| PATCH | /api/comentarios/:id/moderar | admin | Aprobar/rechazar |
| POST | /api/fotos | registrado | Subir foto |
| GET | /api/fotos/:id | público | Servir foto |
| GET | /api/preguntas | público | Listar publicadas |
| POST | /api/preguntas | público | Enviar pregunta |
| PATCH | /api/preguntas/:id/responder | admin | Responder y publicar |
| GET | /api/noticias | público | Listar noticias |
| GET | /api/noticias/:id | público | Detalle noticia |
| POST | /api/noticias | admin | Crear noticia |
| PUT | /api/noticias/:id | admin | Editar noticia |
| DELETE | /api/noticias/:id | admin | Eliminar noticia |
| GET | /api/trivia/preguntas | público | Obtener set de preguntas |
| POST | /api/trivia/respuestas | público | Enviar respuestas y obtener puntaje |
| POST | /api/trivia/preguntas | admin | Crear pregunta |
| PUT | /api/trivia/preguntas/:id | admin | Editar pregunta |
| DELETE | /api/trivia/preguntas/:id | admin | Eliminar pregunta |
| GET | /api/visitas | público | Obtener contador |
| POST | /api/visitas | público | Registrar visita |
| GET | /api/health | público | Healthcheck |

Comunicación: peticiones HTTP con `fetch()`. JWT en header `Authorization: Bearer <token>`. Formato JSON.

---

## F1.4 — Arquitectura PWA / Mobile-First

### Estrategia Mobile-First
- Diseño base: 360px (móvil)
- Breakpoints: 480px (móvil grande), 768px (tablet), 1024px (escritorio)
- Navegación: menú hamburguesa en móvil, barra horizontal en escritorio

### Política de Cache (Service Worker)

| Recurso | Estrategia | Almacenamiento |
|---------|-----------|---------------|
| App shell (HTML, CSS, JS, iconos) | Cache-first | Cache API |
| Textos de petroglifos/estaciones | Cache-first, actualiza en fondo | Cache API |
| Mapa descargable (imagen + coords) | Solo manual ("descargar mapa") | IndexedDB |
| Imágenes de petroglifos | Cache-first | Cache API |
| Datos frescos (noticias, reservas, comentarios) | Network-first, fallback cache | Cache API |
| Auth / escritura (POST, PUT, DELETE) | Network-only | — |

### Botón "Descargar mapa"
1. Descarga imagen georreferenciada del parque desde la API
2. Descarga coordenadas de estaciones (JSON)
3. Guarda ambos en IndexedDB
4. En modo offline, Leaflet usa la imagen local como tile layer

### Qué funciona sin señal
- ✅ App shell completa
- ✅ Catálogo de petroglifos (texto + imágenes cacheadas)
- ✅ Mapa del parque (si se descargó)
- ✅ GPS (posición del usuario)
- ✅ Escaneo QR + contenido cacheado
- ✅ Voz del asistente (Web Speech API local)
- ❌ Login/registro, enviar reseñas, reservas (requieren red)
- ❌ Noticias nuevas, trivia con registro de puntaje

---

## F1.5 — Arquitectura de Integración

| Servicio | API del navegador | Propósito | Plan B si no disponible |
|----------|------------------|-----------|------------------------|
| Cámara | `getUserMedia` | Escanear QR en recorrido | Mostrar campo para ingresar código manualmente |
| Escáner QR | `BarcodeDetector` | Leer QR de estación | Fallback: librería `html5-qrcode` |
| GPS | `navigator.geolocation` | Posición en el mapa | Mostrar mapa sin marcador de usuario |
| Voz | `speechSynthesis` | Asistente que narra contenido | Mostrar texto sin audio; botón deshabilitado |
| Mapa online | Leaflet + tiles OpenStreetMap | Mapa interactivo | Usar mapa offline descargado |
| Service Worker | `navigator.serviceWorker` | Cache y offline | La app funciona pero sin offline |

---

## F1.6 — Arquitectura de Infraestructura / Nube

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Frontend (PWA)  │────→│  Backend (API)    │────→│  PostgreSQL       │
│  Netlify/Vercel  │     │  Render/Railway   │     │  Neon/Supabase    │
│  Sitio estático  │     │  Node.js+Express  │     │  Nivel gratuito   │
└─────────────────┘     └──────────────────┘     └───────────────────┘
                              │
                              ↓
                        ┌──────────────┐
                        │  Fotos       │
                        │  /uploads    │
                        │  (en backend)│
                        └──────────────┘
```

**Entornos:**
- **Desarrollo:** localhost (frontend :5173, backend :3000, PostgreSQL local o pg-mem)
- **Producción:** URLs públicas HTTPS en proveedores gratuitos

**Verificación S2:** Antes de fijar proveedor, probar acceso desde Venezuela.

---

## F1.7 — Arquitectura de Seguridad

| Amenaza | Mitigación |
|---------|-----------|
| Contraseñas en texto plano | bcrypt con sal (10 rounds) |
| Sesiones robadas | JWT con expiración (24h), httpOnly si cookie |
| Acceso no autorizado | Middleware RBAC: verificar rol en cada ruta protegida |
| Inyección SQL | Consultas parametrizadas (nunca concatenar) |
| XSS | Escapar salidas, helmet con CSP |
| CSRF | CORS restringido al dominio del frontend |
| Fuerza bruta | express-rate-limit (100 req/15min por IP en auth) |
| Archivos maliciosos | Validar tipo MIME (solo image/*), tamaño máx 5MB |
| Panel admin expuesto | Requiere rol admin + JWT válido |
| Datos sensibles en repo | .env con secretos, .gitignore, variables en panel del proveedor |

---

## F2 — Catálogo de Roles, Pantallas y Funcionalidades

### Roles (4)
1. **Visitante** (no registrado)
2. **Registrado** (cuenta creada)
3. **Institución** (cuenta con rol institución)
4. **Administrador** (cuenta con rol admin)

### Pantallas (~16)
1. Inicio
2. Información del museo
3. Catálogo de petroglifos
4. Detalle de petroglifo
5. Recorrido interactivo
6. Mapa del parque
7. Noticias y eventos
8. Detalle de noticia
9. Preguntas y respuestas
10. Reseñas y comentarios
11. Trivia
12. Reserva institucional
13. Login
14. Registro
15. Panel de administración
16. Perfil de usuario

### Matriz Rol ↔ Funcionalidad

| Funcionalidad | Visitante | Registrado | Institución | Admin |
|--------------|-----------|-----------|-------------|-------|
| Ver inicio, info, horario | ✅ | ✅ | ✅ | ✅ |
| Ver catálogo petroglifos | ✅ | ✅ | ✅ | ✅ |
| Hacer recorrido con QR | ✅ | ✅ | ✅ | ✅ |
| Ver mapa | ✅ | ✅ | ✅ | ✅ |
| Descargar mapa offline | ✅ | ✅ | ✅ | ✅ |
| Jugar trivia | ✅ | ✅ | ✅ | ✅ |
| Leer noticias | ✅ | ✅ | ✅ | ✅ |
| Leer reseñas | ✅ | ✅ | ✅ | ✅ |
| Leer preguntas publicadas | ✅ | ✅ | ✅ | ✅ |
| Enviar pregunta | ✅ | ✅ | ✅ | ✅ |
| Registrarse | ✅ | — | — | — |
| Dejar reseña con foto | ❌ | ✅ | ✅ | ✅ |
| Guardar progreso trivia | ❌ | ✅ | ✅ | ✅ |
| Solicitar reserva institucional | ❌ | ❌ | ✅ | ✅ |
| Gestionar petroglifos/estaciones | ❌ | ❌ | ❌ | ✅ |
| Gestionar recorridos | ❌ | ❌ | ❌ | ✅ |
| Aprobar/rechazar reservas | ❌ | ❌ | ❌ | ✅ |
| Moderar comentarios | ❌ | ❌ | ❌ | ✅ |
| Responder preguntas | ❌ | ❌ | ❌ | ✅ |
| Publicar noticias | ❌ | ❌ | ❌ | ✅ |
| Cargar preguntas trivia | ❌ | ❌ | ❌ | ✅ |

---

## F3 — Modelo de Datos Detallado

### 1. usuarios
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| nombre | VARCHAR(100) | NOT NULL |
| correo | VARCHAR(150) | UNIQUE, NOT NULL |
| contrasena_hash | VARCHAR(255) | NOT NULL |
| rol | VARCHAR(20) | NOT NULL, CHECK (visitante, registrado, institucion, admin) |
| institucion_nombre | VARCHAR(200) | NULL (solo rol institución) |
| creado_en | TIMESTAMP | DEFAULT NOW() |

### 2. petroglifos
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| nombre | VARCHAR(200) | NOT NULL |
| descripcion | TEXT | NOT NULL |
| texto_asistente | TEXT | NOT NULL (lo que narra la voz) |
| imagen_url | VARCHAR(500) | NULL |
| codigo_qr | VARCHAR(50) | UNIQUE, NOT NULL |
| categoria | VARCHAR(100) | NULL |
| creado_en | TIMESTAMP | DEFAULT NOW() |

### 3. estaciones
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| nombre | VARCHAR(200) | NOT NULL |
| descripcion | TEXT | NULL |
| latitud | DECIMAL(10,7) | NOT NULL |
| longitud | DECIMAL(10,7) | NOT NULL |
| petroglifo_id | INTEGER | FK → petroglifos(id), UNIQUE |
| creado_en | TIMESTAMP | DEFAULT NOW() |

### 4. recorridos
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| nombre | VARCHAR(200) | NOT NULL |
| descripcion | TEXT | NULL |
| activo | BOOLEAN | DEFAULT TRUE |
| creado_en | TIMESTAMP | DEFAULT NOW() |

### 5. recorrido_estaciones (tabla intermedia)
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| recorrido_id | INTEGER | FK → recorridos(id) ON DELETE CASCADE |
| estacion_id | INTEGER | FK → estaciones(id) ON DELETE CASCADE |
| orden | INTEGER | NOT NULL |
| UNIQUE | | (recorrido_id, estacion_id) |
| UNIQUE | | (recorrido_id, orden) |

### 6. reservas
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| usuario_id | INTEGER | FK → usuarios(id) |
| institucion_nombre | VARCHAR(200) | NOT NULL |
| contacto_nombre | VARCHAR(100) | NOT NULL |
| contacto_telefono | VARCHAR(20) | NOT NULL |
| contacto_correo | VARCHAR(150) | NOT NULL |
| fecha_visita | DATE | NOT NULL, CHECK (>= CURRENT_DATE) |
| num_personas | INTEGER | NOT NULL, CHECK (> 0 AND <= 200) |
| estado | VARCHAR(20) | DEFAULT 'pendiente', CHECK (pendiente, aprobada, rechazada) |
| notas | TEXT | NULL |
| creado_en | TIMESTAMP | DEFAULT NOW() |

### 7. comentarios_resenas
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| usuario_id | INTEGER | FK → usuarios(id) |
| texto | TEXT | NOT NULL |
| calificacion | INTEGER | CHECK (1-5) |
| estado_moderacion | VARCHAR(20) | DEFAULT 'pendiente', CHECK (pendiente, aprobado, rechazado) |
| creado_en | TIMESTAMP | DEFAULT NOW() |

### 8. fotos
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| url | VARCHAR(500) | NOT NULL |
| tipo_mime | VARCHAR(50) | NOT NULL |
| tamano_bytes | INTEGER | NOT NULL, CHECK (<= 5242880) |
| comentario_id | INTEGER | FK → comentarios_resenas(id), NULL |
| petroglifo_id | INTEGER | FK → petroglifos(id), NULL |
| usuario_id | INTEGER | FK → usuarios(id) |
| creado_en | TIMESTAMP | DEFAULT NOW() |

### 9. preguntas_respuestas
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| pregunta | TEXT | NOT NULL |
| respuesta | TEXT | NULL |
| usuario_id | INTEGER | FK → usuarios(id), NULL |
| publicada | BOOLEAN | DEFAULT FALSE |
| creado_en | TIMESTAMP | DEFAULT NOW() |

### 10. noticias_eventos
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| titulo | VARCHAR(300) | NOT NULL |
| contenido | TEXT | NOT NULL |
| imagen_url | VARCHAR(500) | NULL |
| fecha_publicacion | TIMESTAMP | DEFAULT NOW() |
| activa | BOOLEAN | DEFAULT TRUE |

### 11. preguntas_trivia
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| pregunta | TEXT | NOT NULL |
| opcion_a | VARCHAR(300) | NOT NULL |
| opcion_b | VARCHAR(300) | NOT NULL |
| opcion_c | VARCHAR(300) | NOT NULL |
| opcion_d | VARCHAR(300) | NOT NULL |
| respuesta_correcta | CHAR(1) | NOT NULL, CHECK (A, B, C, D) |
| activa | BOOLEAN | DEFAULT TRUE |

### 12. resultados_trivia
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| usuario_id | INTEGER | FK → usuarios(id), NULL |
| puntaje | INTEGER | NOT NULL |
| total_preguntas | INTEGER | NOT NULL |
| respuestas_json | JSONB | NOT NULL (detalle de cada respuesta) |
| creado_en | TIMESTAMP | DEFAULT NOW() |

### 13. visitas_sitio
| Campo | Tipo | Restricciones |
|-------|------|--------------|
| id | SERIAL | PK |
| contador | INTEGER | DEFAULT 0 |
| ultima_visita | TIMESTAMP | DEFAULT NOW() |

---

## F4 — Revisión de Consistencia

### Matriz Pantalla ↔ Datos

| Pantalla | Lee | Escribe |
|----------|-----|---------|
| Inicio | visitas_sitio, noticias_eventos | visitas_sitio |
| Info museo | (contenido estático) | — |
| Catálogo petroglifos | petroglifos | — |
| Detalle petroglifo | petroglifos, estaciones, fotos | — |
| Recorrido | recorridos, recorrido_estaciones, estaciones, petroglifos | — |
| Mapa | estaciones | — |
| Noticias | noticias_eventos | — |
| Preguntas | preguntas_respuestas | preguntas_respuestas |
| Reseñas | comentarios_resenas, fotos | comentarios_resenas, fotos |
| Trivia | preguntas_trivia | resultados_trivia |
| Reservas | reservas | reservas |
| Login/Registro | usuarios | usuarios |
| Admin | todas las entidades | todas las entidades |

### Matriz Entidad ↔ Uso

| Entidad | Pantallas | Endpoints |
|---------|-----------|-----------|
| usuarios | Login, Registro, Admin | /auth/*, /admin |
| petroglifos | Catálogo, Detalle, Recorrido, Admin | /petroglifos/* |
| estaciones | Detalle, Recorrido, Mapa, Admin | /estaciones/* |
| recorridos | Recorrido, Admin | /recorridos/* |
| recorrido_estaciones | Recorrido | /recorridos/:id |
| reservas | Reservas, Admin | /reservas/* |
| comentarios_resenas | Reseñas, Admin | /comentarios/* |
| fotos | Reseñas, Detalle petroglifo | /fotos/* |
| preguntas_respuestas | Preguntas, Admin | /preguntas/* |
| noticias_eventos | Inicio, Noticias, Admin | /noticias/* |
| preguntas_trivia | Trivia, Admin | /trivia/* |
| resultados_trivia | Trivia | /trivia/respuestas |
| visitas_sitio | Inicio | /visitas |

**Resultado:** ✅ Cero entidades sin uso. ✅ Cero pantallas sin datos.
