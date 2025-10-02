import os, json, re

def natural_sort_key(filename):
    """
    Split filename into text + number chunks so
    '...-10.jpeg' comes after '...-9.jpeg'
    """
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split(r'(\d+)', filename)]

base_dir = "photos"
thumbs_dir = os.path.join(base_dir, "thumbs")
output = []

for category in os.listdir(base_dir):
    category_path = os.path.join(base_dir, category)
    if os.path.isdir(category_path) and category != "thumbs":
        # get only image files
        files = [f for f in os.listdir(category_path) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
        
        # sort files in natural numeric order
        files.sort(key=natural_sort_key)
        
        for file in files:
            name, ext = os.path.splitext(file)
            thumb_file = f"{name}-thumb{ext}"  # your convention
            output.append({
                "thumb": f"photos/thumbs/{category}/{thumb_file}",
                "full": f"photos/{category}/{file}",
                "category": category,
                "alt": f"{category} {name}"
            })

with open("photos.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2)

print("✅ photos.json generated in natural numeric order!")