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
  }, []);

  return (
    <div>
      <h4>Omega Strikers Tracker</h4>
      <div style={{ display: "flex", gap: "1rem" }}>
        <Link
          href={"/"}
          className={`${styles.navItem} ${
            pathname === "/" ? styles.active : ""
          }`}
        >
          Matches
        </Link>
        <Link
          href={"/players"}
          className={`${styles.navItem} ${
            pathname === "/players" ? styles.active : ""
          }`}
        >
          Players
        </Link>
        <Link
          href={"/bans"}
          className={`${styles.navItem} ${
            pathname === "/bans" ? styles.active : ""
          }`}
        >
          Bans
        </Link>
        <Link
          href={"/strikers"}
          className={`${styles.navItem} ${
            pathname === "/strikers" ? styles.active : ""
          }`}
        >
          Strikers
        </Link>
        <Link
          href={"/global"}
          className={`${styles.navItem} ${
            pathname === "/global" ? styles.active : ""
          }`}
        >
          Global
        </Link>
        <Link
          href={"/comps"}
          className={`${styles.navItem} ${
            pathname === "/comps" ? styles.active : ""
          }`}
        >
          Comps
        </Link>
        {isAuthenticated && (
          <Link
            href={"/create"}
            className={`${styles.navItem} ${
              pathname === "/create" ? styles.active : ""
            }`}
          >
            Add match
          </Link>
        )}
        {isAuthenticated && (
          <Link
            href={"/matchtime"}
            className={`${styles.navItem} ${
              pathname === "/matchtime" ? styles.active : ""
            }`}
          >
            Insert match time
          </Link>
        )}
        {!isAuthenticated && (
          <Link
            href={"/login"}
            className={`${styles.navItem} ${
              pathname === "/login" ? styles.active : ""
            }`}
          >
            Login
          </Link>
        )}
        {isAuthenticated && (
          <Link href={"/logout"} className={`${styles.navItem} `}>
            Logout
          </Link>
        )}
      </div>
    </div>
  );
}
