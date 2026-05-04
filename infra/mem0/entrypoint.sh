#!/bin/sh
set -e

cd /app

# Swap NEXT_PUBLIC_* placeholders baked into .next/ at build time
# with the container's real env values
for var in $(env | grep '^NEXT_PUBLIC_' | cut -d'=' -f1); do
  val=$(printenv "$var")
  key="${var}"
  if [ "$val" != "$key" ]; then
    # Replace placeholder with actual value
    find .next/ -type f -exec sed -i "s|$key|$val|g" {} \;
  fi
done
echo "Done replacing NEXT_PUBLIC_ variables"

exec "$@"
