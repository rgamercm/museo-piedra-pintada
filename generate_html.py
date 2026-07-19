import json
import sys
import html as html_module

sys.stdout.reconfigure(encoding='utf-8')

with open(r'd:\GitHub Proyectos\museo-piedra-pintada\s9_all_rocks.json', 'r', encoding='utf-8') as f:
    rocks = json.load(f)

print(f"Total rocks: {len(rocks)}")

# Check for missing S9R numbers
existing_ids = set()
for r in rocks:
    num_match = __import__('re').search(r'S9R(\d+)', r['id'])
    if num_match:
        existing_ids.add(int(num_match.group(1)))

all_expected = set(range(1, 112))
missing = all_expected - existing_ids
print(f"Missing rock numbers: {sorted(missing)}")

# Generate damage badge color
def damage_badge(damage):
    if "Vandalismo" in damage:
        return "badge--rojo"
    elif "Erosión" in damage:
        return "badge--amarillo"
    else:
        return "badge--verde"

def damage_icon(damage):
    if "Vandalismo" in damage:
        return "⚠️"
    elif "Erosión" in damage:
        return "🔸"
    else:
        return "✅"

# Generate HTML for all rocks
cards_html = ""
for r in rocks:
    esc = html_module.escape
    rock_id = esc(r['id'])
    rock_name = esc(r.get('name', ''))
    lat = esc(r.get('lat', '—'))
    lon = esc(r.get('lon', '—'))
    alt = esc(r.get('altitude', '—'))
    faces = esc(r.get('faces', '—'))
    date = esc(r.get('date', '—'))
    orientation = esc(r.get('orientation', '—'))
    depth = esc(r.get('groove_depth', '—'))
    shape = esc(r.get('groove_shape', '—'))
    sun = esc(r.get('sun', '—'))
    damage = esc(r.get('damage', '—'))
    notes = esc(r.get('notes', ''))
    face_dirs = esc(r.get('face_dirs', '—'))
    
    # Title line
    title = rock_id
    if rock_name:
        title += f' — «{rock_name}»'
    
    # Is this a special rock?
    is_special = rock_name or notes
    special_class = " s9-roca--destacada" if rock_name else ""
    
    # Notes section
    notes_html = ""
    if notes:
        notes_html = f'''
              <div class="s9-roca__notas">
                <span class="s9-roca__notas-icon">📝</span>
                <span>{notes}</span>
              </div>'''
    
    cards_html += f'''
            <div class="s9-roca{special_class}" id="roca-{rock_id.lower()}">
              <div class="s9-roca__header">
                <div class="s9-roca__badge">{rock_id}</div>
                <div class="s9-roca__titulo">
                  <h4>{title}</h4>
                  <span class="s9-roca__fecha">{date}</span>
                </div>
                <span class="s9-roca__damage-badge {damage_badge(damage)}">{damage_icon(damage)} {damage}</span>
              </div>
              <div class="s9-roca__datos">
                <div class="s9-roca__dato">
                  <span class="s9-roca__dato-lbl">📍 Coordenadas</span>
                  <span class="s9-roca__dato-val">{lat}<br>{lon}</span>
                </div>
                <div class="s9-roca__dato">
                  <span class="s9-roca__dato-lbl">🏔️ Altitud</span>
                  <span class="s9-roca__dato-val">{alt} m.s.n.m</span>
                </div>
                <div class="s9-roca__dato">
                  <span class="s9-roca__dato-lbl">🧱 Caras</span>
                  <span class="s9-roca__dato-val">{faces} ({face_dirs})</span>
                </div>
                <div class="s9-roca__dato">
                  <span class="s9-roca__dato-lbl">🧭 Orientación</span>
                  <span class="s9-roca__dato-val">{orientation}</span>
                </div>
                <div class="s9-roca__dato">
                  <span class="s9-roca__dato-lbl">✏️ Surco</span>
                  <span class="s9-roca__dato-val">{shape}, {depth}</span>
                </div>
                <div class="s9-roca__dato">
                  <span class="s9-roca__dato-lbl">☀️ Exposición</span>
                  <span class="s9-roca__dato-val">{sun}</span>
                </div>
              </div>{notes_html}
            </div>
'''

# Write the output HTML snippet
output_path = r'd:\GitHub Proyectos\museo-piedra-pintada\s9_rocks_html.txt'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(cards_html)

print(f"HTML written to: {output_path}")
print(f"HTML length: {len(cards_html)} chars")
