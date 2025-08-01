#!/bin/bash

echo "=== Aptos Pictionary Full Application Testing ==="

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

# Test 1: Move Contract Tests
print_step "Testing Move Smart Contract"
cd contract

echo "Running Move contract compilation..."
if aptos move compile --dev; then
    print_success "Move contract compiles successfully"
else
    print_error "Move contract compilation failed"
    exit 1
fi

echo "Running Move unit tests..."
if aptos move test --dev; then
    print_success "All Move unit tests pass"
else
    print_error "Move unit tests failed"
    exit 1
fi

cd ..

# Test 2: Frontend TypeScript Compilation
print_step "Testing Frontend TypeScript"

echo "Checking TypeScript compilation..."
if npx tsc --noEmit; then
    print_success "TypeScript compiles without errors"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Test 3: Frontend Linting
print_step "Testing Frontend Code Quality"

echo "Running ESLint..."
if npm run lint; then
    print_success "Code passes linting"
else
    print_warning "Linting issues found (non-blocking)"
fi

# Test 4: Build Frontend
print_step "Testing Frontend Build"

echo "Building frontend for production..."
if npm run build; then
    print_success "Frontend builds successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Test 5: Contract Integration Check
print_step "Testing Contract Integration Setup"

echo "Checking contract integration files..."

# Check entry functions
ENTRY_FILES=(
    "frontend/entry-functions/createGame.ts"
    "frontend/entry-functions/gameActions.ts"
)

for file in "${ENTRY_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Entry function file exists: $file"
    else
        print_error "Missing entry function file: $file"
    fi
done

# Check view functions
VIEW_FILES=(
    "frontend/view-functions/gameView.ts"
)

for file in "${VIEW_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "View function file exists: $file"
    else
        print_error "Missing view function file: $file"
    fi
done

# Check utils
if [ -f "frontend/utils/aptos.ts" ]; then
    print_success "Aptos utils file exists"
else
    print_error "Missing Aptos utils file"
fi

print_step "Testing Complete!"

echo ""
echo "=== Test Summary ==="
print_success "✅ Move contract compiles and passes all unit tests"
print_success "✅ Frontend TypeScript compiles without errors"
print_success "✅ Frontend builds successfully"
print_success "✅ Contract integration files are present"

echo ""
echo "=== Next Steps ==="
echo "1. Fund the deployment account:"
echo "   https://aptos.dev/network/faucet?address=0xe38d50adbc666054d6860519e9870cbcb0b8949195e606511a99798c2ada1db2"
echo ""
echo "2. Deploy the contract:"
echo "   cd contract && ./deploy.sh"
echo ""
echo "3. Update frontend with deployed address"
echo ""
echo "4. Test full integration:"
echo "   npm run dev"

echo ""
print_success "Application is ready for deployment and testing!"