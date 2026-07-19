"""
Scan extracted images to find actual calqueos by analyzing pixel content.
Real calqueos are line drawings: high contrast, mostly white/light gray background
with black/dark lines. Photos have lots of color variation.
"""
import os
from PIL import Image
import numpy as np
import json

calqueos_dir = r"d:\GitHub Proyectos\museo-piedra-pintada\frontend\assets\img\petroglifos\calqueos"

results = {}
actual_calqueos = []

for filename in sorted(os.listdir(calqueos_dir)):
    if not filename.endswith('.png') or filename.startswith('_'):
        continue
    
    filepath = os.path.join(calqueos_dir, filename)
    try:
        img = Image.open(filepath)
        # Convert to grayscale for analysis
        gray = img.convert('L')
        arr = np.array(gray)
        
        # Calqueo characteristics:
        # 1. High percentage of very light pixels (white background) > 60%
        # 2. Some very dark pixels (black lines) > 2%
        # 3. Low standard deviation in the mid-range (not many mid-tones like photos)
        
        total_pixels = arr.size
        white_pixels = np.sum(arr > 220) / total_pixels  # very light
        black_pixels = np.sum(arr < 50) / total_pixels    # very dark
        mid_pixels = np.sum((arr >= 50) & (arr <= 220)) / total_pixels  # mid-range
        
        # A calqueo has: lots of white (>50%), some black (>3%), little mid (< 30%)
        is_calqueo = white_pixels > 0.50 and black_pixels > 0.02 and mid_pixels < 0.35
        
        # Also check: if image is mostly one color (like solid gray from a scanned page)
        # that's not a calqueo either
        std_dev = np.std(arr)
        
        if is_calqueo and std_dev > 40:
            actual_calqueos.append(filename)
            
            # Extract rock code
            parts = filename.split('_')
            rock_code = parts[0]
            if rock_code not in results:
                results[rock_code] = []
            results[rock_code].append(filename)
            
            print(f"✓ CALQUEO: {filename} (white={white_pixels:.1%}, black={black_pixels:.1%}, mid={mid_pixels:.1%}, std={std_dev:.1f})")
        
    except Exception as e:
        pass

print(f"\n--- SUMMARY ---")
print(f"Total actual calqueos found: {len(actual_calqueos)}")
print(f"Rocks with calqueos: {len(results)}")
for code, files in sorted(results.items()):
    print(f"  {code}: {files}")

# Save results
with open(os.path.join(calqueos_dir, "_actual_calqueos.json"), 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
