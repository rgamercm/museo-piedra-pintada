# Cómo armar el proyecto en tu máquina — Guía paso a paso

**Objetivo al terminar:** tener el frontend abierto en el navegador y el backend respondiendo en `http://localhost:3000/api/health`, ambos en tu PC.

**Tiempo estimado:** 20–30 minutos (la mayoría es instalar PostgreSQL si no lo tienes).

---

## PASO 0 — Verifica qué tienes instalado

Abre una terminal (CMD, PowerShell, o Terminal en Mac/Linux) y corre:

```bash
node --version
npm --version
psql --version
```

- **Node.js:** si no aparece versión, instálalo desde https://nodejs.org (elige la versión LTS).
- **PostgreSQL:** si no aparece versión, instálalo desde https://www.postgresql.org/download/ (durante la instalación te pedirá una contraseña para el usuario `postgres` — **anótala**, la necesitas en el Paso 3).

No sigas al siguiente paso hasta que `node --version` y `psql --version` muestren un número.

---

## PASO 1 — Organiza las carpetas

Crea una carpeta para el proyecto completo y coloca dentro las tres piezas que ya tienes:

```
museo-piedra-pintada/          ← carpeta raíz, créala tú
├── frontend/                  ← la que ya tenías (descomprimida)
├── backend/                   ← del zip que te acabo de dar
├── db/                        ← del mismo zip
└── docs/                      ← del mismo zip (opcional, son notas de progreso)
```

**Cómo hacerlo:**
1. Crea una carpeta nueva en tu PC llamada `museo-piedra-pintada`.
2. Mete ahí tu carpeta `frontend` (la que ya tenías armada).
3. Descomprime `museo-fase-M-backend.zip` dentro de esa misma carpeta raíz — al descomprimir, te creará `backend/`, `db/` y `docs/` ya en el lugar correcto, al mismo nivel que `frontend/`.

Verifica que quedó así abriendo la carpeta en tu explorador de archivos: las 4 subcarpetas (`frontend`, `backend`, `db`, `docs`) deben estar **al mismo nivel**, una junto a la otra.

---

## PASO 2 — Instala las dependencias del backend

En la terminal, entra a la carpeta del backend y instala:

```bash
cd museo-piedra-pintada/backend
npm install
```

Esto descarga Express, PostgreSQL driver, JWT, bcrypt, etc. Tarda 1–2 minutos. Al final debe decir algo como `added 120 packages` sin errores en rojo.

---

## PASO 3 — Crea la base de datos PostgreSQL

### 3.1 Crear la base vacía

```bash
psql -U postgres -c "CREATE DATABASE museo_piedra_pintada;"
```

Te pedirá la contraseña de PostgreSQL que pusiste al instalarlo (Paso 0).

> **Si te da error "psql no se reconoce como comando"** (Windows): busca la carpeta de instalación de PostgreSQL (algo como `C:\Program Files\PostgreSQL\16\bin`) y usa la ruta completa, o agrégala al PATH del sistema.

### 3.2 Cargar las tablas (schema.sql)

```bash
psql -U postgres -d museo_piedra_pintada -f ../db/schema.sql
```

Debe imprimir una lista de `DROP TABLE`, `CREATE TABLE`, `CREATE INDEX` — sin líneas de `ERROR`.

### 3.3 Cargar los datos de ejemplo (seed.sql)

```bash
psql -U postgres -d museo_piedra_pintada -f ../db/seed.sql
```

Debe imprimir varias líneas `INSERT 0 N` — sin `ERROR`.

### 3.4 Verificar que los datos están ahí

```bash
psql -U postgres -d museo_piedra_pintada -c "SELECT correo, rol FROM usuarios;"
```

Debe mostrarte 3 filas: el admin, María (registrado) y el Liceo (institución).

---

## PASO 4 — Configura las variables de entorno

Dentro de `backend/`, copia el archivo de ejemplo:

```bash
# Windows (CMD):
copy .env.example .env

# Mac/Linux:
cp .env.example .env
```

Abre el nuevo archivo `.env` con cualquier editor de texto y ajusta **solo esta línea** con la contraseña que usaste en el Paso 3:

```
DB_PASSWORD=tu_contraseña_de_postgres
```

El resto de valores (`DB_HOST=localhost`, `DB_NAME=museo_piedra_pintada`, etc.) ya están bien por defecto si seguiste los pasos tal cual.

---

## PASO 5 — Arranca el backend

Todavía dentro de `backend/`:

```bash
npm run dev
```

