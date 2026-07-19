import os
import re

def replace_colors_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Reemplazar rgba(122, 186, 88) (verde) por rgba(140, 115, 85) (marron / dorado)
    content = re.sub(r'rgba\(\s*122\s*,\s*186\s*,\s*88\s*', 'rgba(140, 115, 85', content)
    
    # Reemplazar rgba(13, 32, 73) (azul oscuro) por rgba(18, 18, 18) (negro suave)
    content = re.sub(r'rgba\(\s*13\s*,\s*32\s*,\s*73\s*', 'rgba(18, 18, 18', content)

    # Reemplazar rgba(10, 26, 60) (azul más oscuro) por rgba(26, 26, 26) (gris)
    content = re.sub(r'rgba\(\s*10\s*,\s*26\s*,\s*60\s*', 'rgba(26, 26, 26', content)

    # Reemplazar rgba(18, 40, 90) (azul) por rgba(38, 38, 38)
    content = re.sub(r'rgba\(\s*18\s*,\s*40\s*,\s*90\s*', 'rgba(38, 38, 38', content)

    # Reemplazar rgba(208, 100, 60) (acento naranja) por rgba(105, 105, 105) (gris acento)
    content = re.sub(r'rgba\(\s*208\s*,\s*100\s*,\s*60\s*', 'rgba(105, 105, 105', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.html') or file.endswith('.css') or file.endswith('.js'):
                replace_colors_in_file(os.path.join(root, file))

if __name__ == "__main__":
    process_directory(r'd:\GitHub Proyectos\museo-piedra-pintada\frontend')
    print("Colors replaced successfully.")
