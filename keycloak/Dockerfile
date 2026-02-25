FROM quay.io/keycloak/keycloak:24.0

# Copy realm configuration
COPY realm-config/ /opt/keycloak/data/import/

# Copy startup script
COPY start.sh /opt/keycloak/start.sh

# Build optimized image with postgres support
RUN chmod +x /opt/keycloak/start.sh && \
    /opt/keycloak/bin/kc.sh build --db=postgres --cache=local

# Fallback defaults (overridden by Render env vars if set)
ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin123

EXPOSE 8080

ENTRYPOINT ["/bin/bash"]
CMD ["/opt/keycloak/start.sh"]