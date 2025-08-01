import { Buffer } from "buffer";

// Make Buffer available globally for libraries that expect it
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof globalThis !== "undefined") {
  (globalThis as any).Buffer = Buffer;
} else if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
} else if (typeof global !== "undefined") {
  (global as any).Buffer = Buffer;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
