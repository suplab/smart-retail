# Multi-stage Dockerfile for DFS — Demand Forecasting Service
# DFS uses more memory than other services (SageMaker SDK, ML data processing)
# ECS task definition allocates 1024 CPU / 2048 MB for this reason.

FROM maven:3.9.6-amazoncorretto-17 AS build
WORKDIR /workspace

COPY pom.xml /workspace/pom.xml
COPY backend/common/pom.xml backend/common/pom.xml
COPY backend/dfs/pom.xml backend/dfs/pom.xml
RUN mvn -pl backend/common,backend/dfs dependency:go-offline -q

COPY backend/common/src backend/common/src
COPY backend/dfs/src backend/dfs/src
RUN mvn -pl backend/common,backend/dfs package -DskipTests -q

RUN java -Djarmode=layertools -jar backend/dfs/target/dfs-*.jar extract --destination /workspace/extracted

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

FROM amazoncorretto:17-alpine AS prod
WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
EXPOSE 8080
RUN addgroup -S smartretail && adduser -S dfs -G smartretail
USER dfs
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
