# Test store only: Mage-OS (open-source Magento 2 distribution, same REST API), PHP built-in server.
FROM php:8.3-cli
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN apt-get update && apt-get install -y --no-install-recommends git unzip default-mysql-client && rm -rf /var/lib/apt/lists/* \
 && install-php-extensions bcmath gd intl pdo_mysql soap sockets xsl zip ftp opcache @composer
RUN echo "memory_limit=-1" > /usr/local/etc/php/conf.d/mem.ini
WORKDIR /app
RUN composer create-project --no-interaction --repository-url=https://repo.mage-os.org/ mage-os/project-community-edition /app
EXPOSE 8080
