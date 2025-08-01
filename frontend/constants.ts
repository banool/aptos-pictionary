// The Aptos network the dapp is using
export const NETWORK = import.meta.env.VITE_APP_NETWORK ?? "testnet";
// The address of the published module
export const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS;
// The API key for the Aptos API (from Aptos Build)
export const APTOS_API_KEY = import.meta.env.VITE_APTOS_API_KEY ?? "AG-JSPD2XGUVKASR9VYPD16BUXOYBFXY4JKS";

// Aptos Pictionary Contract Address (Deployed on Testnet)
export const PICTIONARY_MODULE_ADDRESS = "0xe38d50adbc666054d6860519e9870cbcb0b8949195e606511a99798c2ada1db2";

// Aptos Build Organization & Project IDs for reference
export const APTOS_BUILD_ORG_ID = "cmdsptu8n008os6016rwdb6x9";
export const APTOS_BUILD_PROJECT_ID = "cmdsptyrp008qs601nj0meu5n";
