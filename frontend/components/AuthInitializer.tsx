import { useEffect, useRef, PropsWithChildren } from "react";
import { useAuthStore, useAuthReady } from "@/store/auth";
import { AptBalanceChecker } from "@/components/AptBalanceChecker";
import { useToast } from "@/components/ui/use-toast";

/**
 * AuthInitializer handles restoring the user's authentication state on app load
 * Similar to the confidential payments example's dashboard layout
 */
export function AuthInitializer({ children }: PropsWithChildren) {
  const { isReady, hasHydrated, activeAccount, accounts } = useAuthReady();
  const switchKeylessAccount = useAuthStore(state => state.switchKeylessAccount);
  const clear = useAuthStore(state => state.clear);
  const { toast } = useToast();
  const isInitializing = useRef(false);

  useEffect(() => {
    // Don't initialize until store has hydrated
    if (!hasHydrated || isInitializing.current) return;

    // If we already have an active account, no need to restore
    if (activeAccount) return;

    // If we have stored accounts but no active account, restore the first one
    if (accounts.length > 0) {
      isInitializing.current = true;
      
      switchKeylessAccount(accounts[0].idToken.raw)
        .then(() => {
          console.log('Account restored successfully');
        })
        .catch((error) => {
          console.error('Failed to restore account:', error);
          
          // Check the type of error
          const errorMessage = error?.message || error?.toString() || '';
          
          // Check for storage corruption errors (JSON parsing issues)
          const isStorageCorruption = errorMessage.includes('SyntaxError') || 
                                    errorMessage.includes('Unexpected token') ||
                                    errorMessage.includes('not valid JSON') ||
                                    errorMessage.includes('Per keyles');
          
          // Check for expired token errors
          const isExpiredToken = errorMessage.includes('has expired') || 
                                errorMessage.includes('expired') ||
                                errorMessage.includes('Invalid idToken') || 
                                errorMessage.includes('could not decode');
          
          // Check for service errors
          const isServiceError = errorMessage.includes('temporarily overloaded') ||
                                errorMessage.includes('currently unavailable') ||
                                errorMessage.includes('service is temporarily') ||
                                errorMessage.includes('try again later') ||
                                errorMessage.includes('try again in 5-10 minutes') ||
                                errorMessage.includes('contact support if this persists');
          
          if (isStorageCorruption) {
            // Storage corruption - clear everything and show informative message
            console.warn('Storage corruption detected, clearing all auth data');
            clear();
            
            toast({
              variant: "destructive",
              title: "Storage Corruption",
              description: "Your session data was corrupted. Please sign in again.",
            });
          } else if (isExpiredToken) {
            // Token expiration - clear and show expiration message
            clear();
            
            toast({
              variant: "destructive",
              title: "Session Expired",
              description: "Your session has expired. Please sign in again to continue.",
            });
          } else if (isServiceError) {
            // Service errors - don't clear accounts, just show service error message
            console.warn('Keyless service error, keeping stored accounts:', error);
            
            toast({
              variant: "destructive",
              title: "Service Temporarily Overloaded",
              description: "The Aptos keyless authentication service is experiencing high load. Please wait 5-10 minutes and try again.",
            });
          } else {
            // Other errors (network, temporary issues) - don't clear accounts
            console.warn('Temporary authentication error, keeping stored accounts:', error);
            
            toast({
              title: "Connection Issue",
              description: "Could not restore your session. You may need to refresh the page.",
            });
          }
        })
        .finally(() => {
          isInitializing.current = false;
        });
    }
  }, [hasHydrated, activeAccount, accounts, switchKeylessAccount, clear, toast]);

  // Show loading until auth is ready
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <AptBalanceChecker />
    </>
  );
}