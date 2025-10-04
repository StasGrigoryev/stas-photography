import os, json, re
from PIL import Image, ExifTags
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
                date_raw = value.split(" ")[0]
                date_obj = datetime.strptime(date_raw, "%Y:%m:%d")
                return date_obj.strftime("%d-%m-%Y")
    except Exception as e:
        print(f"⚠️ No EXIF date for {filepath}: {e}")
    return None

base_dir = "photos"
thumbs_dir = os.path.join(base_dir, "thumbs")

data = {
    "categories": {},
    "photos": []
}

# Define the order manually for main categories
main_category_order = {
    "kazan": 1,
    "moscow": 2,
    "peterburg": 3,
    "other": 4
}


for category in os.listdir(base_dir):
    category_path = os.path.join(base_dir, category)
    if os.path.isdir(category_path) and category != "thumbs":
        # Main category description
        desc_file = os.path.join(category_path, "description.txt")
        main_desc = open(desc_file, "r", encoding="utf-8").read().strip() if os.path.exists(desc_file) else ""
        data["categories"][category] = {
            "description": main_desc,
            "order": main_category_order.get(category, 999),  # default last
            "subcategories": {}
        }

        # Main category photos
        main_files = [f for f in os.listdir(category_path) if os.path.isfile(os.path.join(category_path, f)) and f.lower().endswith((".jpg", ".jpeg", ".png"))]
        main_files.sort(key=natural_sort_key)
        for file in main_files:
            name, ext = os.path.splitext(file)
            thumb_file = f"{name}-thumb{ext}"
            data["photos"].append({
                "thumb": f"photos/thumbs/{category}/{thumb_file}",
                "full": f"photos/{category}/{file}",
                "category": category,
                "subcategory": None,
                "alt": f"{category} {name}",
                "date": get_exif_date(os.path.join(category_path, file))
            })

        # Subcategories
        for sub in os.listdir(category_path):
            sub_path = os.path.join(category_path, sub)
            if os.path.isdir(sub_path):
                # Subcategory description
                sub_desc_file = os.path.join(sub_path, "description.txt")
                sub_desc = open(sub_desc_file, "r", encoding="utf-8").read().strip() if os.path.exists(sub_desc_file) else ""
                data["categories"][category]["subcategories"][sub] = {"description": sub_desc}

                sub_files = [f for f in os.listdir(sub_path) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
                sub_files.sort(key=natural_sort_key)
                for file in sub_files:
                    name, ext = os.path.splitext(file)
                    thumb_file = f"{name}-thumb{ext}"
                    data["photos"].append({
                        "thumb": f"photos/thumbs/{category}/{sub}/{thumb_file}",
                        "full": f"photos/{category}/{sub}/{file}",
                        "category": category,
                        "subcategory": sub,
                        "alt": f"{category} {sub} {name}",
                        "date": get_exif_date(os.path.join(sub_path, file))
                    })

# Save single JSON
with open("photos_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✅ photos_data.json generated with main & subcategory descriptions and EXIF dates!")
