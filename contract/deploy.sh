#!/bin/bash

echo "=== Aptos Pictionary Contract Deployment ==="

# Check if account is funded
echo "Checking account balance..."
ACCOUNT="0xe38d50adbc666054d6860519e9870cbcb0b8949195e606511a99798c2ada1db2"
echo "Account: $ACCOUNT"

# Try to get balance - if account doesn't exist yet, it will return 0
BALANCE=$(aptos account list --account $ACCOUNT 2>/dev/null | grep -o '"balance": "[0-9]*"' | grep -o '[0-9]*' || echo "0")
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
aptos move compile --named-addresses pictionary=$ACCOUNT

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ Compilation successful"

# Run tests
echo ""
echo "Running tests..."
aptos move test --named-addresses pictionary=$ACCOUNT

if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo "✅ All tests passed"

# Deploy the contract
echo ""
echo "Deploying contract to testnet..."
aptos move deploy-object --address-name pictionary --assume-yes

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