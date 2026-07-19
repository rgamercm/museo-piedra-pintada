"""
Extract calqueo images from the PDF for S9 rocks.
The calqueos are the line-drawing tracings of the petroglyphs.
S9 section is from page 161 to ~408 (0-indexed: 160-407).
Each rock entry typically has:
  - A field photograph (JPEG, color)
  - A calqueo drawing (often has a white/light background with black lines)
We need to identify which images are calqueos vs photos.
"""
import fitz
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"d:\GitHub Proyectos\museo-piedra-pintada\K.Juszczyk_INFORME_2023.pdf"
output_dir = r"d:\GitHub Proyectos\museo-piedra-pintada\frontend\assets\img\petroglifos\calqueos"

os.makedirs(output_dir, exist_ok=True)

doc = fitz.open(pdf_path)

# S9 section pages (0-indexed)
start_page = 160
end_page = min(408, doc.page_count)

print(f"Scanning pages {start_page+1} to {end_page+1} for images...")

# First pass: extract all images and their page context
extracted = 0
page_images = {}

for page_num in range(start_page, end_page):
    page = doc[page_num]
    text = page.get_text()
    images = page.get_images(full=True)
    
    if not images:
        continue
    
    # Try to find rock code in the page text
    rock_matches = re.findall(r'ROCA\s+(S9R\d+[a-z]?)', text)
    rock_code = rock_matches[0] if rock_matches else None
    
    # Also check if the text contains "S.9.R." or "S9R" pattern directly  
    if not rock_code:
        alt_matches = re.findall(r'S\.?9\.?\s*R\.?\s*(\d+[a-z]?)', text)
        if alt_matches:
            rock_code = f"S9R{alt_matches[0]}"
    
    for img_idx, img in enumerate(images):
        xref = img[0]
        width = img[2]
        height = img[3]
        
        # Skip very small images (logos, icons, etc.)
        if width < 200 or height < 200:
            continue
        
        try:
            pix = fitz.Pixmap(doc, xref)
            
            # Convert CMYK to RGB if needed
            if pix.n - pix.alpha > 3:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            
            # Determine if this is likely a calqueo vs photo
            # Calqueos tend to be:
            # - Higher proportion of white pixels
            # - Less color variation 
            # - Often PNG format (line art)
            # Photos tend to be JPEG (DCTDecode)
            
            is_likely_calqueo = False
            img_format = img[8]  # encoding: DCTDecode=JPEG, FlateDecode=PNG-like
            
            # FlateDecode images are more likely calqueos (line art)
            if img_format == 'FlateDecode':
                is_likely_calqueo = True
            
            # Also check image dimensions - calqueos often have specific aspect ratios
            # and are typically not photographs
            
            # For now, save ALL significant images and label them
            if rock_code:
                suffix = "calqueo" if is_likely_calqueo else "foto"
                filename = f"{rock_code}_{suffix}_{img_idx}.png"
            else:
                filename = f"page{page_num+1}_img{img_idx}.png"
            
            filepath = os.path.join(output_dir, filename)
            pix.save(filepath)
            extracted += 1
            
            if rock_code:
                if rock_code not in page_images:
                    page_images[rock_code] = []
                page_images[rock_code].append({
                    'file': filename,
                    'type': 'calqueo' if is_likely_calqueo else 'foto',
                    'width': width,
                    'height': height,
                    'page': page_num + 1,
                    'format': img_format
                })
            
            print(f"  Page {page_num+1}: {filename} ({width}x{height}, {img_format})")
            
        except Exception as e:
            print(f"  Error extracting image on page {page_num+1}: {e}")

doc.close()

print(f"\nTotal images extracted: {extracted}")
print(f"\nRocks with images:")
for code, imgs in sorted(page_images.items()):
    calqueos = [i for i in imgs if i['type'] == 'calqueo']
    fotos = [i for i in imgs if i['type'] == 'foto']
    print(f"  {code}: {len(calqueos)} calqueo(s), {len(fotos)} foto(s)")

# Save manifest
import json
manifest_path = os.path.join(output_dir, "_manifest.json")
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(page_images, f, ensure_ascii=False, indent=2)
print(f"\nManifest saved to: {manifest_path}")
