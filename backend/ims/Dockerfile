# IMS — Inventory Management Service (mirrors SIS Dockerfile pattern)
FROM maven:3.9.6-amazoncorretto-17 AS build
WORKDIR /workspace
COPY ../../pom.xml /workspace/pom.xml
COPY backend/common/pom.xml backend/common/pom.xml
COPY backend/ims/pom.xml backend/ims/pom.xml
RUN mvn -pl backend/common,backend/ims dependency:go-offline -q
COPY backend/common/src backend/common/src
COPY backend/ims/src backend/ims/src
RUN mvn -pl backend/common,backend/ims package -DskipTests -q
RUN java -Djarmode=layertools -jar backend/ims/target/ims-*.jar extract --destination /workspace/extracted

FROM amazoncorretto:17-alpine AS dev
WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
EXPOSE 8080 5005
ENTRYPOINT ["java", "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", \
  "org.springframework.boot.loader.launch.JarLauncher"]

FROM amazoncorretto:17-alpine AS prod
WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
EXPOSE 8080
RUN addgroup -S smartretail && adduser -S ims -G smartretail
USER ims
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
