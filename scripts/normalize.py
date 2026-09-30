"""Build data/springs.json from pages read on the catalog.

Usage: python3 scripts/normalize.py <lists.json> <products.json>

The raw captures are not in this repository: they hold prices, stock and internal
identifiers that the drawings do not need. Only the attributes a drawing uses are kept,
each record with the URL it was read from and the date.
"""
import json
import sys

KEEP = {
    "Wire Diam. (mm)": "d",
    "Ext. Diam. (mm)": "od",
    "Internal Diameter (mm)": "id",
    "Nr of Coils": "coils",
    "Free Len. (mm)": "freeLength",
    "Pitch (mm)": "pitch",
    "Block Length(mm)": "blockLength",
    "Length @max load (mm)": "lengthAtMaxLoad",
    "Grinding": "grinding",
    "Leg Length (mm)": "legLength",
    "Leg position (°)": "legPosition",
    "Hook Position": "hookPosition",
    "Hooks": "hooks",
    "Rotation": "rotation",
    "Material": "material",
}


def family_of(path):
    p = [x.lower() for x in path]
    if "compression" in p:
        return "compression"
    if "tension springs" in p or "extension springs" in p:
        return "extension"
    if "torsion" in p:
        return "torsion"
    return None


def clean(v):
    if v is None:
        return None
    v = v.strip()
    return None if v in ("", "---") else v


def main(lists_path, products_path):
    lists = json.load(open(lists_path))
    products = {p["url"]: p for p in json.load(open(products_path))}
    out = []
    for page in lists:
        path = [c.strip() for c in page["breadcrumb"] if c.strip() and c.strip() != "Home"]
        url_parts = page["url"].split("/springs/")[1].split("/")
        fam = family_of(path)
        for it in page["items"]:
            row = dict(zip(page["hdr"], it["cells"]))
            rec = {
                "sku": row["SKU"],
                "family": fam,
                "categoryPath": path,
                "categoryUrl": page["url"],
                "productUrl": it["href"],
                "readAt": page["readAt"][:10],
                "attrs": {},
            }
            # hook type and winding sense come from the category path, never from a coded field
            slug = "/".join(url_parts).lower()
            if fam == "extension":
                rec["hookType"] = "german" if "german-hooks" in slug else ("english" if "english-hooks" in slug else None)
            if fam == "torsion":
                rec["windingFromCategory"] = "right" if "right-rotation" in slug else ("left" if "left-rotation" in slug else None)
            for k, v in row.items():
                if k in KEEP:
                    rec["attrs"][KEEP[k]] = clean(v)
            prod = products.get(it["href"]) if it["href"] else None
            rec["productPageRead"] = bool(prod and prod.get("specs"))
            if prod:
                specs = {k: v for k, v in prod["specs"] if k}
                for k, v in specs.items():
                    if k in KEEP and rec["attrs"].get(KEEP[k]) is None:
                        rec["attrs"][KEEP[k]] = clean(v)
                rec["productReadAt"] = prod["readAt"][:10]
                if prod.get("gallery"):
                    main = next((g for g in prod["gallery"] if g.get("isMain")), prod["gallery"][0])
                    rec["currentImage"] = {
                        "file": main["full"].split("/")[-1],
                        "url": main["full"],
                        "readAt": prod["readAt"][:10],
                    }
            out.append(rec)
    out.sort(key=lambda r: (r["family"], r["sku"]))
    json.dump(out, open("data/springs.json", "w"), indent=1, ensure_ascii=False)
    print(len(out), "records")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
