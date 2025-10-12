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


def parse_category_file(filepath):
    """Parse _category.txt to get category description and photo descriptions."""
    if not os.path.exists(filepath):
        return "", {}

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read().strip()

    cat_desc = ""
    photo_descs = {}

    # Split by headers
    sections = re.split(r"#(CATEGORY|PHOTOS)\s*", content)
    for i in range(1, len(sections), 2):
        header = sections[i].strip().upper()
        body = sections[i+1].strip()
        if header == "CATEGORY":
            cat_desc = body
        elif header == "PHOTOS":
            for line in body.splitlines():
                if "|" in line:
                    filename, desc = line.split("|", 1)
                    photo_descs[filename.strip()] = desc.strip()
    return cat_desc, photo_descs


base_dir = "photos"
thumbs_dir = os.path.join(base_dir, "thumbs")

data = {
    "categories": {},
    "photos": []
}

# Define manual order
main_category_order = {
    "kazan": 1,
    "moscow": 2,
    "peterburg": 3,
    "other": 4
}


for category in os.listdir(base_dir):
    category_path = os.path.join(base_dir, category)
    if os.path.isdir(category_path) and category != "thumbs":
        category_file = os.path.join(category_path, "_category.txt")
        main_desc, photo_descs = parse_category_file(category_file)

        data["categories"][category] = {
            "description": main_desc,
            "order": main_category_order.get(category, 999),
            "subcategories": {}
        }

        # Main category photos
        main_files = [
            f for f in os.listdir(category_path)
            if os.path.isfile(os.path.join(category_path, f)) and f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        main_files.sort(key=natural_sort_key)
        for file in main_files:
            name, ext = os.path.splitext(file)
            thumb_file = f"{name}-thumb{ext}"
            desc = photo_descs.get(file, "")
            data["photos"].append({
                "thumb": f"photos/thumbs/{category}/{thumb_file}",
                "full": f"photos/{category}/{file}",
                "category": category,
                "subcategory": None,
                "alt": desc or f"{category} {name}",
                "description": desc,
                "date": get_exif_date(os.path.join(category_path, file))
            })

        # Subcategories
        for sub in os.listdir(category_path):
            sub_path = os.path.join(category_path, sub)
            if os.path.isdir(sub_path):
                sub_file = os.path.join(sub_path, "_category.txt")
                sub_desc, sub_photo_descs = parse_category_file(sub_file)
                data["categories"][category]["subcategories"][sub] = {"description": sub_desc}

                sub_files = [
                    f for f in os.listdir(sub_path)
                    if f.lower().endswith((".jpg", ".jpeg", ".png"))
                ]
                sub_files.sort(key=natural_sort_key)
                for file in sub_files:
                    name, ext = os.path.splitext(file)
                    thumb_file = f"{name}-thumb{ext}"
                    desc = sub_photo_descs.get(file, "")
                    data["photos"].append({
                        "thumb": f"photos/thumbs/{category}/{sub}/{thumb_file}",
                        "full": f"photos/{category}/{sub}/{file}",
                        "category": category,
                        "subcategory": sub,
                        "alt": desc or f"{category} {sub} {name}",
                        "desc": desc,
                        "date": get_exif_date(os.path.join(sub_path, file))
                    })

# Save JSON
with open("photos_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✅ photos_data.json generated with category + photo descriptions and EXIF dates!")
