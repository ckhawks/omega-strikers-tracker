"use server";

import styles from "../main.module.scss";
import { Button } from "react-bootstrap";
import Link from "next/link";
import NavigationBar from "@/components/NavigationBar";
import { db } from "@/util/db/db";

export default async function PlayersList() {
  const players = await db(
    ` 
      SELECT * FROM "Player"
      WHERE "deletedAt" IS NULL
    `,
    []
  );

  // console.log(players);

  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Player List</h1>
      {players &&
        players.map((player, index) => {
          return (
            <div key={player.id}>
              Player {player.name}{" "}
              <Link href={"/player/" + player.id}>View</Link>
            </div>
          );
        })}
    </div>
  );
}
