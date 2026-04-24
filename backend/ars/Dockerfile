# Dockerfile for ARS — Analytics & Reporting Lambda (local testing only)
# In production, ARS runs as an AWS Lambda function from a fat-JAR in S3.
# This image is used for local Lambda emulation via docker-compose and
# AWS Lambda Runtime Interface Emulator (RIE).

FROM maven:3.9.6-amazoncorretto-17 AS build
WORKDIR /workspace

COPY pom.xml /workspace/pom.xml
COPY backend/common/pom.xml backend/common/pom.xml
COPY backend/ars/pom.xml backend/ars/pom.xml
RUN mvn -pl backend/common,backend/ars dependency:go-offline -q

COPY backend/common/src backend/common/src
COPY backend/ars/src backend/ars/src
# Lambda fat-JAR built with maven-shade-plugin (no Spring Boot, no layertools)
RUN mvn -pl backend/common,backend/ars package -DskipTests -q

# Lambda Runtime Interface Emulator for local development
FROM public.ecr.aws/lambda/java:17 AS local
COPY --from=build /workspace/backend/ars/target/ars-*-shaded.jar ${LAMBDA_TASK_ROOT}/lib/handler.jar
CMD ["com.smartretail.ars.ArsHandler::handleRequest"]
