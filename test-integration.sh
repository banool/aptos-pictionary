#!/bin/bash

echo "=== Aptos Pictionary Integration Testing ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if contract is deployed
print_step "Checking Contract Deployment"

ACCOUNT="0xe38d50adbc666054d6860519e9870cbcb0b8949195e606511a99798c2ada1db2"

cd contract
echo "Checking if contract module is deployed..."
# Check if the module exists by trying to view its functions
if aptos account list --account ${ACCOUNT} --query modules 2>/dev/null | grep -q "pictionary"; then
    print_success "Account has pictionary module deployed"
else
    print_warning "Account not found or no modules deployed yet"
fi
cd ..

# Test frontend start
print_step "Testing Frontend Startup"

echo "Starting development server for 10 seconds..."
timeout 10s npm run dev > /dev/null 2>&1 &
DEV_PID=$!

sleep 5

if kill -0 $DEV_PID 2>/dev/null; then
    print_success "Frontend development server starts successfully"
    kill $DEV_PID 2>/dev/null
else
    print_error "Frontend development server failed to start"
fi

# Check for common integration issues
print_step "Checking Integration Configuration"

echo "Checking if contract address is properly configured in frontend files..."

# Check if the constant is defined
if grep -q "MODULE_ADDRESS.*0xe38d50adbc666054d6860519e9870cbcb0b8949195e606511a99798c2ada1db2" frontend/constants.ts; then
    print_success "Contract address constant properly defined in constants.ts"
else
    print_error "Contract address constant not found or incorrect in constants.ts"
fi

# Check for any remaining placeholder addresses
PLACEHOLDER_COUNT=$(grep -r "0x123" frontend/ | grep -v node_modules | wc -l)
if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
    print_warning "Found $PLACEHOLDER_COUNT instances of placeholder address '0x123' in frontend"
    echo "These should be updated to use MODULE_ADDRESS:"
    grep -r "0x123" frontend/ | grep -v node_modules
else
    print_success "No placeholder addresses found in frontend"
fi

# Test build compatibility
print_step "Testing Production Build"

echo "Testing production build..."
if npm run build > /dev/null 2>&1; then
    print_success "Production build successful"
else
    print_error "Production build failed"
fi

print_step "Integration Testing Complete!"

echo ""
echo "=== Integration Test Summary ==="
echo "1. Contract deployment status checked"
echo "2. Frontend development server tested"
echo "3. Integration configuration validated"
echo "4. Production build tested"

echo ""
echo "=== Manual Testing Checklist ==="
echo "After deployment, test these features manually:"
echo ""
echo "□ Wallet Connection"
echo "  - Connect Aptos wallet"
echo "  - Verify account address displays correctly"
echo ""
echo "□ Game Creation"
echo "  - Click 'Create Game' button"
echo "  - Fill in team players (at least 2 per team)"
echo "  - Set game parameters"
echo "  - Submit game creation"
echo ""
echo "□ Game Interface"
echo "  - Verify game loads with mock data"
echo "  - Test drawing on canvas (if artist)"
echo "  - Test color palette and brush size"
echo "  - Test guess submission"
echo ""
echo "□ Game State"
echo "  - Verify team displays"
echo "  - Check score tracking"
echo "  - Test round timer"
echo "  - Verify status messages"
echo ""
echo "□ Contract Integration (after deployment)"
echo "  - Test actual game creation on blockchain"
echo "  - Verify canvas delta submission"
echo "  - Test guess submission"
echo "  - Check round progression"

echo ""
print_success "Ready for full end-to-end testing!"
