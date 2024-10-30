import styles from "./main.module.scss";
import { Button } from "react-bootstrap";
import { db } from "../util/db/db";
import Link from "next/link";
import NavigationBar from "@/components/NavigationBar";

export const revalidate = 1;

export default async function Home() {
  const matches = await db(
    ` 
      SELECT * FROM "Match"
      ORDER BY "createdAt"
    `,
    []
  );

  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Match List</h1>
      <div>
        {matches &&
          matches.map((match, index) => {
            return (
              <div key={match.id} className={styles["match-item"]}>
                <span>Match {index}</span>
                <b>{match.map}</b>
                <span>
                  {match.team1Score} - {match.team2Score}
                </span>
                <span>
                  {match.duration !== 0
                    ? `${Math.floor(match.duration / 60)}:${
                        match.duration % 60
                      }`
                    : "Unknown"}
                </span>
                {match.createdAt.toString()}
                <Link href={"/match/" + match.id}>View</Link>
              </div>
            );
          })}
      </div>
    </div>
  );
}
