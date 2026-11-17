#!/bin/sh
set -e

# Make sure the public disk link exists (profile photos)
php artisan storage:link --force || true

# Create / update database tables
php artisan migrate --force

# Cache config, routes and views for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Render provides $PORT (default 10000)
exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
