# Multi-stage Dockerfile for SIS — Sales Ingestion Service
# Uses layered Spring Boot JAR for optimised image caching
# Target: dev  → includes debug agent
# Target: prod → minimal JRE image, no shell tools

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM maven:3.9.6-amazoncorretto-17 AS build
WORKDIR /workspace

# Cache dependency layer — only invalidated when POM changes
COPY ../../pom.xml /workspace/pom.xml
COPY backend/common/pom.xml backend/common/pom.xml
COPY backend/sis/pom.xml backend/sis/pom.xml
RUN mvn -pl backend/common,backend/sis dependency:go-offline -q

# Build
COPY backend/common/src backend/common/src
COPY backend/sis/src backend/sis/src
RUN mvn -pl backend/common,backend/sis package -DskipTests -q

# Extract Spring Boot layers
RUN java -Djarmode=layertools -jar backend/sis/target/sis-*.jar extract --destination /workspace/extracted

# ── Stage 2: Dev runtime (with JDWP debug port) ─────────────────────────────
FROM amazoncorretto:17-alpine AS dev
WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
EXPOSE 8080 5005
ENTRYPOINT ["java", \
  "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", \
  "org.springframework.boot.loader.launch.JarLauncher"]

# ── Stage 3: Production runtime ─────────────────────────────────────────────
FROM amazoncorretto:17-alpine AS prod
WORKDIR /app
# OpenTelemetry Java agent injected via JAVA_TOOL_OPTIONS in ECS task definition (ADR-007)
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
EXPOSE 8080
# Run as non-root user
RUN addgroup -S smartretail && adduser -S sis -G smartretail
USER sis
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
