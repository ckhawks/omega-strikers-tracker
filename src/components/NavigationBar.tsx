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
    <div className={styles.navbar}>
      <div>
        <h4>Omega Strikers Tracker</h4>
        <div
          className={styles.navRow}
          style={{ display: "flex", gap: "0.5rem" }}
        >
          <div className={styles.navGroup}>
            <Link
              href={"/"}
              className={`${styles.navItem} ${
                pathname === "/" ? styles.active : ""
              }`}
            >
              Matches
            </Link>
            <Link
              href={"/search"}
              className={`${styles.navItem} ${
                pathname === "/search" ? styles.active : ""
              }`}
            >
              Search
            </Link>
          </div>
          <Link
            href={"/players"}
            className={`${styles.navItem} ${
              pathname === "/players" ? styles.active : ""
            }`}
          >
            Players
          </Link>
          <div className={styles.navGroup}>
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
              href={"/bans"}
              className={`${styles.navItem} ${
                pathname === "/bans" ? styles.active : ""
              }`}
            >
              Bans
            </Link>

            <Link
              href={"/comps"}
              className={`${styles.navItem} ${
                pathname === "/comps" ? styles.active : ""
              }`}
            >
              Solo, Duo, Trio Comps
            </Link>

            <Link
              href={"/blu"}
              className={`${styles.navItem} ${
                pathname === "/blu" ? styles.active : ""
              }`}
            >
              Blu's Knowledge
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "8px" }}>
          {isAuthenticated && (
            <Link
              href={"/create"}
              className={`${styles.navItem} ${
                pathname === "/create" ? styles.active : ""
              }`}
            >
              Add Match
            </Link>
          )}
          {/* {isAuthenticated && (
          <Link
            href={"/matchtime"}
            className={`${styles.navItem} ${
              pathname === "/matchtime" ? styles.active : ""
            }`}
          >
            Insert match time
          </Link>
        )} */}

          <Link
            href={"/predict"}
            className={`${styles.navItem} ${
              pathname === "/predict" ? styles.active : ""
            }`}
          >
            Win Rate Calculator<span className={styles.navBeta}>Beta</span>
          </Link>
          <Link
            href={"/draft"}
            className={`${styles.navItem} ${
              pathname === "/draft" ? styles.active : ""
            }`}
          >
            Draft Assistant<span className={styles.navBeta}>Beta</span>
          </Link>
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
      <div style={{ marginLeft: "2rem" }}>
        <img src={"core.png"} width={"100%"} />
      </div>
    </div>
  );
}
