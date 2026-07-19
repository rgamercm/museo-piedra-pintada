import fitz
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"d:\GitHub Proyectos\museo-piedra-pintada\K.Juszczyk_INFORME_2023.pdf"
doc = fitz.open(pdf_path)

# Extract pages 161-408 (S9 section)
all_text = ""
for i in range(160, min(409, doc.page_count)):
    page = doc[i]
    all_text += page.get_text() + "\n\n"

doc.close()

# Parse rock entries
rocks = []
rock_sections = re.split(r'ROCA\s+(S9R\d+[a-z]?(?:\s*"[^"]*")?)\s*\n', all_text)

print(f"Found {len(rock_sections)//2} rock entries")

for i in range(1, len(rock_sections), 2):
    rock_id_raw = rock_sections[i].strip()
    content = rock_sections[i+1] if i+1 < len(rock_sections) else ""
    
    # Extract just the code (e.g. S9R81) and any name (e.g. "Diosa de la Lluvia")
    id_match = re.match(r'(S9R\d+[a-z]?)\s*(?:"([^"]*)")?', rock_id_raw)
    rock_code = id_match.group(1) if id_match else rock_id_raw
    rock_name = id_match.group(2) if id_match and id_match.group(2) else ""
    
    rock = {"id": rock_code, "name": rock_name}
    
    # Extract coordinates
    coord_match = re.search(r"(\d+\u00b0\d+['\u2019]\d+[\.,]\d+[\"'\u201d]+\s*N)\s*\n\s*(\d+\u00b0\d+['\u2019]\d+[\.,]\d+[\"'\u201d]+\s*W)", content)

    if coord_match:
        rock["lat"] = coord_match.group(1).strip()
        rock["lon"] = coord_match.group(2).strip()
    
    # Extract altitude
    alt_match = re.search(r'Altura\s*\(m\.s\.n\.m\)\s*\n?\s*(\d+)', content)
    if alt_match:
        rock["altitude"] = alt_match.group(1)
    
    # Extract faces count
    faces_match = re.search(r'Cantidad de las\s*\n?\s*caras\s*\n?\s*(\d+)', content)
    if not faces_match:
        faces_match = re.search(r'Cantidad de las caras\s+(\d+)', content)
    if faces_match:
        rock["faces"] = faces_match.group(1)
    
    # Extract date
    date_match = re.search(r'Fecha y hora\s*\n?\s*([\d\.\-]+[\d\w,\s:]+(?:AM|PM))', content)
    if date_match:
        rock["date"] = date_match.group(1).strip()
    
    # Extract orientations
    orientations = []
    if re.search(r'al cerro\s*\n?\s*x', content):
        orientations.append("Al cerro")
    if re.search(r'al valle\s*\n?\s*x', content):
        orientations.append("Al valle")
    if re.search(r'al río\s*\n?\s*x', content):
        orientations.append("Al río")
    if re.search(r'al cielo\s*\n?\s*x', content):
        orientations.append("Al cielo")
    if re.search(r'a la costa\s*\n?\s*x', content):
        orientations.append("A la costa")
    rock["orientation"] = ", ".join(orientations) if orientations else "—"
    
    # Extract groove depth
    depth_match = re.search(r'Profundidad del surco\s*\n?\s*([\d,\.~]+\s*cm)', content)
    rock["groove_depth"] = depth_match.group(1).strip() if depth_match else "—"
    
    # Extract groove shape
    groove_shapes = []
    if re.search(r'redondeado\s*\n?\s*x', content):
        groove_shapes.append("Redondeado")
    if re.search(r'plano\s*\n?\s*x', content):
        groove_shapes.append("Plano")
    if re.search(r'cuña\s*\n?\s*x', content):
        groove_shapes.append("Cuña")
    rock["groove_shape"] = ", ".join(groove_shapes) if groove_shapes else "—"
    
    # Extract sun exposure
    if re.search(r'iluminado\s*\n?\s*x', content):
        rock["sun"] = "Iluminado"
    elif re.search(r'sombra\s*\n?\s*x', content):
        rock["sun"] = "Sombra"
    else:
        rock["sun"] = "—"
    
    # Extract damage
    damage = []
    if re.search(r'vandalismo\s*\n?\s*x', content):
        damage.append("Vandalismo")
    if re.search(r'erosión\s*\n?\s*x', content):
        damage.append("Erosión")
    rock["damage"] = ", ".join(damage) if damage else "Sin daño"
    
    # Extract notes
    notes_match = re.search(r'Notas\s*\n((?:(?!plano|cuña|Profundidad).*\n)*)', content)
    if notes_match:
        notes = notes_match.group(1).strip()
        notes = re.sub(r'\s+', ' ', notes).strip()
        if notes and notes != 'x' and len(notes) > 2:
            rock["notes"] = notes
        else:
            rock["notes"] = ""
    else:
        rock["notes"] = ""
    
    # Extract face orientations (N/S/E/W)
    face_dirs = []
    # Look in the first ~300 chars for face orientation marks
    face_section = content[:400]
    if re.search(r'N\s*\n\s*x', face_section) or re.search(r'N\s+x', face_section):
        face_dirs.append("N")
    if re.search(r'S\s*\n\s*x', face_section) or re.search(r'S\s+x', face_section):
        face_dirs.append("S")
    if re.search(r'E\s*\n\s*x', face_section) or re.search(r'E\s+x', face_section):
        face_dirs.append("E")
    if re.search(r'W\s*x', face_section) or re.search(r'W\s+x', face_section):
        face_dirs.append("W")
    rock["face_dirs"] = ", ".join(face_dirs) if face_dirs else "—"
    
    rocks.append(rock)

# Save to JSON
output_path = r"d:\GitHub Proyectos\museo-piedra-pintada\s9_all_rocks.json"
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(rocks, f, ensure_ascii=False, indent=2)

print(f"Total rocks parsed: {len(rocks)}")
print(f"Data saved to: {output_path}")

# Print a sample
for r in rocks[:3]:
    print(json.dumps(r, ensure_ascii=False, indent=2))
print("...")
for r in rocks[-2:]:
    print(json.dumps(r, ensure_ascii=False, indent=2))
