import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore, useLogin } from "@/store/auth";
import { GOOGLE_CLIENT_ID } from "@/constants";

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const activeAccount = useAuthStore(state => state.activeAccount);
  const disconnectKeylessAccount = useAuthStore(state => state.disconnectKeylessAccount);
  
  const { getGoogleRequestLoginUrl } = useLogin({
    onRequest: () => setIsLoading(true),
    onSuccess: () => setIsLoading(false),
    onError: () => setIsLoading(false),
  });

  if (!GOOGLE_CLIENT_ID) {
    return (
      <Button disabled className={className}>
        Google Client ID not configured
      </Button>
    );
  }

  if (activeAccount) {
    return (
      <Button
        onClick={disconnectKeylessAccount}
        variant="outline"
        className={className}
      >
        Disconnect
      </Button>
    );
  }

  const handleLogin = () => {
    if (getGoogleRequestLoginUrl) {
      setIsLoading(true);
      window.location.href = getGoogleRequestLoginUrl;
    }
  };

  return (
    <Button 
      onClick={handleLogin}
      disabled={isLoading || !getGoogleRequestLoginUrl}
      className={className}
    >
      {isLoading ? "Connecting..." : "Sign in with Google"}
    </Button>
  );
}