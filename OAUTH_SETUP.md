# OAuth Setup Guide for Aptos Pictionary

This guide explains how to set up Google OAuth for the Aptos Pictionary dapp following the [Aptos Keyless OIDC Support](https://aptos.dev/build/guides/aptos-keyless/oidc-support) documentation.

## ✅ What's Already Implemented

The dapp now includes:

- **✅ OAuth Callback Route**: `/auth/google/callback` 
- **✅ Proper Redirect URI**: `${window.location.origin}/auth/google/callback`
- **✅ Callback Handler**: `GoogleCallback.tsx` component
- **✅ Authentication Flow**: Complete Google OAuth integration

## 🔧 Google OAuth Setup Required

To complete the setup, you need to register your dapp with Google:

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select existing one

### Step 2: Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required details:
   - Application name: "Aptos Pictionary"
   - User support email: your email
   - Developer contact information: your email

### Step 3: Create OAuth Client ID

1. Go to "APIs & Services" > "Credentials"  
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Configure authorized redirect URIs:
   - For development: `http://localhost:5173/auth/google/callback`
   - For production: `https://yourdomain.com/auth/google/callback`

### Step 4: Configure Environment Variables

Add your Google Client ID to your environment:

**For Development (.env.local):**
```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

**For Production:**
Set the `VITE_GOOGLE_CLIENT_ID` environment variable in your deployment platform.

## 🚀 How It Works

1. **User clicks "Sign in with Google"** → Redirects to Google OAuth
2. **Google authenticates user** → Redirects to `/auth/google/callback` with id_token
3. **GoogleCallback component** → Processes the token and creates keyless account
4. **APT Balance Check** → Automatically checks if user has testnet APT for transactions
5. **Faucet Prompt** → If balance is low (<0.01 APT), prompts user to visit Aptos faucet
6. **User redirected to home** → Ready to create/join games with sufficient APT!

## 🔍 Testing the Setup

1. Start the development server: `npm run dev`
2. Click "Sign in with Google" 
3. Complete Google OAuth flow
4. Should be redirected back to the app and signed in

## 💰 APT Balance Management

The app automatically manages testnet APT for transaction fees:

**Automatic Balance Check:**
- Checks APT balance after successful login
- Shows modal prompt if balance is below 0.01 APT
- Provides direct link to Aptos faucet with user's address

**Header Balance Display:**
- Shows current APT balance in the header
- Refresh button to manually update balance
- "Get APT" button when balance is low
- Balance turns amber when below minimum threshold

**Smart Prompting:**
- Only prompts once per session to avoid annoyance
- Explains why APT is needed (transaction fees)
- Shows current balance and helpful tips

## 📋 Security Notes

- ✅ Uses OpenID Connect implicit flow (`response_type: 'id_token'`)
- ✅ Includes nonce for security (ephemeral key pair nonce)
- ✅ Tokens are processed client-side for keyless account derivation  
- ✅ No client secret needed (public OAuth client)

## 🛠️ Troubleshooting

**"GOOGLE_CLIENT_ID not configured"**
- Make sure `VITE_GOOGLE_CLIENT_ID` is set in your environment

**"Redirect URI mismatch"**  
- Ensure the redirect URI in Google Console matches exactly: `your-domain/auth/google/callback`

**"Completing sign in" shows forever / Maximum call stack size exceeded"**
- ✅ Fixed: Implemented proper BCS serialization for SDK objects using `bcsToBytes()` and `fromBytes()`
- ✅ Fixed: Added proper `useEphemeralKeyPair` hook following confidential payments example pattern  
- ✅ Fixed: Ephemeral key pairs are now properly persisted and retrieved across OAuth flow

**"Sign in works but doesn't remember login after refresh"**
- ✅ Fixed: Added proper store hydration with `merge` and `partialize` functions
- ✅ Fixed: Account validation during persistence to ensure only valid accounts are stored
- ✅ Fixed: `AuthInitializer` component handles account restoration on app load
- ✅ Fixed: `useAuthReady` hook ensures app waits for store hydration before showing login UI

**"Login fails silently"**
- Check browser console for errors
- Verify the Google Client ID is correct
- Ensure the domain is authorized in Google Console

**"SyntaxError: Unexpected token 'P', "Per keyles"... is not valid JSON"**
- ⚠️ Known Issue: Aptos testnet keyless service overload
- The service returns HTML/plain text instead of JSON during high load
- **Solutions:**
  1. Wait 5-10 minutes and try again
  2. Open browser console and run `clearAuthStorage()` then refresh
  3. Run `handleServiceOverload()` in console for debug info
- The app will automatically fall back to stored credentials when possible
- Your account data is preserved during service outages

## 🚀 Performance Optimizations

**Keyless Service API Reduction:**
- ✅ First login: Hits keyless prover service (required)
- ✅ Subsequent logins: Reuses stored KeylessAccount with proof (NO API calls)
- ✅ Smart fallback: Uses stored pepper when service is unavailable
- ✅ Debug tools: Run `debugAuthState()` in console to see current state

**Console Debug Commands:**
```javascript
// Check current authentication state
debugAuthState()

// Clear corrupted storage
clearAuthStorage()

// Service overload help
handleServiceOverload()
```