#!/bin/bash
# School ERP - Keycloak Startup Script

echo "Starting Keycloak for School ERP Platform..."
echo "==========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed or not in PATH"
    exit 1
fi

# Navigate to keycloak directory
cd "$(dirname "$0")"

echo "Building and starting Keycloak container..."
echo ""

# Start Keycloak using docker-compose
docker-compose up -d

echo ""
echo "Keycloak is starting..."
echo "This may take 1-2 minutes for the initial startup."
echo ""
echo "Access Keycloak Admin Console at: http://localhost:8080"
echo "Username: admin"
echo "Password: admin"
echo ""
echo "The School ERP realm will be automatically imported."
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"