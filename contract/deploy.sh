#!/bin/bash

echo "=== Aptos Pictionary Contract Deployment ==="

# Check if account is funded
echo "Checking account balance..."
ACCOUNT="0xb30fbc1c6be05c14a607a2ba45fe91ab70feb34ad8d1c65a72a918384bb545cd"
echo "Account: $ACCOUNT"

# Try to get balance - if account doesn't exist yet, it will return 0
BALANCE=$(aptos account balance --account $ACCOUNT 2>/dev/null | jq -r .Result[0].balance)
if [ -z "$BALANCE" ]; then
    BALANCE="0"
fi
echo "Balance: $BALANCE APT"

if [ "$BALANCE" -eq "0" ]; then
    echo ""
    echo "⚠️  Account needs funding!"
    echo "Please visit: https://aptos.dev/network/faucet?address=$ACCOUNT"
    echo "After funding, run this script again."
    exit 1
fi

echo "✅ Account has sufficient balance for deployment"

# Compile the contract
echo ""
echo "Compiling contract..."
aptos move compile --named-addresses pictionary=default

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ Compilation successful"

# Run tests
echo ""
echo "Running tests..."
aptos move test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo "✅ All tests passed"

# Deploy the contract
echo ""
echo "Deploying contract to testnet..."
aptos move publish --named-addresses pictionary=default --assume-yes

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "🎉 Contract deployed successfully!"
echo "Account: $ACCOUNT"
echo ""
echo "Next steps:"
echo "1. Copy the deployed address and update frontend/utils/aptos.ts"
echo "2. Update MODULE_ADDRESS in all frontend contract integration files"
echo "3. Test the frontend integration"
