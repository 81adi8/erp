FROM quay.io/keycloak/keycloak:24.0

# Copy realm configuration
COPY keycloak/realm-config/ /opt/keycloak/data/import/

# Build optimized image first
RUN /opt/keycloak/bin/kc.sh build

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]

CMD ["start-dev", "--import-realm"]