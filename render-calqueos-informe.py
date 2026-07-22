"""Renderiza las paginas de calqueo (dibujos AMERGRAPH) del informe de
K. Juszczyk (2023) a PNG, una imagen por cara/pagina, recortando el marco
del dibujo (cuando la pagina tiene foto arriba + calqueo abajo, se toma el
marco inferior)."""
import fitz, re, json, os
from PIL import Image

DOC = 'K.Juszczyk_INFORME_2023.pdf'
OUT = 'frontend/assets/img/petroglifos/dibujos'
ZOOM = 2.0

doc = fitz.open(DOC)

# Paginas de calqueo: texto corto con la escala ("(cm)"/"(m)") y un unico
# codigo de roca (el catalogo alterna ficha "ROCA S9RX" -> pagina(s) de dibujo).
pages = {}
for i in range(len(doc)):
    t = doc[i].get_text().strip()
    if len(t) < 200 and ('(cm)' in t or '(m)' in t):
        codes = set(re.findall(r'S9R\d+', t))
        if len(codes) == 1:
            pages.setdefault(codes.pop(), []).append(i + 1)

os.makedirs(OUT, exist_ok=True)
manifest = {}
errores = []

def rect_calqueo(p):
    """Marco del dibujo: el inferior si hay dos marcos apilados, o el unico
    marco a pagina completa."""
    marcos = []
    for d in p.get_drawings():
        r = d['rect']
        if r.width > p.rect.width * 0.8 and r.height > p.rect.height * 0.25:
            marcos.append(r)
    # dedupe aproximado por (y0,y1)
    uniq = {}
    for r in marcos:
        uniq[(round(r.y0/5), round(r.y1/5))] = r
    marcos = sorted(uniq.values(), key=lambda r: r.y1)
    if not marcos:
        return p.rect  # sin marcos: pagina completa
    elegido = marcos[-1]  # el mas abajo
    # sanity: la escala "(cm)"/"(m)" debe caer dentro del marco elegido
    ok = False
    for w in p.get_text('words'):
        if '(cm)' in w[4] or '(m)' in w[4]:
            if elegido.y0 - 5 <= w[1] and w[3] <= elegido.y1 + 5:
                ok = True
                break
    return elegido if ok else p.rect

total_kb = 0
for code in sorted(pages, key=lambda s: int(s[3:])):
    n = 0
    for pnum in sorted(pages[code]):
        p = doc[pnum - 1]
        clip = rect_calqueo(p)
        if clip == p.rect:
            errores.append((code, pnum, 'sin marco/escala: pagina completa'))
        n += 1
        pix = p.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=clip,
                           colorspace=fitz.csGRAY)
        img = Image.frombytes('L', (pix.width, pix.height), pix.samples)
        f = f'{OUT}/{code}_{n}.png'
        img.save(f, optimize=True)
        total_kb += os.path.getsize(f) / 1024
    manifest[code] = n

json.dump(manifest, open(f'{OUT}/_dibujos.json', 'w'), indent=0, sort_keys=True)
print('rocas:', len(manifest), '| imagenes:', sum(manifest.values()),
      '| total MB:', round(total_kb / 1024, 1))
print('avisos:', errores if errores else 'ninguno')
