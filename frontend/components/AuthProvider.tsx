import { PropsWithChildren, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore, useLogin } from "@/store/auth";
import { useToast } from "@/components/ui/use-toast";

export function AuthProvider({ children }: PropsWithChildren) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const activeKeylessAccount = useAuthStore(state => state.activeAccount);
  const isInitializing = useRef(false);

  const { loginWithGoogle } = useLogin({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Successfully logged in with Google",
      });
      
      // If we're on the home page after login, stay there
      // Otherwise, redirect to home
      if (location.pathname === "/") {
        return;
      }
      navigate("/");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Login Failed", 
        description: "Failed to login with Google. Please try again.",
      });
      
      // Clear the URL fragment on error
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  });

  // Handle OAuth callback
  useEffect(() => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    // Check for Google OAuth callback
    const fragmentParams = new URLSearchParams(window.location.hash.substring(1));
    const googleIdToken = fragmentParams.get('id_token');
    
    if (googleIdToken) {
      // Clear the URL fragment immediately
      window.history.replaceState(null, "", window.location.pathname);
      
      // Process the login
      loginWithGoogle(googleIdToken).catch((error) => {
        console.error("OAuth callback error:", error);
      });
    }
  }, [loginWithGoogle]);

  return <>{children}</>;
}