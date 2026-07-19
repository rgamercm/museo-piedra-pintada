import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'd:\GitHub Proyectos\museo-piedra-pintada\s9_all_rocks.json', 'r', encoding='utf-8') as f:
    rocks = json.load(f)

# Minify JSON (remove whitespace)
minified = json.dumps(rocks, ensure_ascii=False, separators=(',', ':'))
print(f"Minified JSON size: {len(minified)} chars")

# Write minified
with open(r'd:\GitHub Proyectos\museo-piedra-pintada\s9_min.json', 'w', encoding='utf-8') as f:
    f.write(minified)

print("Done")
