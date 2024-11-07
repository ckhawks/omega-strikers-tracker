import styles from "../main.module.scss";
import NavigationBar from "@/components/NavigationBar";
import DraftTool from "./DraftTool";
import { db } from "@/util/db/db";

export const revalidate = 1;

export default async function DraftToolPage() {
  const players = await db(`SELECT * FROM "Player"`, []);

  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Draft Assistant</h1>
      <DraftTool players={players} />
    </div>
  );
}
