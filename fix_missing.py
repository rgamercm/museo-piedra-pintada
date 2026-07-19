import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'd:\GitHub Proyectos\museo-piedra-pintada\s9_all_rocks.json', 'r', encoding='utf-8') as f:
    rocks = json.load(f)

# Fix S9R98 with actual data from the PDF
for r in rocks:
    if r['id'] == 'S9R98':
        r['lat'] = '10°17\'45.6" N'
        r['lon'] = '67°53\'34.24" W'
        r['altitude'] = '502'
        r['faces'] = '1'
        r['date'] = '9.03.2022, 10:55 AM'
        r['orientation'] = 'Al valle'
        r['groove_depth'] = '0,5 cm'
        r['groove_shape'] = 'Redondeado'
        r['sun'] = 'Iluminado'
        r['damage'] = 'Erosión'
        r['notes'] = ''
        r['face_dirs'] = 'S'
        print("Fixed S9R98")
        break

# Remove duplicate S9R57 if exists (keep first occurrence)
seen = set()
unique_rocks = []
for r in rocks:
    if r['id'] not in seen:
        seen.add(r['id'])
        unique_rocks.append(r)
    else:
        print(f"Removed duplicate: {r['id']}")

rocks = unique_rocks
print(f"Total unique rocks: {len(rocks)}")

# Verify sequence
for i, r in enumerate(rocks):
    expected_num = i + 1
    import re
    m = re.search(r'S9R(\d+)', r['id'])
    if m:
        actual_num = int(m.group(1))
        if actual_num != expected_num:
            print(f"  Position {i}: {r['id']} (expected S9R{expected_num})")

with open(r'd:\GitHub Proyectos\museo-piedra-pintada\s9_all_rocks.json', 'w', encoding='utf-8') as f:
    json.dump(rocks, f, ensure_ascii=False, indent=2)

print("Saved updated JSON")
