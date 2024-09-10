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
    `,
    []
  );

  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Match List</h1>
      {matches &&
        matches.map((match, index) => {
          return (
            <div key={match.id}>
              Match {index} on {match.map} at {match.createdAt.toString()}
              <Link href={"/match/" + match.id}>View</Link>
            </div>
          );
        })}
    </div>
  );
}
