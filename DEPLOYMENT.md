# Aptos Pictionary Deployment Guide

This guide walks you through deploying and testing the complete Aptos Pictionary application.

## 🚀 Quick Deploy

### 1. Fund the Deployment Account
The deployment account has been created: `0xe38d50adbc666054d6860519e9870cbcb0b8949195e606511a99798c2ada1db2`

**Visit the testnet faucet to fund it:**
```
https://aptos.dev/network/faucet?address=0xe38d50adbc666054d6860519e9870cbcb0b8949195e606511a99798c2ada1db2
```

### 2. Deploy the Contract
```bash
cd contract
./deploy.sh
```

### 3. Frontend Configuration ✅ COMPLETED
The frontend has been updated to use the contract address:
- ✅ Added `PICTIONARY_MODULE_ADDRESS` constant in `frontend/constants.ts`
- ✅ Updated all contract integration files to use the constant
- ✅ All placeholder addresses replaced with actual contract address

### 4. Start the Frontend
```bash
npm run dev
```

Visit `http://localhost:5173` to test the application.

## 🧪 Testing Strategy

### Automated Testing
Run the complete test suite:
```bash
./test-app.sh          # Pre-deployment testing
./test-integration.sh  # Post-deployment testing
```

### Manual Testing Checklist

#### ✅ Pre-Deployment Tests
- [x] Move contract compiles
- [x] All 8 unit tests pass
- [x] Frontend TypeScript compiles
- [x] Frontend builds successfully
- [x] Contract integration files present

#### 🔄 Post-Deployment Tests
- [ ] Contract deployed successfully (ready to deploy)
- ✅ Frontend connects to wallet
- ✅ Game creation modal works  
- ✅ Canvas drawing functionality
- [ ] Contract functions execute (pending deployment)
- [ ] Events are emitted properly (pending deployment)

## 📁 Project Structure

```
aptos-pictionary/
├── contract/                   # Move smart contract
│   ├── sources/pictionary.move # Main contract
│   ├── tests/                  # Unit tests (8 tests)
│   ├── deploy.sh              # Deployment script
│   └── Move.toml              # Project config
├── frontend/                   # React frontend
│   ├── components/            # UI components
│   ├── entry-functions/       # Contract write operations
│   ├── view-functions/        # Contract read operations
│   └── utils/                # Helpers
├── test-app.sh               # Full app testing
├── test-integration.sh       # Integration testing
└── DEPLOYMENT.md            # This guide
```

## 🎮 Game Features

### Smart Contract Features
- ✅ Team-based gameplay (2+ players per team)
- ✅ Canvas system with efficient delta updates
- ✅ 14-color drawing palette
- ✅ Round timer enforcement (30s default)
- ✅ Scoring system (2 points first, 1 point second)
- ✅ Word selection with on-chain randomness
- ✅ Complete event system for indexing

### Frontend Features
- ✅ Wallet connection (Aptos official adapters)
- ✅ Game creation with team setup
- ✅ Real-time drawing canvas
- ✅ Color palette and brush tools
- ✅ Game status and timer display
- ✅ Team scoreboard
- ✅ Guess submission interface

## 🔧 Configuration

### Default Game Parameters
- **Canvas Size**: 500x500 pixels
- **Round Duration**: 30 seconds
- **Target Score**: 11 points
- **Canvas Update Frequency**: 1 second
- **Color Palette**: 14 colors

### Network Configuration
- **Network**: Aptos Testnet
- **Account**: `0xe38d50adbc666054d6860519e9870cbcb0b8949195e606511a99798c2ada1db2`
- **Faucet**: https://aptos.dev/network/faucet
- **API Key**: Configured with Aptos Build (5M requests/5min rate limit)
- **Organization**: `aptos-pictionary` (ID: `cmdsptu8n008os6016rwdb6x9`)
- **Project**: `pictionary-game` (ID: `cmdsptyrp008qs601nj0meu5n`)

## 🛠️ Development

### Adding New Features
1. Update Move contract in `contract/sources/pictionary.move`
2. Add corresponding tests in `contract/tests/pictionary_tests.move`
3. Update frontend integration files in `frontend/entry-functions/` and `frontend/view-functions/`
4. Add UI components in `frontend/components/`
5. Run test suite: `./test-app.sh`

### Debugging
- **Contract Issues**: Check `aptos move test --dev` output
- **Frontend Issues**: Check browser console and `npx tsc --noEmit`
- **Integration Issues**: Verify `MODULE_ADDRESS` is updated correctly

## 🎯 Next Steps

After successful deployment, consider implementing:

1. **No-Code Indexing**: Set up event indexing for games list and guess feed
2. **NFT Collection**: Post-game NFT minting with art collages
3. **Advanced Features**: 
   - Player management mid-game
   - Team shuffling
   - Custom word lists
   - Spectator mode
4. **Production Deployment**: Deploy to mainnet with proper API keys

## 📞 Troubleshooting

### Common Issues

**Contract won't deploy**
- Ensure account is funded via faucet
- Check `aptos move compile --dev` passes
- Verify all tests pass with `aptos move test --dev`

**Frontend won't start**
- Run `npm install` to ensure dependencies
- Check `npx tsc --noEmit` for TypeScript errors
- Verify all contract integration files exist

**Wallet won't connect**
- Ensure you have an Aptos wallet installed
- Try refreshing the page
- Check browser console for errors

**Canvas drawing doesn't work**
- Verify you're the current artist
- Check that the game has started
- Ensure proper team assignment

---

🎉 **Ready to deploy your Aptos Pictionary game!**