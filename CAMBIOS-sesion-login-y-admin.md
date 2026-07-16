# Cambios — Sesión de correcciones (login, panel admin y 2 bugs)

**Fecha:** 15 de julio de 2026
**Base:** `museo-piedra-pintada-v1.0` (con los commits de Antigravity 49f3410 → f84c023)
**Pruebas:** 38/38 en verde tras los cambios.

---

## Cómo aplicar estos cambios

Reemplaza en tu proyecto **exactamente estos 19 archivos** por los de la carpeta `archivos-corregidos/` (misma ruta, mismo nombre). Luego:

```bash
git add -A
git commit -m "Login con sesión visible + logout, panel admin corregido, fix validación imagen_url"
git push
```

Vercel redesplegará solo. Como subí la versión de caché a `?v=1.2` en todas las páginas, los navegadores y la CDN **descargarán la versión nueva** sin quedarse con la vieja.

---

## 1. 🐛 BUG-A — La edición de petroglifos y noticias fallaba con 422

**Archivos:** `backend/src/routes/petroglifos.routes.js`, `backend/src/routes/noticias.routes.js`

**Problema:** el campo `imagen_url` se validaba con `.isURL()`. Eso rechaza:
- Las rutas relativas del contenido de ejemplo (ej. `assets/img/petroglifo-01.png`).
- Cualquier ruta interna tipo `/uploads/...`.

Consecuencia: al **editar** un petroglifo que ya tenía la imagen del seed (o al no cambiar la imagen), el backend respondía **422 "URL de imagen inválida"** y la edición se caía. Justo el flujo que Antigravity acababa de conectar.

**Solución:** se cambió `.isURL()` por una validación de longitud (`isLength({ max: 500 })`), que acepta tanto URLs absolutas de Supabase Storage (`https://...supabase.co/...`) como rutas relativas. La columna en la BD es `VARCHAR(500)`, así que el límite coincide.

---

## 2. Login: ahora se ve que iniciaste sesión y hay botón de cerrar sesión

Antes, al iniciar sesión, el header seguía mostrando "Ingresar" y no había forma de cerrar sesión. Ahora:

**Archivos:** `frontend/js/componentes.js`, `frontend/pages/login.html`, `frontend/js/app.js`, `frontend/js/api.js`, `frontend/css/estilos.css`

- **`login.html`** ahora guarda también los datos del usuario (`localStorage['museo_usuario']`), no solo el token.
- **`componentes.js`** dibuja el header según el estado de sesión:
  - **Sin sesión:** botones "Reservar visita" + "Ingresar" (como antes).
  - **Con sesión:** un chip **👤 con tu nombre**, un botón **"Cerrar sesión"**, y si eres admin, un acceso directo **🔒 Panel**.
  - La función `cerrarSesion()` borra el token y el usuario, muestra un aviso y te lleva al inicio.
- **`app.js`**: el menú hamburguesa ahora usa *delegación de eventos*, porque el header se re-dibuja dinámicamente (antes el botón perdía su función al re-renderizarse).
- **`api.js`**: se agregó `api.auth.registro(...)`.
- **`estilos.css`**: estilo del chip de sesión (`.sesion-chip`).

### Bonus: el registro ahora es real
Antes el formulario de registro era una simulación (`simularCarga`) que no creaba nada. Ahora llama de verdad a `POST /api/auth/registro`, guarda la sesión y te loguea automáticamente.

---

## 3. Panel de administración: layout corregido (ya no está todo pegado a la izquierda)

**Archivo:** `frontend/pages/admin/dashboard.html`

**Problema:** el contenedor usaba `display: grid` con una columna de 240px **y al mismo tiempo** la barra lateral era `position: fixed` (fuera del flujo del grid) **y** el contenido tenía `margin-left: 240px`. Esa triple combinación se peleaba entre sí y descuadraba todo hacia la izquierda.

**Solución:** se eliminó el `grid`. Ahora la barra lateral es fija y el contenido solo se desplaza con `margin-left: 240px`. Además:
- Se le puso `max-width: 1200px` al contenido para que no se estire de forma incómoda en pantallas grandes.
- Se agregó la clase `.tabla-scroll` para envolver tablas anchas con scroll horizontal en móvil.
- Se limpió una regla sobrante del grid en la vista móvil.

> La protección de ruta del panel ya existía y está bien: al entrar, `admin.js` llama a `/api/auth/perfil` y si no eres admin te devuelve al login. No se tocó.

---

## 4. Cache busting global (`?v=1.2`)

Se actualizó la versión de caché de **todos** los `.css` y `.js` en las 13 páginas del frontend. Esto es lo que hace que los cambios se vean sí o sí en producción, sin que el navegador o la CDN de Vercel sirvan la versión vieja.

---

## Archivos modificados (19)

**Backend (2):**
- `backend/src/routes/petroglifos.routes.js`
- `backend/src/routes/noticias.routes.js`

**Frontend — lógica (4):**
- `frontend/js/componentes.js`
- `frontend/js/app.js`
- `frontend/js/api.js`
- `frontend/css/estilos.css`

**Frontend — páginas (13):** `index.html`, `login.html`, `admin/dashboard.html`, `informacion.html`, `mapa.html`, `noticias.html`, `petroglifo-detalle.html`, `petroglifos.html`, `preguntas.html`, `recorrido.html`, `resenas.html`, `reservas.html`, `trivia.html`

---

## Qué probar después de desplegar

1. **Login:** entra con `admin@piedrapintada.ve` / `Admin1234`. El header debe mostrar tu nombre + "Cerrar sesión". Como admin, verás el acceso "🔒 Panel".
2. **Cerrar sesión:** el botón debe borrar la sesión y devolverte al inicio mostrando de nuevo "Ingresar".
3. **Registro:** crea una cuenta nueva; debe iniciarte sesión automáticamente.
4. **Panel admin:** debe verse centrado y ordenado, con la barra lateral a la izquierda y el contenido a su derecha (no todo pegado).
5. **Editar un petroglifo del seed** (ej. "La Constelación", que tiene imagen): guardar sin cambiar la imagen ya **no** debe dar error 422.
6. **Subir una imagen** a un petroglifo desde el panel: debe ir a Supabase Storage y mostrarse.
