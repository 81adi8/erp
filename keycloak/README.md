# School ERP - Keycloak Authentication Server

This directory contains the Keycloak configuration for the School ERP platform, providing secure authentication and authorization services.

## Overview

Keycloak is configured specifically for the School ERP system with:
- Pre-configured realms for the School ERP platform
- Client applications set up for the frontend
- User roles for different user types (admin, teacher, student, parent)
- Secure authentication flows

## Prerequisites

- Docker and Docker Compose
- Internet access to pull the Keycloak image

## Quick Start

### Using Docker Compose (Recommended)

1. Navigate to the keycloak directory:
   ```bash
   cd keycloak
   ```

2. Start Keycloak:
   ```bash
   docker-compose up -d
   ```

3. Access Keycloak Admin Console:
   - URL: `http://localhost:8080`
   - Username: `admin`
   - Password: `admin`

4. The School ERP realm will be automatically imported

### Using Docker

1. Build the image:
   ```bash
   docker build -t school-erp-keycloak .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name school-erp-keycloak \
     -p 8080:8080 \
     -e KEYCLOAK_ADMIN=admin \
     -e KEYCLOAK_ADMIN_PASSWORD=admin \
     school-erp-keycloak
   ```

## Configuration Details

### Realm Configuration
- Realm Name: `school-erp`
- Display Name: `School ERP Platform`
- Pre-configured roles:
  - `admin`: Administrator role
  - `teacher`: Teacher role
  - `student`: Student role
  - `parent`: Parent role

### Client Configuration
- Client ID: `school-app`
- Public client (no client secret required)
- Redirect URIs: `http://localhost:5173/*`, `http://localhost:3000/*`
- Web origins: `http://localhost:5173`, `+`

### Accessing Keycloak

1. **Admin Console**: `http://localhost:8080`
   - Path: `/admin`
   - Credentials: admin/admin

2. **Account Console**: `http://localhost:8080`
   - Path: `/realms/school-erp/account`

## Integration with School ERP

### Frontend Integration
The frontend application is configured to use Keycloak for authentication. Make sure your frontend `.env` file has the correct Keycloak configuration:

```
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=school-erp
KEYCLOAK_CLIENT_ID=school-app
```

### Backend Integration
The backend server should be configured to validate JWT tokens issued by Keycloak.

## Security Notes

- Change default admin credentials in production
- Use HTTPS in production environments
- Regularly update Keycloak to the latest version
- Review and customize security policies as needed

## Troubleshooting

### Container Won't Start
- Ensure port 8080 is available
- Check logs with `docker logs school-erp-keycloak`

### Realm Not Imported
- Verify that realm-config files are correctly placed
- Check Keycloak logs for import errors

### Health Check Fails
- Wait for initial startup (up to 2 minutes)
- Check that the realm was properly imported

## Stopping Keycloak

To stop the Keycloak container:
```bash
docker-compose down
```

To stop and remove containers, networks, and volumes:
```bash
docker-compose down -v
```

## Updating Configuration

To update the realm configuration:
1. Modify the JSON file in `realm-config/`
2. Restart the Keycloak container
3. The realm will be re-imported on startup

---

For more information about Keycloak, visit [https://www.keycloak.org](https://www.keycloak.org)