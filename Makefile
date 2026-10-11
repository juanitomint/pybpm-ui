IMAGE_REPOSITORY  ?= juanitomint/pybpm-ui
CURRENT_DIR = $(shell pwd)
GIT_LAST_TAG=$(shell git tag --sort=committerdate | tail -n 1)
GIT_COMMIT=$(shell git rev-parse --short HEAD)

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: deps
deps: ## Install dependencies using npm
	npm install
.PHONY: dev
dev: deps ## Install dependencies and run the Next.js development server on :3000
	npm run dev

.PHONY: run
run: ## Run the Next.js development server on :3000 (proxies /api/* to pybpm-api)
	#@fuser -k 3000/tcp
	npm run dev

.PHONY: build
build: ## Build production bundle into .next/
	npm run build

.PHONY: start
start: ## Start Next.js production server on :3000
	npm start

.PHONY: lint
lint: ## Lint TypeScript/React source with ESLint (strict mode)
	npm run lint

.PHONY: format
format: ## Format source with Prettier
	npm run format

.PHONY: test-e2e
test-e2e: ## Run Playwright end-to-end tests against running dev server
	NODE_ENV=test npx playwright test

.PHONY: test-e2e-headed
test-e2e-headed: ## Run Playwright e2e tests with headed browser for debugging
	NODE_ENV=test npx playwright test --headed

.PHONY: report
report: ## Generate HTML Playwright report after test run
	npx playwright show-report

.PHONY: clean
clean: ## Remove node_modules and .next build artifacts
	rm -rf ./node_modules
	rm -rf ./.next
	rm -f ./.eslintcache

.PHONY: docker-build
docker-build: ## Build Next.js production image using latest as cache
	echo "building: ${IMAGE_REPOSITORY}:${IMAGE_TAG}"
	DOCKER_BUILDKIT=1 docker build \
		-t ${IMAGE_REPOSITORY}:latest \
		--build-arg IMAGE_TAG=${IMAGE_TAG} \
		.
	docker tag ${IMAGE_REPOSITORY}:latest ${IMAGE_REPOSITORY}:${IMAGE_TAG}

.PHONY: docker-push
docker-push: ## Push image to remote ${IMAGE_REPOSITORY}
	docker push ${IMAGE_REPOSITORY}:${IMAGE_TAG}
	docker push ${IMAGE_REPOSITORY}:latest

.PHONY: stop
stop: ## Stop admin container (if running via docker-compose)
	docker compose down ui 2>/dev/null || true

.PHONY: logs
logs: ## Show UI container logs in follow mode
	docker compose logs -f ui 2>/dev/null || echo "No 'ui' service found in docker-compose"

.PHONY: info
info: ## Print UI build info and status
	@echo "=== pybpm-ui ==="
	@echo "Image repository : $(IMAGE_REPOSITORY)"
	@echo "Last git tag     : $(GIT_LAST_TAG)"
	@echo "Git commit       : $(GIT_COMMIT)"
	@echo ""
	@echo "--- Container status ---"
	@docker ps --filter name=pybpm-ui --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true

.PHONY: printvars
printvars: ## Prints make variables
	$(foreach V, $(sort $(.VARIABLES)), \
	$(if $(filter-out environment% default automatic, $(origin $V)),$(warning $V=$($V) ($(value $V)))) \
	)
