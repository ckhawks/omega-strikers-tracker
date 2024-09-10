"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LogoutPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Call the logout API to clear cookies
    const logout = async () => {
      const response = await fetch("/api/logout");
      if (response.ok) {
        // Redirect to the home page after successful logout
        router.push("/");
      } else {
        console.error("Failed to log out");
      }
    };

    logout();
  }, [router]);

  return <p>Logging out...</p>;
};

export default LogoutPage;
