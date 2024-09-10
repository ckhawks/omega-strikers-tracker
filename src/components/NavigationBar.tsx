"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import styles from "../app/main.module.scss";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function NavigationBar() {
  const pathname = usePathname(); // Get the current route

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if the client-auth cookie is present
    const isAuthenticated = document.cookie
      .split("; ")
      .find((row) => row.startsWith("client-auth="));

    if (isAuthenticated) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [pathname]);

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      <Link href={"/"} className={`${pathname === "/" ? styles.active : ""}`}>
        Matches
      </Link>
      <Link
        href={"/players"}
        className={`${pathname === "/players" ? styles.active : ""}`}
      >
        Players
      </Link>
      {isAuthenticated && (
        <Link
          href={"/create"}
          className={`${pathname === "/create" ? styles.active : ""}`}
        >
          Add match
        </Link>
      )}
      {!isAuthenticated && (
        <Link
          href={"/login"}
          className={`${pathname === "/login" ? styles.active : ""}`}
        >
          Login
        </Link>
      )}
    </div>
  );
}
