import { PropsWithChildren } from "react";

/**
 * AuthProvider component that wraps the app and provides authentication context
 * OAuth callback handling is now done in the dedicated GoogleCallback component
 */
export function AuthProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}