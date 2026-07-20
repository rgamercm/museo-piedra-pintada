# Registro de Cambios (Changelog) - Museo Piedra Pintada v1.0

## [v1.3.0] - 15 Julio 2026

### ✨ Nuevas Características
* **Catálogo Real de Petroglifos (110 registros):** Se eliminaron los datos de ejemplo y se integró la base de datos real del Sitio 9 (Juszczyk, 2023) con todos sus datos técnicos (coordenadas, altitud, conservación, etc.).
* **Generación de Códigos QR Imprimibles:** Cada petroglifo cuenta con su propio QR único (basado en el `codigo_roca`, ej. S9R1) que puede ser impreso directamente desde el Panel de Administración.
* **Asistente de Voz Integrado:** Al escanear el QR o acceder a la ficha del petroglifo, un asistente de voz impulsado por la *Web Speech API* narra automáticamente la información del petroglifo en español.
* **Identidad Visual Actualizada:** Nueva paleta de colores implementada en todo el sitio y panel de administración, utilizando Azul Marino (`#0D2049`) y Verde Manzana (`#7ABA58`) para mejor contraste y frescura.
* **Gestión de Sesión Visible:** El encabezado del sitio ahora reacciona al estado de autenticación. Los usuarios logueados ven un menú con su nombre, botón de cerrar sesión, y acceso directo al Panel (si son administradores).

### 🛠️ Correcciones (Bug Fixes)
* **Validación de URLs de Imágenes (Error 422):** Se corrigió la validación de `imagen_url` en el backend (rutas de petroglifos y noticias). Se reemplazó `.isURL()` por una validación de longitud (`max: 500`), permitiendo guardar tanto imágenes relativas del sistema como rutas absolutas de Supabase Storage.
* **Layout del Panel de Administración:** Se solucionó un conflicto de CSS (`display: grid` + `position: fixed` + `margin-left`) que descuadraba el contenido hacia la izquierda. Ahora la vista es fluida y adaptable.
* **Registro de Usuarios Funcional:** El formulario de registro ya no es una simulación visual; se conectó con el backend (`POST /api/auth/registro`) y autologuea al usuario tras crearse la cuenta.
* **Optimización de Caché:** Se implementó *Cache Busting* global (`?v=1.3`) en los recursos para asegurar que los navegadores carguen las últimas versiones tras cada despliegue.

### 🗄️ Base de Datos (Migraciones)
* **Nuevas Columnas Técnicas:** La tabla `petroglifos` se amplió con nuevos campos técnicos (`codigo_roca`, `latitud`, `longitud`, `altitud_m`, `cantidad_caras`, `profundidad_surco`, `forma_surco`, `exposicion_solar`, `orientacion`, `estado_conservacion`, `fecha_registro`, `notas`).
* **Sincronización de Estaciones:** Se generaron 104 estaciones automáticas correspondientes a los petroglifos que cuentan con coordenadas, listas para integrarse al mapa interactivo.
