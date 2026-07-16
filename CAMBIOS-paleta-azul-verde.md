# Cambios — Nueva paleta: azul marino + verde manzana

**Fecha:** 15 de julio de 2026

## Qué cambió
Se reemplazó la identidad visual piedra/tierra/dorado por la nueva paleta:
- Fondo: **azul marino `#0D2049`** (con variantes `#0A1A3C` y `#12285A` para tarjetas)
- Acento principal: **verde manzana `#7ABA58`** (títulos, botones, bordes, badges)
- Verde oscuro `#35882F`, azul `#0A4F93` como acentos secundarios
- Texto claro sobre fondo oscuro, contraste verificado

Aplicado a **todo**: web pública + panel de administración.

## Cómo se hizo
- Se remapearon las variables de color en `:root` de `estilos.css` (manteniendo los mismos nombres de variable, así que todo el sitio se actualiza a la vez).
- Se reemplazaron todos los tonos dorados/marrones incrustados directamente en las 13 páginas HTML y en `qr-voz.js`.
- El QR ahora se dibuja en azul marino `#0D2049` sobre blanco (contraste ~15:1, sigue siendo perfectamente escaneable).
- Caché subida a `?v=1.3` para forzar la recarga en navegadores y en la CDN de Vercel.

## Cómo aplicar
Reemplaza los 15 archivos de `archivos-corregidos/` (misma ruta) y:
```bash
git add -A
git commit -m "Nueva paleta: azul marino + verde manzana"
git push
```
Vercel redesplega solo. Si no ves el cambio de inmediato, es caché del navegador: Ctrl+Shift+R (recarga forzada).

## Nota
Los tests (38/38) no se ven afectados porque solo tocan el backend. La lógica, el catálogo de 110 petroglifos, el QR y la voz siguen igual: esto fue solo un cambio de colores.
