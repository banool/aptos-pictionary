// The Aptos network the dapp is using
export const NETWORK = import.meta.env.VITE_APP_NETWORK ?? "testnet";
// The address of the published module
export const MODULE_ADDRESS =
  import.meta.env.VITE_MODULE_ADDRESS ?? "0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1";
// The API key for the Aptos API (from Aptos Build)
export const APTOS_API_KEY = import.meta.env.VITE_APTOS_API_KEY ?? "AG-JSPD2XGUVKASR9VYPD16BUXOYBFXY4JKS";

// Google OAuth configuration for keyless accounts
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "923528765222-7chn2ivueemv5mi3e443rb0auvfkrfau.apps.googleusercontent.com";

// Aptos Build Organization & Project IDs for reference
export const APTOS_BUILD_ORG_ID = "cmdsptu8n008os6016rwdb6x9";
export const APTOS_BUILD_PROJECT_ID = "cmdsptyrp008qs601nj0meu5n";
