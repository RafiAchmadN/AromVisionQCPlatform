# Mapping dari kelas YOLO ke field platform AromVision QC
# Buah yang digunakan Sima Arome untuk ekstrak kosmetik & F&B

CLASS_MAP: dict[str, dict] = {
    # === Kelas generik (fresh/rotten tanpa nama buah) ===
    "fresh":  {"object_class": "buah_segar", "is_fresh": True},
    "rotten": {"object_class": "buah_busuk", "is_fresh": False},

    # === PISANG ===
    "freshbanana":  {"object_class": "pisang", "is_fresh": True},
    "rottenbanana": {"object_class": "pisang", "is_fresh": False},
    "fresh banana": {"object_class": "pisang", "is_fresh": True},
    "rotten banana":{"object_class": "pisang", "is_fresh": False},
    "fresh_banana": {"object_class": "pisang", "is_fresh": True},
    "rotten_banana":{"object_class": "pisang", "is_fresh": False},
    "banana":       {"object_class": "pisang", "is_fresh": True},

    # === APEL ===
    "freshapple":   {"object_class": "apel", "is_fresh": True},
    "rottenapple":  {"object_class": "apel", "is_fresh": False},
    "fresh apple":  {"object_class": "apel", "is_fresh": True},
    "rotten apple": {"object_class": "apel", "is_fresh": False},
    "fresh_apple":  {"object_class": "apel", "is_fresh": True},
    "rotten_apple": {"object_class": "apel", "is_fresh": False},
    "apple":        {"object_class": "apel", "is_fresh": True},

    # === BUAH NAGA (Dragon Fruit) ===
    "freshdragon":       {"object_class": "buah_naga", "is_fresh": True},
    "rottendragon":      {"object_class": "buah_naga", "is_fresh": False},
    "fresh dragon":      {"object_class": "buah_naga", "is_fresh": True},
    "rotten dragon":     {"object_class": "buah_naga", "is_fresh": False},
    "fresh dragonfruit": {"object_class": "buah_naga", "is_fresh": True},
    "rotten dragonfruit":{"object_class": "buah_naga", "is_fresh": False},
    "dragonfruit":       {"object_class": "buah_naga", "is_fresh": True},
    "dragon fruit":      {"object_class": "buah_naga", "is_fresh": True},
    "buah_naga":         {"object_class": "buah_naga", "is_fresh": True},

    # === DELIMA (Pomegranate) ===
    "freshpomegranate":   {"object_class": "delima", "is_fresh": True},
    "rottenpomegranate":  {"object_class": "delima", "is_fresh": False},
    "fresh pomegranate":  {"object_class": "delima", "is_fresh": True},
    "rotten pomegranate": {"object_class": "delima", "is_fresh": False},
    "pomegranate":        {"object_class": "delima", "is_fresh": True},
    "delima":             {"object_class": "delima", "is_fresh": True},

    # === JERUK (Orange) ===
    "freshorange":   {"object_class": "jeruk", "is_fresh": True},
    "rottenorange":  {"object_class": "jeruk", "is_fresh": False},
    "fresh orange":  {"object_class": "jeruk", "is_fresh": True},
    "rotten orange": {"object_class": "jeruk", "is_fresh": False},
    "fresh_orange":  {"object_class": "jeruk", "is_fresh": True},
    "rotten_orange": {"object_class": "jeruk", "is_fresh": False},
    "orange":        {"object_class": "jeruk", "is_fresh": True},

    # === ANGGUR (Grape) ===
    "freshgrape":   {"object_class": "anggur", "is_fresh": True},
    "rottengrape":  {"object_class": "anggur", "is_fresh": False},
    "fresh grape":  {"object_class": "anggur", "is_fresh": True},
    "rotten grape": {"object_class": "anggur", "is_fresh": False},
    "grape":        {"object_class": "anggur", "is_fresh": True},

    # === LEMON ===
    "freshlemon":   {"object_class": "lemon", "is_fresh": True},
    "rottenlemon":  {"object_class": "lemon", "is_fresh": False},
    "fresh lemon":  {"object_class": "lemon", "is_fresh": True},
    "rotten lemon": {"object_class": "lemon", "is_fresh": False},
    "lemon":        {"object_class": "lemon", "is_fresh": True},

    # === STROBERI (Strawberry) ===
    "freshstrawberry":   {"object_class": "stroberi", "is_fresh": True},
    "rottenstrawberry":  {"object_class": "stroberi", "is_fresh": False},
    "fresh strawberry":  {"object_class": "stroberi", "is_fresh": True},
    "rotten strawberry": {"object_class": "stroberi", "is_fresh": False},
    "strawberry":        {"object_class": "stroberi", "is_fresh": True},

    # === BOLAZAKAR ===
    "bolazakar":         {"object_class": "bolazakar", "is_fresh": True},
    "fresh bolazakar":   {"object_class": "bolazakar", "is_fresh": True},
    "rotten bolazakar":  {"object_class": "bolazakar", "is_fresh": False},

    # === LECI (Lychee) ===
    "freshlychee":   {"object_class": "leci", "is_fresh": True},
    "rottenlychee":  {"object_class": "leci", "is_fresh": False},
    "fresh lychee":  {"object_class": "leci", "is_fresh": True},
    "rotten lychee": {"object_class": "leci", "is_fresh": False},
    "lychee":        {"object_class": "leci", "is_fresh": True},
    "litchi":        {"object_class": "leci", "is_fresh": True},
    "leci":          {"object_class": "leci", "is_fresh": True},

    # === BLACKBERRY ===
    "freshblackberry":   {"object_class": "blackberry", "is_fresh": True},
    "rottenblackberry":  {"object_class": "blackberry", "is_fresh": False},
    "fresh blackberry":  {"object_class": "blackberry", "is_fresh": True},
    "rotten blackberry": {"object_class": "blackberry", "is_fresh": False},
    "blackberry":        {"object_class": "blackberry", "is_fresh": True},

    # === BILBERRY ===
    "freshbilberry":   {"object_class": "bilberry", "is_fresh": True},
    "rottenbilberry":  {"object_class": "bilberry", "is_fresh": False},
    "fresh bilberry":  {"object_class": "bilberry", "is_fresh": True},
    "rotten bilberry": {"object_class": "bilberry", "is_fresh": False},
    "bilberry":        {"object_class": "bilberry", "is_fresh": True},

    # === BUAH NANGKA (Jackfruit) ===
    "freshjackfruit":   {"object_class": "buah_nangka", "is_fresh": True},
    "rottenjackfruit":  {"object_class": "buah_nangka", "is_fresh": False},
    "fresh jackfruit":  {"object_class": "buah_nangka", "is_fresh": True},
    "rotten jackfruit": {"object_class": "buah_nangka", "is_fresh": False},
    "jackfruit":        {"object_class": "buah_nangka", "is_fresh": True},
    "buah_nangka":      {"object_class": "buah_nangka", "is_fresh": True},

    # === NANAS (Pineapple) ===
    "freshpineapple":   {"object_class": "nanas", "is_fresh": True},
    "rottenpineapple":  {"object_class": "nanas", "is_fresh": False},
    "fresh pineapple":  {"object_class": "nanas", "is_fresh": True},
    "rotten pineapple": {"object_class": "nanas", "is_fresh": False},
    "pineapple":        {"object_class": "nanas", "is_fresh": True},
    "nanas":            {"object_class": "nanas", "is_fresh": True},
}


