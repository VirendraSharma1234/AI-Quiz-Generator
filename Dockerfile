FROM php:8.1-apache

# Install mysqli extension for MySQL database connections
RUN docker-php-ext-install mysqli && docker-php-ext-enable mysqli

# Copy project files to Apache webroot
COPY . /var/www/html/

# Expose standard Apache port
EXPOSE 80
