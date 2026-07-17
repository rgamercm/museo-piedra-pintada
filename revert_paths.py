"""
Revert image paths from absolute (/assets/...) back to relative (../assets/...)
"""
import os

files = [
    r"db/seed-petroglifos-real.sql",
    r"db/update-imagenes-petroglifos.sql"
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Revert the replacement
        content = content.replace("'/assets/img/petroglifos/", "'../assets/img/petroglifos/")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Reverted paths in {filepath}")