Deberías ver en la terminal:

```
[BD] Conectada (2026-06-28T...)
[API] Museo Piedra Pintada escuchando en http://localhost:3000
[API] Entorno: development · Salud: http://localhost:3000/api/health
```

**Déjalo corriendo** — esta terminal queda "viva" mientras el servidor funciona. No la cierres.

### Verifica que responde

Abre tu navegador y entra a:

```
http://localhost:3000/api/health
```

Debe mostrarte algo como:

```json
{"ok":true,"datos":{"estado":"ok","bd":"conectada","hora":"2026-06-28T..."}}
```

✅ **Si ves eso, el backend está funcionando correctamente.**

### Prueba el login (opcional, para confirmar la autenticación)

Abre **otra** terminal (deja la primera corriendo el servidor) y prueba:

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"correo\":\"admin@piedrapintada.ve\",\"contrasena\":\"Admin1234\"}"
```

Debe devolverte un token JWT largo dentro de `"datos":{"usuario":{...},"token":"eyJ..."}`.

---

## PASO 6 — Abre el frontend

El frontend **todavía no está conectado** a este backend (eso es el paso M6, que viene después). Por ahora, simplemente ábrelo para verlo funcionando con sus datos de ejemplo:

1. Ve a la carpeta `frontend/`.
2. Haz doble clic en `index.html`.

Se abrirá en tu navegador predeterminado. Navega por el menú: Inicio, Petroglifos, Recorrido, Trivia, etc. Todo lo que ves ahí usa datos de muestra escritos directamente en cada página (no viene de la base de datos todavía).

> **Nota técnica:** abrir el `index.html` con doble clic funciona para navegar, pero algunas funciones del navegador (cámara, fetch a APIs) funcionan mejor si el frontend se sirve por HTTP en vez de abrirse como archivo local. Si más adelante alguna función no responde bien, usa una extensión como "Live Server" en VS Code, o corre:
> ```bash
> cd frontend
> npx serve .
> ```
> y abre la URL que te indique (típicamente `http://localhost:3000` — si choca con el puerto del backend, te ofrecerá otro puerto automáticamente).

---

## Checklist final — ¿quedó todo bien armado?

- [ ] `node --version` y `psql --version` muestran números de versión
- [ ] Las 4 carpetas (`frontend`, `backend`, `db`, `docs`) están al mismo nivel
- [ ] `npm install` corrió sin errores dentro de `backend/`
- [ ] La base `museo_piedra_pintada` existe y tiene las tablas + datos cargados
- [ ] El archivo `.env` tiene tu contraseña real de PostgreSQL
- [ ] `npm run dev` muestra "Conectada" y "escuchando en http://localhost:3000"
- [ ] `http://localhost:3000/api/health` responde `"ok":true` en el navegador
- [ ] `frontend/index.html` abre y se ve el sitio del museo

Si los 8 puntos están en verde, **el proyecto está correctamente armado** y listo para que sigamos con M4 (conectar cada pantalla a datos reales de la base, en vez de datos de muestra).

---

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `npm install` falla con errores de red | Sin conexión o proxy/firewall corporativo | Revisa tu conexión a internet; reintenta |
| `psql: command not found` | PostgreSQL no está en el PATH | Usa la ruta completa al ejecutable, o reinstala marcando "Add to PATH" |
| `password authentication failed for user "postgres"` | Contraseña incorrecta en `.env` o en el comando `psql` | Verifica la contraseña que pusiste al instalar PostgreSQL |
| El backend dice `[BD] No se pudo conectar` | PostgreSQL no está corriendo, o el nombre de la BD/usuario está mal en `.env` | Verifica que el servicio de PostgreSQL esté activo; revisa `DB_NAME`, `DB_USER`, `DB_PASSWORD` en `.env` |
| `EADDRINUSE: port 3000` | Ya hay algo corriendo en el puerto 3000 | Cierra ese proceso, o cambia `PORT=3000` a `PORT=3001` en `.env` |
| El frontend se ve sin estilos | Abriste un archivo `.html` suelto fuera de su carpeta | Asegúrate de abrir `frontend/index.html` desde dentro de la carpeta completa (necesita `css/estilos.css` y `js/` al lado) |

---

## ¿Qué sigue después de armarlo?

Una vez que confirmes el checklist en verde, el siguiente trabajo de desarrollo es **M4.1 — API de Petroglifos y Estaciones**: los primeros endpoints reales (CRUD + lectura por código QR) que luego conectaremos al frontend en M6.
