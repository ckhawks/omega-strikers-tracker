// app/login/page.js
"use client";
import { useState } from "react";
import styles from "../main.module.scss";
import { useRouter } from "next/navigation";

const LoginPage = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      // Redirect to the protected page after login
      router.push("/");
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className={styles.main}>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />
        <button type="submit">Login</button>
        {error && <p>{error}</p>}
      </form>
    </div>
  );
};

export default LoginPage;
