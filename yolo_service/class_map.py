# Mapping dari kelas YOLO (dataset Adithya - Fresh and Rotten Fruit Detection)
# ke field platform AromAI QC
#
# Dataset v1 (Roboflow): hanya 2 kelas — 'Fresh' dan 'Rotten'
# Dataset versi lain mungkin punya kelas spesifik per buah.

CLASS_MAP: dict[str, dict] = {
    # === Kelas generik dataset Adithya v1 ===
    "fresh":  {"object_class": "buah_segar",  "is_fresh": True},
    "rotten": {"object_class": "buah_busuk",  "is_fresh": False},
    # === FRESH (segar) — rot_level rendah ===
    "freshapple":      {"object_class": "apel",     "is_fresh": True},
    "freshbanana":     {"object_class": "pisang",   "is_fresh": True},
    "freshorange":     {"object_class": "jeruk",    "is_fresh": True},
    "freshtomato":     {"object_class": "tomat",    "is_fresh": True},
    "freshmango":      {"object_class": "mangga",   "is_fresh": True},
    "freshgrape":      {"object_class": "anggur",   "is_fresh": True},
    "freshstrawberry": {"object_class": "stroberi", "is_fresh": True},
    "freshwatermelon": {"object_class": "semangka", "is_fresh": True},
    "freshpapaya":     {"object_class": "pepaya",   "is_fresh": True},
    "freshguava":      {"object_class": "jambu",    "is_fresh": True},
    # Variasi dengan spasi / underscore
    "fresh apple":      {"object_class": "apel",   "is_fresh": True},
    "fresh banana":     {"object_class": "pisang", "is_fresh": True},
    "fresh orange":     {"object_class": "jeruk",  "is_fresh": True},
    "fresh tomato":     {"object_class": "tomat",  "is_fresh": True},
    "fresh_apple":      {"object_class": "apel",   "is_fresh": True},
    "fresh_banana":     {"object_class": "pisang", "is_fresh": True},
    "fresh_orange":     {"object_class": "jeruk",  "is_fresh": True},
    "fresh_tomato":     {"object_class": "tomat",  "is_fresh": True},

    # === ROTTEN (busuk) — rot_level tinggi ===
    "rottenapple":      {"object_class": "apel",     "is_fresh": False},
    "rottenbanana":     {"object_class": "pisang",   "is_fresh": False},
    "rottenorange":     {"object_class": "jeruk",    "is_fresh": False},
    "rottentomato":     {"object_class": "tomat",    "is_fresh": False},
    "rottenmango":      {"object_class": "mangga",   "is_fresh": False},
    "rottengrape":      {"object_class": "anggur",   "is_fresh": False},
    "rottenstrawberry": {"object_class": "stroberi", "is_fresh": False},
    "rottenwatermelon": {"object_class": "semangka", "is_fresh": False},
    "rottenpapaya":     {"object_class": "pepaya",   "is_fresh": False},
    "rottenguava":      {"object_class": "jambu",    "is_fresh": False},
    # Variasi
    "rotten apple":      {"object_class": "apel",   "is_fresh": False},
    "rotten banana":     {"object_class": "pisang", "is_fresh": False},
    "rotten orange":     {"object_class": "jeruk",  "is_fresh": False},
    "rotten tomato":     {"object_class": "tomat",  "is_fresh": False},
    "rotten_apple":      {"object_class": "apel",   "is_fresh": False},
    "rotten_banana":     {"object_class": "pisang", "is_fresh": False},
    "rotten_orange":     {"object_class": "jeruk",  "is_fresh": False},
    "rotten_tomato":     {"object_class": "tomat",  "is_fresh": False},
}


def resolve_class(yolo_class_name: str) -> dict:
    """Cari mapping dari nama kelas YOLO. Fallback: anggap segar, nama = yolo class."""
    key = yolo_class_name.lower().strip()
    if key in CLASS_MAP:
        return CLASS_MAP[key]
    # Coba tebak berdasarkan prefix
    if key.startswith("fresh") or key.startswith("segar"):
        fruit = key.replace("fresh", "").replace("segar", "").strip("_ ")
        return {"object_class": fruit or key, "is_fresh": True}
    if key.startswith("rotten") or key.startswith("busuk"):
        fruit = key.replace("rotten", "").replace("busuk", "").strip("_ ")
        return {"object_class": fruit or key, "is_fresh": False}
    return {"object_class": key, "is_fresh": True}
