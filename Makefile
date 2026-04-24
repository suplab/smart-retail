# SmartRetail Platform — Developer Makefile
# Usage: make <target>

.PHONY: help up down build test lint cdk-diff cdk-deploy-dev seed-local fmt

SHELL := /bin/bash
ROOT_DIR := $(shell pwd)
CDK_DIR  := $(ROOT_DIR)/infra/cdk
FE_DIR   := $(ROOT_DIR)/frontend
ENV      ?= dev

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'

# ─── Local stack ──────────────────────────────────────────────────────────────
up: ## Start full local stack (Docker Compose)
	docker compose up -d --build
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@make seed-local

down: ## Stop and remove containers
	docker compose down -v

logs: ## Tail all service logs
	docker compose logs -f

logs-sis: ## Tail SIS logs
	docker compose logs -f sis

logs-ims: ## Tail IMS logs
	docker compose logs -f ims

# ─── Build ────────────────────────────────────────────────────────────────────
build: ## Build all Maven modules
	./mvnw clean package -DskipTests

build-sis: ## Build SIS only
	./mvnw clean package -DskipTests -pl backend/sis -am

build-ims: ## Build IMS only
	./mvnw clean package -DskipTests -pl backend/ims -am

build-frontend: ## Build React SPA
	cd $(FE_DIR) && npm ci && npm run build

# ─── Test ─────────────────────────────────────────────────────────────────────
test: ## Run all tests (unit + integration)
	./mvnw verify

test-unit: ## Run unit tests only (fast)
	./mvnw test -Dgroups=unit

test-integration: ## Run integration tests (requires LocalStack)
	./mvnw verify -Dgroups=integration

test-frontend: ## Run frontend tests
	cd $(FE_DIR) && npm test

test-arch: ## Run ArchUnit hexagonal layer tests
	./mvnw test -Dtest="*ArchitectureTest"

coverage: ## Generate coverage report
	./mvnw verify && open backend/sis/target/site/jacoco/index.html

# ─── Code quality ─────────────────────────────────────────────────────────────
lint: ## Run Checkstyle + SpotBugs
	./mvnw checkstyle:check spotbugs:check

lint-frontend: ## Run ESLint on frontend
	cd $(FE_DIR) && npm run lint

fmt: ## Format Java code (google-java-format via Maven)
	./mvnw fmt:format

# ─── CDK ──────────────────────────────────────────────────────────────────────
cdk-install: ## Install CDK dependencies
	cd $(CDK_DIR) && npm ci

cdk-synth: ## Synthesise CDK stacks
	cd $(CDK_DIR) && npm run build && npx cdk synth --context env=$(ENV)

cdk-diff: ## Show CDK diff against deployed stacks
	cd $(CDK_DIR) && npm run build && npx cdk diff --context env=$(ENV)

cdk-deploy-dev: ## Deploy to dev environment
	cd $(CDK_DIR) && npm run build && npx cdk deploy --all --context env=dev --require-approval never

cdk-destroy-dev: ## Destroy dev stacks (DANGEROUS)
	@echo "WARNING: This will destroy all dev stacks. Press Ctrl+C to cancel."
	@sleep 5
	cd $(CDK_DIR) && npx cdk destroy --all --context env=dev --force

# ─── Local seed ───────────────────────────────────────────────────────────────
seed-local: ## Run LocalStack seed scripts
	bash scripts/localstack-init/01-create-resources.sh
	bash scripts/seed/02-seed-dynamo.sh
	@echo "Local stack seeded."

# ─── OpenAPI codegen ──────────────────────────────────────────────────────────
openapi-gen-fe: ## Generate TypeScript API client from spec
	cd $(FE_DIR) && npm run generate:api

openapi-lint: ## Lint OpenAPI spec with Spectral
	npx @stoplight/spectral-cli lint docs/openapi/smartretail-api.yaml

# ─── Utilities ────────────────────────────────────────────────────────────────
post-event: ## POST a synthetic POS event to Kinesis (local)
	bash scripts/send-test-pos-event.sh

check-health: ## Check health of all running services
	@for port in 8081 8082 8083 8084 8085; do \
		echo -n "Port $$port: "; \
		curl -s -o /dev/null -w "%{http_code}" http://localhost:$$port/actuator/health; \
		echo; \
	done
