#!/bin/bash

# Comprehensive Test Runner for Pocketbook
# Handles setup, execution, and cleanup of E2E tests

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

# Cleanup function
cleanup() {
    print_info "Cleaning up..."
    
    # Kill Hardhat node if running
    if [ -f ".hardhat-node.pid" ]; then
        pid=$(cat .hardhat-node.pid)
        kill -9 $pid 2>/dev/null || true
        rm .hardhat-node.pid
    fi
    
    # Kill any process on port 8545
    lsof -ti:8545 | xargs kill -9 2>/dev/null || true
    
    print_success "Cleanup complete"
}

# Set up trap to cleanup on exit
trap cleanup EXIT INT TERM

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pocketbook E2E Test Runner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if using simple mode (no Hardhat)
SIMPLE_MODE=${SIMPLE_MODE:-false}
TEST_ARGS=()

# Parse arguments
for arg in "$@"; do
    if [ "$arg" == "--simple" ]; then
        SIMPLE_MODE=true
    else
        TEST_ARGS+=("$arg")
    fi
done

if [ "$SIMPLE_MODE" == "true" ]; then
    print_info "Running in SIMPLE mode (no Hardhat setup)"
    print_info "Using existing dev server and mock wallet"
    echo ""
    
    # Just run tests with simple config
    npx playwright test --config=playwright.config.simple.js "${TEST_ARGS[@]}"
    exit_code=$?
    
    echo ""
    if [ $exit_code -eq 0 ]; then
        print_success "Tests completed successfully!"
    else
        print_error "Tests failed with exit code $exit_code"
    fi
    
    exit $exit_code
fi

# Full mode with Hardhat
print_info "Running in FULL mode (with Hardhat setup)"
echo ""

# Step 1: Environment setup
print_info "Step 1/4: Setting up environment..."
bash scripts/setup-test-env.sh > /dev/null 2>&1 || true
print_success "Environment ready"

# Step 2: Check if Hardhat node is needed
if [ ! -f "test/e2e/fixtures/deployment.json" ]; then
    print_info "Step 2/4: Starting Hardhat node..."
    npx hardhat node > /tmp/hardhat-node.log 2>&1 &
    HARDHAT_PID=$!
    echo $HARDHAT_PID > .hardhat-node.pid
    
    # Wait for Hardhat to be ready
    print_info "Waiting for Hardhat node to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8545 > /dev/null 2>&1; then
            print_success "Hardhat node started (PID: $HARDHAT_PID)"
            break
        fi
        sleep 1
    done
    
    # Step 3: Deploy contracts
    print_info "Step 3/4: Deploying test contracts..."
    npx hardhat run test/e2e/setup/deploy-contracts.js --network localhost
    print_success "Contracts deployed"
else
    print_info "Step 2/4: Using existing Hardhat deployment"
    print_info "Step 3/4: Contracts already deployed"
fi

# Step 4: Run tests
print_info "Step 4/4: Running Playwright tests..."
echo ""

npx playwright test "${TEST_ARGS[@]}"
exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    print_success "All tests passed!"
    print_info "View report: npm run test:e2e:report"
else
    print_error "Some tests failed"
    print_info "View report: npm run test:e2e:report"
fi

exit $exit_code
