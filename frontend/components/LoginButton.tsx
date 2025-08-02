import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore, useLogin } from "@/store/auth";
import { UserMenu } from "@/components/UserMenu";
import { GOOGLE_CLIENT_ID } from "@/constants";

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const activeAccount = useAuthStore(state => state.activeAccount);
  
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

  // Show user menu when logged in
  if (activeAccount) {
    return <UserMenu className={className} />;
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