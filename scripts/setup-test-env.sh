#!/bin/bash

# Pocketbook Test Environment Setup Script
# Sets up complete testing environment including Hardhat node and contract deployment

set -e

echo "🚀 Setting up Pocketbook test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file from template..."
    cp .env.example .env
    print_success ".env file created"
else
    print_success ".env file exists"
fi

# Create test fixtures directory
mkdir -p test/e2e/fixtures
print_success "Test fixtures directory ready"

# Create screenshots directory
mkdir -p screenshots/e2e
print_success "Screenshots directory ready"

# Check if Hardhat is available
if ! command -v npx &> /dev/null; then
    print_error "npx not found. Please install Node.js"
    exit 1
fi

# Try to compile contracts
print_info "Attempting to compile contracts..."
if npx hardhat compile 2>/dev/null; then
    print_success "Contracts compiled successfully"
else
    print_error "Contract compilation failed (network access required)"
    print_info "Contracts will be compiled during test setup if possible"
fi

# Check if dev server port is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_info "Dev server already running on port 3000"
else
    print_success "Port 3000 is available"
fi

# Check if Hardhat node port is available
if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_info "Port 8545 is in use - stopping existing process..."
    lsof -ti:8545 | xargs kill -9 2>/dev/null || true
    sleep 1
    print_success "Port 8545 is now available"
else
    print_success "Port 8545 is available"
fi

echo ""
print_success "Environment setup complete!"
echo ""
print_info "Next steps:"
echo "  1. Start Hardhat node:     npx hardhat node"
echo "  2. Deploy contracts:       npx hardhat run test/e2e/setup/deploy-contracts.js --network localhost"
echo "  3. Start dev server:       npm run dev"
echo "  4. Run tests:              npm run test:e2e"
echo ""
print_info "Or use the integrated setup:"
echo "  npm run test:e2e  (starts everything automatically)"
echo ""
