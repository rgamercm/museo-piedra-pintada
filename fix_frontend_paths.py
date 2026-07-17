import os

def fix_file(filepath, old, new):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace(old, new)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

# For petroglifos.html
fix_file(
    r"frontend/pages/petroglifos.html", 
    r'${(p.imagen_url || "").replace(/^\\/assets\\//, "../assets/") || "../assets/img/petroglifo-01.png"}', 
    r'${(p.imagen_url || "").replace("/assets/img/", "../assets/img/") || "../assets/img/petroglifo-01.png"}'
)

# For petroglifo-detalle.html
fix_file(
    r"frontend/pages/petroglifo-detalle.html", 
    r'(petroglifo.imagen_url || "").replace(/^\\/assets\\//, "../assets/");', 
    r'(petroglifo.imagen_url || "").replace("/assets/img/", "../assets/img/");'
)

# For recorrido.html
fix_file(
    r"frontend/pages/recorrido.html", 
    r'(est.petroglifo.imagen_url || "").replace(/^\\/assets\\//, "../assets/") ||', 
    r'(est.petroglifo.imagen_url || "").replace("/assets/img/", "../assets/img/") ||'
)
