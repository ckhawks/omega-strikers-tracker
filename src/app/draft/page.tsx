import styles from "../main.module.scss";
import NavigationBar from "@/components/NavigationBar";
import DraftTool from "./DraftTool";
import { db } from "@/util/db/db";

export const revalidate = 1;

export const metadata = {
  title: "Draft Tool - OS Tracker",
};

export default async function DraftToolPage() {
  const players = await db(`SELECT * FROM "Player"`, []);

  return (
    <>
      <NavigationBar />
      <div className={styles.main}>
        <h1>Draft Assistant</h1>
        <DraftTool players={players} />
      </div>
    </>
  );
}
