# spring-drawings

Line drawings of compression springs, generated from the attributes of their product sheets.
For each reference, two files from the same record: a dimensioned specification drawing (SVG) and a
clean catalog image (PNG, same framing for the whole family). No AI in the drawing, no network call.

`data/springs.json` holds 120 records read on vanel.tech on 2026-09-30 (60 compression, 30 extension,
30 torsion), each with the URL it was read from. Only the attributes a drawing needs are kept.

## Run it

```
npm install
npm test               # geometry, provenance, routing, image step (in-memory Magento)
npm run render         # svg/<sku>.svg, svg/<sku>.catalog.svg, svg/<sku>.sources.json, svg/routing.json
npm run png            # png/<sku>.png, 800 x 800, what gets uploaded to the store
```

Node 20 or later.

## Where every line comes from

- Every printed dimension is a value read on the sheet, printed as read (tested on every record).
- Helix on the mean diameter, OD minus wire.
- Coil count convention, established on the sheets read: on every complete compression record,
  free length = (coils - 2) x pitch + 2 x wire. Coils are therefore counted as total, one closed coil at
  each end, and the drawn spring spans the free length exactly (tested).
- Ends: read from the block length, (coils + 0.5) x wire when ground, (coils + 1.5) x wire when not;
  every block length on the sheets fits one of the two (tested). The template draws ground ends only: the
  sheets give the same free-length relation for unground springs, which does not close physically, so the
  18 unground records are held back until that convention is settled. The drawn pitch equals the pitch of the
  sheet within its rounding (tested). Ends are drawn schematically.
- Winding sense is not on the sheet: drawn right-hand, and `sources.json` says so.
- Length at max load is another state of the spring: it is a note, never drawn on the free silhouette.
- A visitor who changes a value gets a hypothetical variant: changed values in ochre, the inside
  diameter becomes "calculated", the max-load note disappears, the SVG downloads as `-variant`, the catalog
  PNG only for the sheet values. Reading Magento attributes automatically is not connected here.

## Routing

`route()` sends each record to one of: drawn (40); held back (an essential value missing from what was read,
2 records, or unground ends, 18); review (a record that fails a consistency check: pitch, block length, ID =
OD - 2 x wire); other family (extension and torsion springs have no template yet, nothing is drawn for them).
"Drawn" means drawable with this template, not validated mechanically.

## Magento

`magento/client.mjs`: classify what needs an image (none, or only a family image shared by many SKUs),
attach the PNG to the right SKU with the image roles, rerun without duplicate (a disabled or role-less copy
is repaired), replace only the file the pipeline manages (the new file is uploaded and checked before the old
one is removed), roll back. Checked end to end on a local test store, see `magento/README.md`.

## What this does not prove

Extension and torsion springs, converting CAD or STEP files, running on a live store, decoding Magento
option values (here the category path stands in as the source).
