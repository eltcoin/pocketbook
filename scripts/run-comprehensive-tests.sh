#!/bin/bash

###############################################################################
# Comprehensive Test Runner for Pocketbook
#
# This script runs the complete test suite including:
# 1. Contract compilation
# 2. Hardhat node setup
# 3. Contract deployment
# 4. User network configuration
# 5. E2E test execution
# 6. Report generation
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     Pocketbook Comprehensive Test Suite Runner            ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
  
  # Kill Hardhat node if running
  if [ -f .hardhat-node.pid ]; then
    PID=$(cat .hardhat-node.pid)
    if ps -p $PID > /dev/null 2>&1; then
      echo "  Stopping Hardhat node (PID: $PID)"
      kill $PID 2>/dev/null || true
      sleep 2
    fi
    rm -f .hardhat-node.pid
  fi
  
  # Kill dev server if running
  if [ -f .vite-server.pid ]; then
    PID=$(cat .vite-server.pid)
    if ps -p $PID > /dev/null 2>&1; then
      echo "  Stopping Vite dev server (PID: $PID)"
      kill $PID 2>/dev/null || true
      sleep 2
    fi
    rm -f .vite-server.pid
  fi
  
  echo -e "${GREEN}  ✓ Cleanup complete${NC}"
}

# Register cleanup on exit
trap cleanup EXIT INT TERM

# Step 1: Install dependencies (if needed)
echo -e "${BLUE}📦 Step 1: Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
  echo "  Installing npm packages..."
  npm install
else
  echo -e "${GREEN}  ✓ Dependencies already installed${NC}"
fi

# Step 2: Compile contracts
echo -e "\n${BLUE}🔨 Step 2: Compiling smart contracts...${NC}"
npx hardhat compile
echo -e "${GREEN}  ✓ Contracts compiled${NC}"

# Step 3: Start Hardhat node
echo -e "\n${BLUE}🚀 Step 3: Starting Hardhat local node...${NC}"
npx hardhat node > /tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
echo $HARDHAT_PID > .hardhat-node.pid
echo "  Hardhat node PID: $HARDHAT_PID"

# Wait for Hardhat to start
echo "  Waiting for Hardhat node to be ready..."
for i in {1..30}; do
  if grep -q "Started HTTP and WebSocket JSON-RPC server" /tmp/hardhat.log 2>/dev/null; then
    echo -e "${GREEN}  ✓ Hardhat node is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}  ✗ Hardhat node failed to start${NC}"
    cat /tmp/hardhat.log
    exit 1
  fi
  sleep 1
done

# Step 4: Deploy contracts
echo -e "\n${BLUE}🚢 Step 4: Deploying contracts to local network...${NC}"
npx hardhat run test/e2e/setup/deploy-contracts.cjs --network localhost
echo -e "${GREEN}  ✓ Contracts deployed${NC}"

# Step 5: Setup user network
echo -e "\n${BLUE}👥 Step 5: Configuring test user network...${NC}"
npx hardhat run test/e2e/setup/setup-user-network.cjs --network localhost
echo -e "${GREEN}  ✓ User network configured${NC}"

# Step 6: Start dev server
echo -e "\n${BLUE}🌐 Step 6: Starting Vite dev server...${NC}"
npm run dev > /tmp/vite.log 2>&1 &
VITE_PID=$!
echo $VITE_PID > .vite-server.pid
echo "  Vite server PID: $VITE_PID"

# Wait for Vite to start
echo "  Waiting for dev server to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Dev server is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}  ✗ Dev server failed to start${NC}"
    cat /tmp/vite.log
    exit 1
  fi
  sleep 1
done

# Step 7: Run E2E tests
echo -e "\n${BLUE}🧪 Step 7: Running E2E test suite...${NC}"
echo "  This may take several minutes..."

# Run Playwright tests with explicit output paths
if npx playwright test --reporter=list --reporter=json --reporter=html; then
  echo -e "${GREEN}  ✓ Tests completed${NC}"
  TEST_STATUS="passed"
else
  echo -e "${YELLOW}  ⚠ Some tests may have failed${NC}"
  TEST_STATUS="completed_with_errors"
fi

# Step 8: Generate reports
echo -e "\n${BLUE}📊 Step 8: Generating test reports...${NC}"
node test/e2e/helpers/generate-report.cjs
echo -e "${GREEN}  ✓ Reports generated${NC}"

# Step 9: Display summary
echo -e "\n${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   Test Run Summary                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "Status: ${GREEN}${TEST_STATUS}${NC}"
echo ""
echo "📁 Generated Artifacts:"
echo "  - HTML Report: test_results/test-report.html"
echo "  - Markdown Report: test_results/test-report.md"
echo "  - Playwright Report: playwright-report/index.html"
echo "  - Screenshots: screenshots/e2e/*.png"
echo "  - Test Results: test-results/*.json"
echo ""

if [ "$TEST_STATUS" = "passed" ]; then
  echo -e "${GREEN}✨ All tests completed successfully!${NC}"
else
  echo -e "${YELLOW}⚠️  Test run completed with some issues. Check reports for details.${NC}"
fi

echo ""
echo "To view the HTML report, run:"
echo "  open test_results/test-report.html"
echo ""
echo "To view the Playwright report, run:"
echo "  npm run test:e2e:report"
echo ""

exit 0
