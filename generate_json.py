import os, json, re
from PIL import Image, ExifTags
from PIL.ExifTags import TAGS
from datetime import datetime

def natural_sort_key(filename):
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split(r'(\d+)', filename)]

def get_exif_date(filepath):
    try:
        img = Image.open(filepath)
        exif_data = img._getexif()
        if not exif_data:
            return None
        for tag_id, value in exif_data.items():
            tag = ExifTags.TAGS.get(tag_id)
            if tag == "DateTimeOriginal":
                # EXIF format: "2025:09:15 14:32:10"
                date_raw = value.split(" ")[0]  # "2025:09:15"
                date_obj = datetime.strptime(date_raw, "%Y:%m:%d")
                return date_obj.strftime("%d-%m-%Y")  # → "15-09-2025"
    except Exception as e:
        print(f"⚠️ No EXIF date for {filepath}: {e}")
    return None

base_dir = "photos"
thumbs_dir = os.path.join(base_dir, "thumbs")
output = []

for category in os.listdir(base_dir):
    category_path = os.path.join(base_dir, category)
    if os.path.isdir(category_path) and category != "thumbs":
        # Photos directly in category folder → main category
        main_files = [f for f in os.listdir(category_path)
                      if os.path.isfile(os.path.join(category_path, f)) and f.lower().endswith((".jpg", ".jpeg", ".png"))]

        for file in main_files:
            name, ext = os.path.splitext(file)
            thumb_file = f"{name}-thumb{ext}"
            output.append({
                "thumb": f"photos/thumbs/{category}/{thumb_file}",
                "full": f"photos/{category}/{file}",
                "category": category,
                "alt": f"{category} {name}",
                "date": get_exif_date(os.path.join(category_path, file))
            })

        # Subfolders → subcategory
        for sub in os.listdir(category_path):
            sub_path = os.path.join(category_path, sub)
            if os.path.isdir(sub_path):
                sub_files = [f for f in os.listdir(sub_path) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
                for file in sub_files:
                    name, ext = os.path.splitext(file)
                    thumb_file = f"{name}-thumb{ext}"
                    output.append({
                        "thumb": f"photos/thumbs/{category}/{sub}/{thumb_file}",
                        "full": f"photos/{category}/{sub}/{file}",
                        "category": category,
                        "subcategory": sub,
                        "alt": f"{category} {sub} {name}",
                        "date": get_exif_date(os.path.join(sub_path, file))
                    })

with open("photos.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2)

print("✅ photos.json generated with subcategories and EXIF dates!")
