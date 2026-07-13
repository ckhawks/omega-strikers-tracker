import styles from "../../main.module.scss";
import { db } from "@/util/db/db";
import { isAuthed } from "@/util/auth";
import NavigationBar from "@/components/NavigationBar";
import TokensManager from "./TokensManager";

export const revalidate = 0;

export const metadata = { title: "Ingest Tokens - OS Tracker" };

export default async function TokensPage() {
  if (!isAuthed()) {
    return (
      <>
        <NavigationBar />
        <div className={styles.main}>
          <h1>Unauthorized.</h1>
          <p>Log in first.</p>
        </div>
      </>
    );
  }

  const tokens = await db(
    `SELECT id, token, label, active, "createdAt", "lastUsedAt"
     FROM "IngestToken" ORDER BY active DESC, "createdAt" DESC`,
    []
  );

  return (
    <>
      <NavigationBar />
      <div className={styles.main}>
        <h1>Ingest Tokens</h1>
        <p style={{ color: "#666", maxWidth: 640 }}>
          Each friend running the capture mod gets their own token. Add a person,
          copy the token into their mod&apos;s <code>TOKEN</code> value, and revoke
          it any time. Reports are attributed by token.
        </p>
        <TokensManager tokens={tokens} />
      </div>
    </>
  );
}
