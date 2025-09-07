"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh(); // Refresh to update the auth state
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={logout}
      variant="outline"
      size="sm"
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      <LogOut className="w-4 h-4" />
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
