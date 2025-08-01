import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Initialize Aptos client for testnet with API key from Aptos Build
const aptosConfig = new AptosConfig({
  network: Network.TESTNET,
  clientConfig: {
    API_KEY: import.meta.env.VITE_APTOS_API_KEY || "AG-JSPD2XGUVKASR9VYPD16BUXOYBFXY4JKS",
  },
});

export const aptos = new Aptos(aptosConfig);

// Helper function to get the network
export const getNetwork = () => Network.TESTNET;

// Color enum mapping for the contract
export const COLORS = [
  { name: "Black", value: 0, hex: "#000000" },
  { name: "White", value: 1, hex: "#FFFFFF" },
  { name: "Red", value: 2, hex: "#FF0000" },
  { name: "Green", value: 3, hex: "#00FF00" },
  { name: "Blue", value: 4, hex: "#0000FF" },
  { name: "Yellow", value: 5, hex: "#FFFF00" },
  { name: "Orange", value: 6, hex: "#FFA500" },
  { name: "Purple", value: 7, hex: "#800080" },
  { name: "Pink", value: 8, hex: "#FFC0CB" },
  { name: "Brown", value: 9, hex: "#A52A2A" },
  { name: "Gray", value: 10, hex: "#808080" },
  { name: "Light Blue", value: 11, hex: "#ADD8E6" },
  { name: "Light Green", value: 12, hex: "#90EE90" },
  { name: "Light Red", value: 13, hex: "#FFB6C1" },
] as const;

export const getColorHex = (colorIndex: number): string => {
  return COLORS[colorIndex]?.hex || COLORS[0].hex;
};
