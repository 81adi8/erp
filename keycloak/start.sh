#!/bin/bash
# Ensure admin credentials are set
export KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
export KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin123}"

echo "Starting Keycloak with admin user: $KEYCLOAK_ADMIN"

# Start Keycloak
exec /opt/keycloak/bin/kc.sh start --optimized --import-realm --http-host=0.0.0.0
