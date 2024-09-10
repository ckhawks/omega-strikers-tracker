import styles from "../main.module.scss";
import NavigationBar from "@/components/NavigationBar";

export default async function Bans() {
  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Bans</h1>
      <ul>
        <li>Demon Dais: Finii, Mako</li>
        <li>Oni Village: Octavia</li>
        <li>Night Market: Juliette</li>
        <li>Aimi's App: Juliette</li>
      </ul>
      <p></p>
    </div>
  );
}
