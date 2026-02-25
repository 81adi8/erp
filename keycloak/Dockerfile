FROM quay.io/keycloak/keycloak:24.0

# Copy realm configuration
COPY realm-config/ /opt/keycloak/data/import/

# Build optimized image with postgres support
RUN /opt/keycloak/bin/kc.sh build --db=postgres --cache=local

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]

CMD ["start", "--optimized", "--import-realm", "--http-host=0.0.0.0"]