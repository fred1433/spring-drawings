# The image step on a Magento test store

`testbed/` builds a local store: Mage-OS 3.5.0 (open-source Magento distribution, based on Magento 2.4.9),
MariaDB 11.4, OpenSearch 2.19, PHP 8.3 built-in server. Test data only, bound to 127.0.0.1.

```
cd magento/testbed
docker compose build && docker compose up -d
docker compose cp install.sh shop:/install.sh && docker compose exec shop sh /install.sh
docker compose exec shop php bin/magento module:disable Magento_TwoFactorAuth   # test store only, for an API token
docker compose exec shop php bin/magento setup:upgrade --keep-generated
cd ../.. && npm run magento:live
# the storefront shows stock after the MSI index runs:
(cd magento/testbed && docker compose exec shop sh -c 'php bin/magento indexer:reindex && php bin/magento cache:flush')
```

`live-check.mjs` refuses any store that is not on localhost. What it checked on 2026-09-30
(`live-check-result.json`):

- classification: two SKUs sharing one placeholder file are "shared-image", one without media is "no-image";
- an SVG posted to the product gallery is refused (HTTP 400, "The image content must be valid base64
  encoded data."), so the SVG stays the master and the PNG made from it is what gets uploaded;
- the PNG is attached with the image, small_image and thumbnail roles and shows on the storefront product page;
- a rerun with the same image adds nothing; a corrected value replaces only the managed file, the placeholder stays;
- rollback removes the managed file and gives the placeholder its roles back;
- the script ends by attaching the image again, so the published state can be looked at (page capture on the demo page).

Endpoints: `GET /rest/V1/products/{sku}/media`, `POST /rest/V1/products/{sku}/media`,
`PUT` and `DELETE /rest/V1/products/{sku}/media/{entryId}`.
