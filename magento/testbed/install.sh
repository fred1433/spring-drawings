#!/bin/sh
# Installs the local test store once the containers are up. Test credentials only, local only.
set -e
cd /app
until mysqladmin ping -h db -umagento -pmagento --silent; do sleep 2; done
until curl -s http://search:9200 >/dev/null; do sleep 2; done
php bin/magento setup:install \
  --base-url=http://127.0.0.1:8088/ --db-host=db --db-name=magento --db-user=magento --db-password=magento \
  --admin-firstname=Test --admin-lastname=Store --admin-email=test@example.com --admin-user=testadmin --admin-password=testadmin123 \
  --language=en_US --currency=EUR --timezone=Europe/Paris --use-rewrites=1 \
  --search-engine=opensearch --opensearch-host=search --opensearch-port=9200 --backend-frontname=admin
php bin/magento module:disable Magento_AdminAdobeImsTwoFactorAuth Magento_TwoFactorAuth || true
php bin/magento setup:upgrade --keep-generated
php bin/magento deploy:mode:set developer || true
php bin/magento cache:flush
echo INSTALL_DONE
