# Cambios — Catálogo real (110 petroglifos), QR imprimible y asistente de voz

**Fecha:** 15 de julio de 2026
**Base:** `museo-piedra-pintada-v1.0` + correcciones de login/admin de la sesión anterior
**Pruebas:** 38/38 en verde.

---

## Resumen de lo que se hizo

1. **Contenido real:** se reemplazan los 12 petroglifos de ejemplo por los **110 registros reales** del Sitio 9 (fuente: Juszczyk, 2023), con sus fichas técnicas (coordenadas, altitud, profundidad de surco, conservación, etc.).
2. **QR imprimible por petroglifo:** cada uno tiene un QR **real y escaneable** que se puede imprimir y pegar en la piedra. Al escanearlo con cualquier cámara, abre la ficha del petroglifo y **el asistente de voz la narra automáticamente**.
3. **Asistente de voz funcional:** narra en español el texto real de cada petroglifo (Web Speech API), tanto en la ficha como en el recorrido.
4. **Panel admin:** el administrador ve, crea, edita, elimina los 110 petroglifos, sube imágenes desde el ordenador (a Supabase Storage) e imprime el QR de cada uno. Con buscador porque son muchos.
5. Se corrige la incoherencia de cifras del inicio (ahora se leen de la API).

---

## ⚠️ PASO OBLIGATORIO ANTES DE SUBIR: cargar los datos en Supabase

Los 110 petroglifos y sus campos técnicos **NO están en tu base de datos todavía**. Hay que cargarlos una vez. En el **SQL Editor de Supabase**, ejecuta en este orden:

### 1) Migración (añade las columnas técnicas — no borra nada)
Abre `db/migracion-petroglifos.sql`, pega su contenido, **Run**.
Usa `ADD COLUMN IF NOT EXISTS`, así que es seguro y no toca los datos existentes.

### 2) Seed real (borra los 12 de ejemplo y carga los 110 reales)
Abre `db/seed-petroglifos-real.sql`, pega su contenido, **Run**.

> ⚠️ Este script **borra** los petroglifos, estaciones y recorridos actuales (con `TRUNCATE`) y carga los 110 reales. Es exactamente lo que pediste ("borrarlos todos y dejar solo los reales"). Las reseñas, usuarios, noticias y trivia **no se tocan**.

### 3) Verifica
```sql
SELECT COUNT(*) AS petroglifos FROM petroglifos;        -- 110
SELECT COUNT(*) AS estaciones  FROM estaciones;          -- 104
SELECT COUNT(DISTINCT codigo_qr) FROM petroglifos;       -- 110 (todos únicos)
```

---

## Después: subir el código

Reemplaza los **25 archivos** de `archivos-corregidos/` en tu proyecto (misma ruta) y:

```bash
git add -A
git commit -m "Catalogo real (110 petroglifos), QR imprimible y asistente de voz"
git push
```

Vercel redesplega solo. La caché ya está en `?v=1.2`.

---

## Detalle técnico

### Base de datos
- **`db/migracion-petroglifos.sql`** (nuevo): añade a `petroglifos` las columnas `codigo_roca`, `latitud`, `longitud`, `altitud_m`, `cantidad_caras`, `profundidad_surco`, `forma_surco`, `exposicion_solar`, `orientacion`, `estado_conservacion`, `fecha_registro`, `notas`.
- **`db/seed-petroglifos-real.sql`** (nuevo): TRUNCATE de los datos de ejemplo + 110 INSERT reales + genera una estación por cada petroglifo con coordenadas (104) + un recorrido ordenado.
- El **QR de cada petroglifo es su código de roca** (`S9R1`…`S9R111`), único.
- 6 rocas no tienen coordenadas en la fuente original, así que no generan estación (por eso 104 y no 110). Se pueden completar luego desde el panel.

### Backend
- `petroglifos.controller.js`: `crear`/`editar` ahora guardan los 12 campos técnicos nuevos. Se añadió `GET /api/petroglifos/qr/:codigo` (búsqueda pública por QR, la usa la ficha al escanear).
- `petroglifos.routes.js`: validadores opcionales para los campos nuevos + la ruta `/qr/:codigo`. (También el fix previo de `imagen_url`.)
- `tests/ayuda/db-prueba.js`: carga la migración en el entorno de pruebas.

### Frontend
- **`js/qr-voz.js`** (nuevo): módulo compartido que genera QR reales (librería `qrcode.js` por CDN), imprime el QR listo para pegar, y narra texto en español.
- **`petroglifo-detalle.html`**: acepta `?qr=CODIGO` (destino del escaneo), muestra un **QR real**, botón **Imprimir QR**, la **ficha técnica**, y **narra automáticamente** cuando llegas por QR.
- **`admin/dashboard.html`** + **`admin.js`**: tabla de petroglifos con **buscador**, columna de código QR, botón **🖨️ QR** por fila, y el modal de edición ampliado con la ficha técnica (colapsable).
- **`petroglifos.html`**: catálogo público con las nuevas categorías por estado de conservación (Erosionado / Bien conservado / Vandalizado).
- **`recorrido.html`**: la narración ahora usa el texto real del petroglifo, no un texto genérico.
- **`index.html`**: las cifras de "Petroglifos" y "Estaciones" del inicio se leen de la API (ya no están hardcodeadas).

---

## Cómo funciona el flujo QR + voz (para probar)

1. En el panel admin, cada petroglifo tiene botón **🖨️ QR** → abre una ventana lista para imprimir con el QR + el código.
2. Imprimes y pegas el QR en la piedra física.
3. El visitante escanea el QR con la cámara de su teléfono (o desde el recorrido en la web).
4. Se abre `petroglifo-detalle.html?qr=S9R44` → carga la ficha y **el asistente empieza a narrar** la historia en español.

> Nota: la narración por voz depende de que el navegador tenga voces en español instaladas (la mayoría de móviles y Chrome/Edge las traen). En algún navegador de escritorio sin voces en español, usará la voz por defecto.

---

## Qué NO se tocó
- Usuarios, reseñas, noticias, preguntas y trivia siguen igual.
- Las acciones críticas de seguridad siguen pendientes (rotar credenciales de Supabase, cambiar `Admin1234`). Recomendado hacerlas pronto.
