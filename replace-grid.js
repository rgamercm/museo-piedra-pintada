const fs = require('fs');
let html = fs.readFileSync('frontend/pages/informacion.html', 'utf8');

const startTag = '<div class="s9-rocas-grid">';
const startIdx = html.indexOf(startTag);
let endIdx = startIdx;
let openDivs = 0;

for (let i = startIdx; i < html.length; i++) {
    if (html.slice(i, i + 4) === '<div') {
        openDivs++;
    } else if (html.slice(i, i + 5) === '</div') {
        openDivs--;
        if (openDivs === 0) {
            endIdx = i + 6; // include closing </div>\n
            break;
        }
    }
}

if (startIdx !== -1 && endIdx > startIdx) {
    const replacement = \<div class="catalogo-grid" id="destacados-grid"></div>\;
    html = html.slice(0, startIdx) + replacement + html.slice(endIdx);
    
    const scriptToAdd = \
<script>
  document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('destacados-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--color-texto-3); padding: 2rem;">Cargando petroglifos destacados...</div>';
    
    try {
      const petroglifos = await window.api.petroglifos.obtenerTodos();
      const rocasDestacadas = ['S9R9', 'S9R6', 'S9R44', 'S9R51', 'S9R101', 'S9R64', 'S9R107', 'S9R73', 'S9R66'];
      
      const filtrados = petroglifos
        .filter(p => rocasDestacadas.includes(p.nombre))
        .sort((a, b) => rocasDestacadas.indexOf(a.nombre) - rocasDestacadas.indexOf(b.nombre));
        
      if (filtrados.length === 0) {
        grid.innerHTML = '<div class="sin-resultados">No se encontraron petroglifos.</div>';
        return;
      }
      
      const COLORES_CAT = {
        'Erosionado':      'badge--gris',
        'Bien conservado': 'badge--verde',
        'Vandalizado':     'badge--rojo',
      };
      
      const htmlCards = filtrados.map(p => {
        const imgUrl = (p.imagen_url || '').replace(/^\\/assets\\//, '../assets/') || '../assets/img/petroglifo-01.png';
        return \\\
          <a href="petroglifo-detalle.html?id=\\$\\{p.id\\}" class="petroglifo-card revelar" id="card-petroglifo-\\$\\{p.id\\}">
            <div class="petroglifo-card__img-wrap">
              <img src="\\$\\{imgUrl\\}" alt="\\$\\{p.nombre\\}" loading="lazy">
              \\$\\{p.categoria ? \\\\\<span class="petroglifo-card__badge \\$\\{COLORES_CAT[p.categoria] || 'badge--gris'\\}">\\$\\{p.categoria\\}</span>\\\\\ : ''\\}
            </div>
            <div class="petroglifo-card__content">
              <h3 class="petroglifo-card__title">\\$\\{p.nombre\\}</h3>
              <div class="petroglifo-card__meta">
                <span>?? \\$\\{p.estacion_nombre || 'Múltiples estaciones'\\}</span>
              </div>
              <p class="petroglifo-card__desc">\\$\\{p.descripcion || ''\\}</p>
            </div>
          </a>
        \\\;
      }).join('');
      
      grid.innerHTML = htmlCards;
      
      if (window.Museo && window.Museo.iniciarScrollReveal) {
        window.Museo.iniciarScrollReveal();
      }
    } catch (e) {
      console.error(e);
      grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: red;">Error al cargar.</div>';
    }
  });
</script>
\;

    html = html.replace('</body>', scriptToAdd + '</body>');
    fs.writeFileSync('frontend/pages/informacion.html', html);
    console.log('Successfully replaced grid and injected script.');
} else {
    console.log('Could not find the target div.');
}
