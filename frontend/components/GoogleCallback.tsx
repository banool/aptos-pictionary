import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/store/auth";
import { useToast } from "@/components/ui/use-toast";

/**
 * Google OAuth callback handler component
 * Handles the OAuth callback from Google following the confidential payments example pattern
 */
export function GoogleCallback() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isInitializing = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  const { loginWithGoogle } = useLogin({
    onSuccess: () => {
      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google",
      });
      navigate("/", { replace: true });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: "Failed to sign in with Google. Please try again.",
      });
      navigate("/", { replace: true });
    },
  });

  useEffect(() => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    // Parse fragment params like the confidential payments example
    const fragmentParams = new URLSearchParams(window.location.hash.substring(1));
    const googleIdToken = fragmentParams.get('id_token');

    if (!googleIdToken) {
      // No token found, redirect back to home
      navigate("/", { replace: true });
      return;
    }

    const loginWithSocial = async () => {
      setIsLoading(true);
      
      try {
        await loginWithGoogle(googleIdToken);
        // Success and error handling are done in the callbacks above
      } catch (error) {
        console.error("OAuth callback error:", error);
        // Error toast and navigation are handled by the onError callback
      } finally {
        setIsLoading(false);
      }
    };

    loginWithSocial();
  }, [loginWithGoogle, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">
          {isLoading ? "Completing sign in..." : "Processing..."}
        </p>
      </div>
    </div>
  );
}