# Mapping nama buah Indonesia ke nama kelas YOLO untuk fallback
_ID_TO_ENGLISH: dict[str, str] = {
    "pisang": "banana", "apel": "apple", "buah_naga": "dragonfruit",
    "delima": "pomegranate", "jeruk": "orange", "anggur": "grape",
    "lemon": "lemon", "stroberi": "strawberry", "bolazakar": "bolazakar",
    "leci": "lychee", "blackberry": "blackberry", "bilberry": "bilberry",
    "buah_nangka": "jackfruit", "nanas": "pineapple",
}


def resolve_class(yolo_class_name: str) -> dict:
    """Resolve nama kelas YOLO → metadata platform. Fallback: prefix fresh/rotten."""
    key = yolo_class_name.lower().strip().replace("-", " ").replace("_", " ")
    key_underscore = key.replace(" ", "_")

    # Direct lookup
    if key in CLASS_MAP:
        return CLASS_MAP[key]
    if key_underscore in CLASS_MAP:
        return CLASS_MAP[key_underscore]

    # Prefix-based fallback
    if key.startswith("fresh"):
        fruit = key.removeprefix("fresh").strip()
        return {"object_class": fruit or key, "is_fresh": True}
    if key.startswith("rotten"):
        fruit = key.removeprefix("rotten").strip()
        return {"object_class": fruit or key, "is_fresh": False}
    if key.startswith("segar"):
        fruit = key.removeprefix("segar").strip()
        return {"object_class": fruit or key, "is_fresh": True}
    if key.startswith("busuk"):
        fruit = key.removeprefix("busuk").strip()
        return {"object_class": fruit or key, "is_fresh": False}

    return {"object_class": key, "is_fresh": True}
